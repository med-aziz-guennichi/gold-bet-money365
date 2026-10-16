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
import { MAX_WALLET_MILLIMES, parseTnd } from "./money";
import { activeAccount, findAccount, userCollection } from "./storage";

type WalletDocument = { _id: string; balanceMillimes: number; updatedAt: Date };
type TransferDocument = {
	_id: string;
	fingerprint: string;
	kind: "account.create" | "wallet.transfer" | "bet.stake" | "bet.payout";
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
			const amount = parseTnd(value);
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
			{ $setOnInsert: { balanceMillimes: 0, updatedAt: new Date() } },
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
		const fingerprint = this.fingerprint({
			kind: "account.create",
			name: input.name,
			phoneNumber,
			password: input.password,
			role: input.role,
			parentId: input.parentId,
			amountMillimes,
		});
		const id = new ObjectId();
		return this.transaction(async (session) => {
			const actor = await this.active(actorId, session);
			const parent = await this.active(input.parentId, session);
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
			currency: "TND" as const,
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
