import { createHmac, randomUUID } from "node:crypto";
import type { Database } from "@gold-bet-clean-money365/db";
import { type ClientSession, ObjectId } from "mongodb";
import {
	type AccountIdentity,
	canManage,
	childOwnership,
	normalizePhone,
} from "./access";
import { ManagementError } from "./errors";
import type { CreateAccountInput } from "./management";
import {
	type Currency,
	currencies,
	currencyOf,
	MAX_WALLET_MILLIMES,
	parseAmount,
} from "./money";
import { NotificationService } from "./notifications";
import { activeAccount, findAccount, userCollection } from "./storage";

type WalletDocument = {
	currency?: Currency;
	_id: string;
	balanceMillimes: number;
	updatedAt: Date;
};
type TransferDocument = {
	currency?: Currency;
	_id: string;
	fingerprint: string;
	kind:
		| "account.create"
		| "wallet.transfer"
		| "bet.stake"
		| "bet.payout"
		| "casino.stake"
		| "casino.payout";
	actorId: string;
	sourceId: string | null;
	targetId: string;
	sourceName: string;
	targetName: string;
	amountMillimes: number;
	sourceBalanceAfter: number | null;
	targetBalanceAfter: number;
	createdAt: Date;
};

export class WalletService {
	constructor(
		private readonly db: Database,
		private readonly secret: string,
	) {}
	private wallets() {
		return this.db.collection<WalletDocument>("wallet");
	}
	private transfers() {
		return this.db.collection<TransferDocument>("walletTransfer");
	}

	private amount(value: string, allowZero = false) {
		try {
			const amount = parseAmount(value);
			if (!allowZero && amount === 0)
				throw new Error("Enter an amount greater than zero.");
			return amount;
		} catch (error) {
			throw new ManagementError(
				"BAD_REQUEST",
				error instanceof Error ? error.message : "Invalid amount.",
			);
		}
	}

	private async transaction<T>(work: (session: ClientSession) => Promise<T>) {
		const session = this.db.client.startSession();
		try {
			return await session.withTransaction(() => work(session), {
				readConcern: { level: "snapshot" },
				writeConcern: { w: "majority" },
				readPreference: "primary",
				maxCommitTimeMS: 10_000,
			});
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"code" in error &&
				error.code === 20
			) {
				throw new ManagementError(
					"SERVICE_UNAVAILABLE",
					"Wallets require a MongoDB replica set. No balance or account was changed.",
				);
			}
			throw error;
		} finally {
			await session.endSession();
		}
	}

	private fingerprint(value: unknown) {
		return createHmac("sha256", this.secret)
			.update(JSON.stringify(value))
			.digest("hex");
	}

	private async receipt(
		actorId: string,
		requestId: string,
		fingerprint: string,
		session: ClientSession,
	) {
		const receipt = await this.transfers().findOne(
			{ _id: `${actorId}:${requestId}` },
			{ session },
		);
		if (receipt && receipt.fingerprint !== fingerprint)
			throw new ManagementError(
				"CONFLICT",
				"This request was already used for a different operation.",
			);
		return receipt;
	}

	private async active(id: string, session?: ClientSession) {
		const account = await activeAccount(this.db, id, session);
		if (!account)
			throw new ManagementError(
				"FORBIDDEN",
				"Account or its parent is unavailable.",
			);
		return account;
	}

	/** Writes conflict with concurrent suspensions, forcing a fresh authorization check. */
	private async lockAccounts(
		accounts: AccountIdentity[],
		session: ClientSession,
	) {
		const ids = new Set(
			accounts
				.flatMap((account) => [
					account.id,
					account.fournisseurId,
					account.clientId,
				])
				.filter((id): id is string => Boolean(id)),
		);
		for (const id of [...ids].sort()) {
			const result = await userCollection(this.db).updateOne(
				{ _id: new ObjectId(id), banned: { $ne: true } },
				{ $inc: { walletGuard: 1 } },
				{ session },
			);
			if (result.matchedCount !== 1)
				throw new ManagementError("FORBIDDEN", "Account is unavailable.");
		}
	}

	private async move(
		actor: AccountIdentity,
		target: AccountIdentity & { name: string },
		amount: number,
		session: ClientSession,
	) {
		let sourceId: string | null = null;
		let sourceName = "Admin allocation";
		let sourceBalanceAfter: number | null = null;
		if (target.role === "fournisseur") {
			if (actor.role !== "admin")
				throw new ManagementError(
					"FORBIDDEN",
					"Only admin can allocate funds to a fournisseur.",
				);
		} else {
			if (!target.parentId)
				throw new ManagementError("FORBIDDEN", "Funding parent is missing.");
			const parent = await this.active(target.parentId, session);
			if (currencyOf(parent.currency) !== currencyOf(target.currency))
				throw new ManagementError(
					"BAD_REQUEST",
					"Wallet currencies must match.",
				);
			if (parent.role !== (target.role === "client" ? "fournisseur" : "client"))
				throw new ManagementError("FORBIDDEN", "Invalid funding hierarchy.");
			const document = await findAccount(this.db, parent.id, session);
			sourceId = parent.id;
			sourceName = document?.name ?? "Parent wallet";
			await this.lockAccounts([parent], session);
			if (amount > 0) {
				const source = await this.wallets().findOneAndUpdate(
					{ _id: sourceId, balanceMillimes: { $gte: amount } },
					{
						$inc: { balanceMillimes: -amount },
						$set: { updatedAt: new Date() },
					},
					{ session, returnDocument: "after" },
				);
				if (!source)
					throw new ManagementError(
						"BAD_REQUEST",
						"Insufficient funds in the parent wallet.",
					);
				sourceBalanceAfter = source.balanceMillimes;
			} else
				sourceBalanceAfter =
					(await this.wallets().findOne({ _id: sourceId }, { session }))
						?.balanceMillimes ?? 0;
		}
		await this.wallets().updateOne(
			{ _id: target.id },
			{
				$setOnInsert: {
					balanceMillimes: 0,
					currency: currencyOf(target.currency),
					updatedAt: new Date(),
				},
			},
			{ session, upsert: true },
		);
		const credited = await this.wallets().findOneAndUpdate(
			{
				_id: target.id,
				balanceMillimes: { $lte: MAX_WALLET_MILLIMES - amount },
			},
			{ $inc: { balanceMillimes: amount }, $set: { updatedAt: new Date() } },
			{ session, returnDocument: "after" },
		);
		if (!credited)
			throw new ManagementError(
				"BAD_REQUEST",
				"This transfer would exceed the wallet balance limit.",
			);
		return {
			sourceId,
			sourceName,
			sourceBalanceAfter,
			targetBalanceAfter: credited.balanceMillimes,
		};
	}

	async create(
		actorId: string,
		input: CreateAccountInput,
		passwordHash: string,
	) {
		const amountMillimes = this.amount(input.initialAmount ?? "0", true);
		const phoneNumber = normalizePhone(input.phoneNumber);
		const requestId = input.requestId ?? randomUUID();
		if (input.currency !== undefined && !currencies.includes(input.currency))
			throw new ManagementError("BAD_REQUEST", "Unsupported currency.");
		const fingerprint = this.fingerprint({
			kind: "account.create",
			name: input.name,
			phoneNumber,
			password: input.password,
			role: input.role,
			parentId: input.parentId,
			...(input.currency ? { currency: input.currency } : {}),
			amountMillimes,
		});
		const id = new ObjectId();
		return this.transaction(async (session) => {
			const actor = await this.active(actorId, session);
			const parent = await this.active(input.parentId, session);
			const currency =
				input.role === "fournisseur"
					? currencyOf(input.currency)
					: currencyOf(parent.currency);
			if (
				input.role !== "fournisseur" &&
				input.currency !== undefined &&
				input.currency !== currency
			)
				throw new ManagementError(
					"BAD_REQUEST",
					"Currency is inherited from the parent account.",
				);
			let ownership: ReturnType<typeof childOwnership>;
			try {
				ownership = childOwnership(actor, parent, input.role);
			} catch {
				throw new ManagementError(
					"FORBIDDEN",
					"You cannot create this account under this parent.",
				);
			}
			const previous = await this.receipt(
				actorId,
				requestId,
				fingerprint,
				session,
			);
			if (previous) return { id: previous.targetId };
			await this.lockAccounts([actor, parent], session);
			const now = new Date();
			const target = {
				id: id.toHexString(),
				role: input.role,
				currency,
				name: input.name,
				...ownership,
			};
			await userCollection(this.db).insertOne(
				{
					_id: id,
					name: input.name,
					email: `${phoneNumber.slice(1)}@accounts.invalid`,
					emailVerified: false,
					phoneNumber,
					phoneNumberVerified: false,
					currency,
					role: input.role,
					...ownership,
					banned: false,
					createdAt: now,
					updatedAt: now,
				},
				{ session },
			);
			// Better Auth's credential schema; use its configured password hasher.
			await this.db.collection("account").insertOne(
				{
					_id: new ObjectId(),
					userId: id,
					providerId: "credential",
					accountId: target.id,
					password: passwordHash,
					createdAt: now,
					updatedAt: now,
				},
				{ session },
			);
			const balances = await this.move(actor, target, amountMillimes, session);
			await this.transfers().insertOne(
				{
					_id: `${actorId}:${requestId}`,
					fingerprint,
					kind: "account.create",
					currency,
					actorId,
					targetId: target.id,
					targetName: input.name,
					amountMillimes,
					...balances,
					createdAt: now,
				},
				{ session },
			);
			await this.db.collection("managementAudit").insertOne(
				{
					actorId,
					action: "account.create",
					targetId: target.id,
					amountMillimes,
					requestId,
					createdAt: now,
				},
				{ session },
			);
			await new NotificationService(this.db).funding(
				`${actorId}:${requestId}`,
				target,
				amountMillimes,
				session,
				{ actorId, created: true },
			);
			return { id: target.id };
		});
	}

	async topUp(
		actorId: string,
		input: { id: string; amount: string; requestId: string },
	) {
		const amountMillimes = this.amount(input.amount);
		const fingerprint = this.fingerprint({
			kind: "wallet.transfer",
			targetId: input.id,
			amountMillimes,
		});
		return this.transaction(async (session) => {
			const actor = await this.active(actorId, session);
			const target = await findAccount(this.db, input.id, session);
			if (!target || !canManage(actor, target))
				throw new ManagementError("FORBIDDEN", "You cannot fund this account.");
			await this.active(target.id, session);
			const previous = await this.receipt(
				actorId,
				input.requestId,
				fingerprint,
				session,
			);
			if (previous)
				return { targetBalanceMillimes: previous.targetBalanceAfter };
			await this.lockAccounts([actor, target], session);
			const balances = await this.move(actor, target, amountMillimes, session);
			const now = new Date();
			await this.transfers().insertOne(
				{
					_id: `${actorId}:${input.requestId}`,
					fingerprint,
					kind: "wallet.transfer",
					currency: currencyOf(target.currency),
					actorId,
					targetId: target.id,
					targetName: target.name,
					amountMillimes,
					...balances,
					createdAt: now,
				},
				{ session },
			);
			await this.db.collection("managementAudit").insertOne(
				{
					actorId,
					action: "wallet.transfer",
					targetId: target.id,
					amountMillimes,
					requestId: input.requestId,
					createdAt: now,
				},
				{ session },
			);
			await new NotificationService(this.db).funding(
				`${actorId}:${input.requestId}`,
				target,
				amountMillimes,
				session,
				{ actorId, created: false },
			);
			return { targetBalanceMillimes: balances.targetBalanceAfter };
		});
	}

	async balance(actorId: string) {
		const actor = await this.active(actorId);
		const hello = await this.db.command({ hello: 1 });
		return {
			transfersEnabled: Boolean(hello.setName || hello.msg === "isdbgrid"),
			balanceMillimes:
				(await this.wallets().findOne({ _id: actorId }))?.balanceMillimes ?? 0,
			currency: currencyOf(actor.currency),
			canAllocate: actor.role === "admin",
		};
	}

	/** Persisting a bet, its stake debit, and ledger entry must share this session. */
	async spendForBet<T extends { id: string }>(
		actorId: string,
		input: {
			stakeMillimes: number;
			requestId: string;
			existing: (session: ClientSession) => Promise<T | null>;
			save: (session: ClientSession) => Promise<T>;
		},
	) {
		if (
			!Number.isSafeInteger(input.stakeMillimes) ||
			input.stakeMillimes <= 0 ||
			input.stakeMillimes > MAX_WALLET_MILLIMES
		)
			throw new ManagementError("BAD_REQUEST", "Invalid stake.");
		return this.transaction(async (session) => {
			const actor = await this.active(actorId, session);
			if (actor.role !== "user")
				throw new ManagementError(
					"FORBIDDEN",
					"Only user accounts can place bets.",
				);
			const existing = await input.existing(session);
			if (existing) return existing;
			await this.lockAccounts([actor], session);
			const source = await this.wallets().findOneAndUpdate(
				{ _id: actorId, balanceMillimes: { $gte: input.stakeMillimes } },
				{
					$inc: { balanceMillimes: -input.stakeMillimes },
					$set: { updatedAt: new Date() },
				},
				{ session, returnDocument: "after" },
			);
			if (!source)
				throw new ManagementError(
					"BAD_REQUEST",
					"Your wallet credits are too low for this stake.",
				);
			const bet = await input.save(session);
			const account = await findAccount(this.db, actorId, session);
			await this.transfers().insertOne(
				{
					_id: `${actorId}:bet:${input.requestId}`,
					fingerprint: this.fingerprint({
						betId: bet.id,
						stake: input.stakeMillimes,
					}),
					kind: "bet.stake",
					currency: currencyOf(actor.currency),
					actorId,
					sourceId: actorId,
					targetId: `bet:${bet.id}`,
					sourceName: account?.name ?? "User wallet",
					targetName: "Bet stake",
					amountMillimes: input.stakeMillimes,
					sourceBalanceAfter: source.balanceMillimes,
					targetBalanceAfter: 0,
					createdAt: new Date(),
				},
				{ session },
			);
			await this.db.collection("managementAudit").insertOne(
				{
					actorId,
					action: "bet.place",
					targetId: bet.id,
					amountMillimes: input.stakeMillimes,
					requestId: input.requestId,
					createdAt: new Date(),
				},
				{ session },
			);
			return bet;
		});
	}

	/** The conditional bet update and wallet credit commit together, even across workers. */
	async payBet(input: {
		betId: string;
		currency?: Currency;
		userId: string;
		payoutMillimes: number;
		claim: (session: ClientSession) => Promise<boolean>;
	}) {
		if (
			!Number.isSafeInteger(input.payoutMillimes) ||
			input.payoutMillimes < 0 ||
			input.payoutMillimes > MAX_WALLET_MILLIMES
		)
			throw new Error("Invalid payout.");
		return this.transaction(async (session) => {
			const owner = await findAccount(this.db, input.userId, session);
			if (!owner || currencyOf(owner.currency) !== currencyOf(input.currency))
				throw new Error("Payout currency does not match the account.");
			if (!(await input.claim(session))) return false;
			// Earned returns remain payable even when an account has been suspended.
			const wallet = await this.wallets().findOneAndUpdate(
				{
					_id: input.userId,
					balanceMillimes: { $lte: MAX_WALLET_MILLIMES - input.payoutMillimes },
				},
				{
					$inc: { balanceMillimes: input.payoutMillimes },
					$set: { updatedAt: new Date() },
				},
				{ session, returnDocument: "after" },
			);
			if (!wallet)
				throw new Error(
					"Payout wallet missing or balance limit exceeded; settlement remains pending.",
				);
			const now = new Date();
			await this.transfers().insertOne(
				{
					_id: `bet:payout:${input.betId}`,
					kind: "bet.payout",
					currency: currencyOf(input.currency),
					fingerprint: this.fingerprint(input.betId),
					actorId: "system",
					sourceId: `bet:${input.betId}`,
					targetId: input.userId,
					sourceName: "Bet settlement",
					targetName: "User wallet",
					amountMillimes: input.payoutMillimes,
					sourceBalanceAfter: null,
					targetBalanceAfter: wallet.balanceMillimes,
					createdAt: now,
				},
				{ session },
			);
			await this.db.collection("managementAudit").insertOne(
				{
					actorId: "system",
					action: "bet.settle",
					targetId: input.betId,
					amountMillimes: input.payoutMillimes,
					createdAt: now,
				},
				{ session },
			);
			return true;
		});
	}

	/** An instant casino round, debit and return are a single all-or-nothing commit. */
	async casinoRound<T>(
		actorId: string,
		input: {
			id: string;
			stakeMillimes: number;
			payoutMillimes: number;
			existing: (session: ClientSession) => Promise<T | null>;
			save: (session: ClientSession, balance: number) => Promise<T>;
		},
	) {
		if (
			!Number.isSafeInteger(input.stakeMillimes) ||
			input.stakeMillimes <= 0 ||
			!Number.isSafeInteger(input.payoutMillimes) ||
			input.payoutMillimes < 0 ||
			input.stakeMillimes > MAX_WALLET_MILLIMES ||
			input.payoutMillimes > MAX_WALLET_MILLIMES
		)
			throw new ManagementError("BAD_REQUEST", "Invalid casino amounts.");
		return this.transaction(async (session) => {
			const actor = await this.active(actorId, session);
			if (actor.role !== "user")
				throw new ManagementError("FORBIDDEN", "Only user accounts can play.");
			// Serialize rounds with funding, sports wagers and hierarchy suspensions.
			await this.lockAccounts([actor], session);
			const previous = await input.existing(session);
			if (previous) return previous;
			const delta = input.payoutMillimes - input.stakeMillimes;
			const wallet = await this.wallets().findOneAndUpdate(
				{
					_id: actorId,
					balanceMillimes: {
						$gte: input.stakeMillimes,
						$lte: MAX_WALLET_MILLIMES - Math.max(0, delta),
					},
				},
				{ $inc: { balanceMillimes: delta }, $set: { updatedAt: new Date() } },
				{ session, returnDocument: "after" },
			);
			if (!wallet)
				throw new ManagementError(
					"BAD_REQUEST",
					"Insufficient credits or wallet balance limit reached.",
				);
			const now = new Date();
			const afterStake = wallet.balanceMillimes - input.payoutMillimes;
			await this.transfers().insertMany(
				[
					{
						_id: `casino:stake:${input.id}`,
						fingerprint: this.fingerprint(input.id),
						kind: "casino.stake",
						currency: currencyOf(actor.currency),
						actorId,
						sourceId: actorId,
						targetId: `casino:${input.id}`,
						sourceName: "User wallet",
						targetName: "Casino stake",
						amountMillimes: input.stakeMillimes,
						sourceBalanceAfter: afterStake,
						targetBalanceAfter: 0,
						createdAt: now,
					},
					{
						_id: `casino:payout:${input.id}`,
						fingerprint: this.fingerprint(input.id),
						kind: "casino.payout",
						currency: currencyOf(actor.currency),
						actorId: "system",
						sourceId: `casino:${input.id}`,
						targetId: actorId,
						sourceName: "Casino return",
						targetName: "User wallet",
						amountMillimes: input.payoutMillimes,
						sourceBalanceAfter: null,
						targetBalanceAfter: wallet.balanceMillimes,
						createdAt: now,
					},
				],
				{ session },
			);
			const round = await input.save(session, wallet.balanceMillimes);
			await this.db.collection("managementAudit").insertOne(
				{
					actorId,
					action: "casino.settle",
					targetId: input.id,
					stakeMillimes: input.stakeMillimes,
					payoutMillimes: input.payoutMillimes,
					createdAt: now,
				},
				{ session },
			);
			return round;
		});
	}

	/** Interactive games may debit at start and pay later, under the same wallet guard. */
	async casinoSession<T>(
		actorId: string,
		work: (
			session: ClientSession,
			move: (id: string, stake: number, payout: number) => Promise<number>,
		) => Promise<T>,
	) {
		return this.transaction(async (session) => {
			const actor = await this.active(actorId, session);
			if (actor.role !== "user")
				throw new ManagementError("FORBIDDEN", "Only user accounts can play.");
			await this.lockAccounts([actor], session);
			return work(session, async (id, stake, payout) => {
				if (
					!Number.isSafeInteger(stake) ||
					!Number.isSafeInteger(payout) ||
					stake < 0 ||
					payout < 0 ||
					stake > MAX_WALLET_MILLIMES ||
					payout > MAX_WALLET_MILLIMES
				)
					throw new ManagementError("BAD_REQUEST", "Invalid game amounts.");
				const delta = payout - stake;
				const wallet = await this.wallets().findOneAndUpdate(
					{
						_id: actorId,
						balanceMillimes: {
							$gte: stake,
							$lte: MAX_WALLET_MILLIMES - Math.max(0, delta),
						},
					},
					{ $inc: { balanceMillimes: delta }, $set: { updatedAt: new Date() } },
					{ session, returnDocument: "after" },
				);
				if (!wallet)
					throw new ManagementError(
						"BAD_REQUEST",
						"Insufficient credits or wallet balance limit reached.",
					);
				const now = new Date();
				const entries: TransferDocument[] = [];
				if (stake > 0)
					entries.push({
						_id: `casino:stake:${id}`,
						fingerprint: this.fingerprint(id),
						kind: "casino.stake",
						currency: currencyOf(actor.currency),
						actorId,
						sourceId: actorId,
						targetId: `casino:${id}`,
						sourceName: "User wallet",
						targetName: "Casino stake",
						amountMillimes: stake,
						sourceBalanceAfter: wallet.balanceMillimes - payout,
						targetBalanceAfter: 0,
						createdAt: now,
					});
				if (stake === 0 || payout > 0)
					entries.push({
						_id: `casino:payout:${id}`,
						fingerprint: this.fingerprint(id),
						kind: "casino.payout",
						currency: currencyOf(actor.currency),
						actorId: "system",
						sourceId: `casino:${id}`,
						targetId: actorId,
						sourceName: "Casino return",
						targetName: "User wallet",
						amountMillimes: payout,
						sourceBalanceAfter: null,
						targetBalanceAfter: wallet.balanceMillimes,
						createdAt: now,
					});
				if (entries.length)
					await this.transfers().insertMany(entries, { session });
				await this.db.collection("managementAudit").insertOne(
					{
						actorId,
						action: stake > 0 ? "casino.start" : "casino.settle",
						targetId: id,
						stakeMillimes: stake,
						payoutMillimes: payout,
						createdAt: now,
					},
					{ session },
				);
				return wallet.balanceMillimes;
			});
		});
	}

	async balances(ids: string[]) {
		const documents = await this.wallets()
			.find({ _id: { $in: ids } })
			.toArray();
		return new Map(
			documents.map((wallet) => [wallet._id, wallet.balanceMillimes]),
		);
	}

	async history(
		actorId: string,
		input: { accountId?: string; page: number; limit: number },
	) {
		const actor = await this.active(actorId);
		const accountId =
			input.accountId ?? (actor.role === "admin" ? undefined : actorId);
		if (accountId && accountId !== actorId) {
			const target = await findAccount(this.db, accountId);
			if (!target || !canManage(actor, target))
				throw new ManagementError("FORBIDDEN", "You cannot view this wallet.");
		}
		const filter = accountId
			? { $or: [{ sourceId: accountId }, { targetId: accountId }] }
			: {};
		const [records, total] = await Promise.all([
			this.transfers()
				.find(filter)
				.sort({ createdAt: -1, _id: -1 })
				.skip((input.page - 1) * input.limit)
				.limit(input.limit)
				.toArray(),
			this.transfers().countDocuments(filter),
		]);
		return {
			items: records.map(
				({
					_id,
					currency,
					sourceId,
					targetId,
					sourceName,
					targetName,
					amountMillimes,
					sourceBalanceAfter,
					targetBalanceAfter,
					createdAt,
				}) => ({
					id: _id,
					currency: currencyOf(currency),
					sourceId,
					targetId,
					sourceName,
					targetName,
					amountMillimes,
					sourceBalanceAfter,
					targetBalanceAfter,
					createdAt: createdAt.toISOString(),
				}),
			),
			total,
			page: input.page,
		};
	}
}
