import type { Database } from "@gold-bet-clean-money365/db";
import type { Filter } from "mongodb";
import {
	type AccountIdentity,
	canManage,
	canUseDashboard,
	type Role,
} from "./access";
import type { Auth } from "./index";
import { type Currency, currencyOf } from "./money";
import { createRateLimiter } from "./rate-limit";
import {
	type AccountDocument,
	activeAccount,
	findAccount,
	userCollection,
} from "./storage";
import { WalletService } from "./wallets";

export { ManagementError } from "./errors";

import { ManagementError } from "./errors";

export type AccountSummary = AccountIdentity & {
	name: string;
	phoneNumber: string;
	createdAt: string;
	balanceMillimes: number;
};
export type ListAccountsInput = {
	page: number;
	limit: number;
	search?: string;
	role?: Role;
	parentId?: string;
};
export type CreateAccountInput = {
	name: string;
	phoneNumber: string;
	password: string;
	role: Exclude<Role, "admin">;
	parentId: string;
	initialAmount?: string;
	currency?: Currency;
	requestId?: string;
};

export class AccountManagement {
	private readonly limit;
	private readonly wallets;
	constructor(
		private readonly auth: Auth,
		private readonly db: Database,
		secret: string,
	) {
		this.limit = createRateLimiter(db, secret);
		this.wallets = new WalletService(db, secret);
	}

	async requireManager(id: string) {
		const actor = await activeAccount(this.db, id);
		if (!actor)
			throw new ManagementError("UNAUTHORIZED", "Please sign in again.");
		if (!canUseDashboard(actor.role))
			throw new ManagementError(
				"FORBIDDEN",
				"Dashboard access is restricted to managers.",
			);
		return actor;
	}

	private async actor(id: string, write: boolean) {
		const actor = await this.requireManager(id);
		const result = await this.limit(
			`management:${write ? "write" : "read"}:${id}`,
			{ window: 60, max: write ? 20 : 120 },
		);
		if (!result.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				`Too many requests. Try again in ${result.retryAfter} seconds.`,
			);
		return actor;
	}

	private scope(actor: AccountIdentity): Filter<AccountDocument> {
		if (actor.role === "admin") return {};
		if (actor.role === "fournisseur")
			return { fournisseurId: actor.id, role: { $in: ["client", "user"] } };
		return { clientId: actor.id, role: "user" };
	}

	async list(actorId: string, input: ListAccountsInput) {
		const actor = await this.actor(actorId, false);
		const filters: Filter<AccountDocument>[] = [this.scope(actor)];
		if (input.role) filters.push({ role: input.role });
		if (input.parentId) filters.push({ parentId: input.parentId });
		if (input.search) {
			const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			filters.push({
				$or: [
					{ name: { $regex: escaped, $options: "i" } },
					{ phoneNumber: { $regex: escaped } },
				],
			});
		}
		const filter = { $and: filters };
		const [documents, total] = await Promise.all([
			userCollection(this.db)
				.find(filter, {
					projection: {
						name: 1,
						currency: 1,
						phoneNumber: 1,
						role: 1,
						parentId: 1,
						fournisseurId: 1,
						clientId: 1,
						banned: 1,
						createdAt: 1,
					},
				})
				.sort({ createdAt: -1, _id: -1 })
				.skip((input.page - 1) * input.limit)
				.limit(input.limit)
				.toArray(),
			userCollection(this.db).countDocuments(filter),
		]);
		const balances = await this.wallets.balances(
			documents.map((user) => user._id.toHexString()),
		);
		const items: AccountSummary[] = documents.map((user) => ({
			id: user._id.toHexString(),
			currency: currencyOf(user.currency),
			name: user.name,
			phoneNumber: user.phoneNumber ?? "",
			role: user.role as Role,
			parentId: user.parentId,
			fournisseurId: user.fournisseurId,
			clientId: user.clientId,
			banned: Boolean(user.banned),
			createdAt: user.createdAt.toISOString(),
			balanceMillimes: balances.get(user._id.toHexString()) ?? 0,
		}));
		return { items, total, page: input.page, limit: input.limit };
	}

	private async target(actor: AccountIdentity, id: string) {
		const target = await findAccount(this.db, id);
		if (!target || !canManage(actor, target))
			throw new ManagementError("FORBIDDEN", "You cannot manage this account.");
		return target;
	}

	private async audit(actorId: string, action: string, targetId: string) {
		// Never record passwords, session tokens, or request bodies.
		await this.db
			.collection("managementAudit")
			.insertOne({ actorId, action, targetId, createdAt: new Date() });
	}

	async create(actorId: string, input: CreateAccountInput) {
		await this.actor(actorId, true);
		const context = await this.auth.$context;
		const hash = await context.password.hash(input.password);
		try {
			return await this.wallets.create(actorId, input, hash);
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"code" in error &&
				error.code === 11000
			)
				throw new ManagementError(
					"CONFLICT",
					"Phone number or request already exists. Retry with the same request to retrieve its result.",
				);
			throw error;
		}
	}

	async topUp(
		actorId: string,
		input: { id: string; amount: string; requestId: string },
	) {
		await this.actor(actorId, true);
		return this.wallets.topUp(actorId, input);
	}

	async wallet(actorId: string) {
		const rate = await this.limit(`wallet-read:${actorId}`, {
			window: 60,
			max: 120,
		});
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Too many wallet requests.",
			);
		return this.wallets.balance(actorId);
	}

	async walletHistory(
		actorId: string,
		input: { accountId?: string; page: number; limit: number },
	) {
		await this.actor(actorId, false);
		return this.wallets.history(actorId, input);
	}

	async update(actorId: string, input: { id: string; name: string }) {
		const actor = await this.actor(actorId, true);
		const target = await this.target(actor, input.id);
		await this.audit(actor.id, "account.rename", target.id);
		await userCollection(this.db).updateOne(
			{ _id: target._id },
			{ $set: { name: input.name, updatedAt: new Date() } },
		);
		return { success: true };
	}

	async setDisabled(actorId: string, input: { id: string; disabled: boolean }) {
		const actor = await this.actor(actorId, true);
		const target = await this.target(actor, input.id);
		await this.audit(
			actor.id,
			input.disabled ? "account.disable" : "account.enable",
			target.id,
		);
		await userCollection(this.db).updateOne(
			{ _id: target._id },
			{ $set: { banned: input.disabled, updatedAt: new Date() } },
		);
		// Revoke the branch, so re-enabling does not restore old sessions.
		if (input.disabled) {
			const branch = await userCollection(this.db)
				.find(
					{
						$or: [
							{ _id: target._id },
							{ fournisseurId: target.id },
							{ clientId: target.id },
						],
					},
					{ projection: { _id: 1 } },
				)
				.toArray();
			const context = await this.auth.$context;
			await Promise.all(
				branch.map((user) =>
					context.internalAdapter.deleteUserSessions(user._id.toHexString()),
				),
			);
		}
		return { success: true };
	}

	async resetPassword(
		actorId: string,
		input: { id: string; password: string },
	) {
		const actor = await this.actor(actorId, true);
		const target = await this.target(actor, input.id);
		const context = await this.auth.$context;
		const hashed = await context.password.hash(input.password);
		await this.audit(actor.id, "account.password-reset", target.id);
		await context.internalAdapter.updatePassword(target.id, hashed);
		await context.internalAdapter.deleteUserSessions(target.id);
		return { success: true };
	}
}
