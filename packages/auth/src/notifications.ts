import type { Database } from "@gold-bet-clean-money365/db";
import type { ClientSession } from "mongodb";
import type { AccountIdentity } from "./access";
import { ManagementError } from "./errors";
import { formatTnd } from "./money";
import { activeAccount, findAccount, userCollection } from "./storage";

export type NotificationDocument = {
	_id: string;
	userId: string;
	kind:
		| "user.credit"
		| "client.created"
		| "client.credit"
		| "client.low-credit"
		| "bet.settled"
		| "casino.settled";
	title: string;
	message: string;
	href: "/dashboard" | "/bets" | "/casino";
	createdAt: Date;
	readAt: Date | null;
};

/** Integer arithmetic: exactly 80% does not trigger "more than 80%". */
export function aboveCreditThreshold(received: number, transferred: number) {
	return received > 0 && BigInt(transferred) * 5n > BigInt(received) * 4n;
}

export class NotificationService {
	constructor(private readonly db: Database) {}
	private collection() {
		return this.db.collection<NotificationDocument>("notification");
	}
	async record(
		input: Omit<NotificationDocument, "createdAt" | "readAt">,
		session: ClientSession,
	) {
		await this.collection().updateOne(
			{ _id: input._id },
			{ $setOnInsert: { ...input, createdAt: new Date(), readAt: null } },
			{ upsert: true, session },
		);
	}
	async funding(
		eventId: string,
		target: AccountIdentity & { name: string },
		amount: number,
		session: ClientSession,
		event: { actorId: string; created: boolean },
	) {
		const actor = await findAccount(this.db, event.actorId, session);
		if (
			target.role === "client" &&
			event.created &&
			actor?.role === "fournisseur" &&
			actor.id === target.fournisseurId
		) {
			const supplier = target.fournisseurId
				? await findAccount(this.db, target.fournisseurId, session)
				: null;
			const admins = await userCollection(this.db)
				.find({ role: "admin", banned: { $ne: true } }, { session })
				.toArray();
			for (const admin of admins)
				await this.record(
					{
						_id: `${eventId}:client-created:${admin._id.toHexString()}`,
						userId: admin._id.toHexString(),
						kind: "client.created",
						title: "Client created",
						message: `${supplier?.name ?? "Fournisseur"} created client ${target.name} with ${formatTnd(amount)} initial credit.`,
						href: "/dashboard",
					},
					session,
				);
		}
		if (amount <= 0) return;
		if (target.role === "user") {
			const parent = target.clientId
				? await findAccount(this.db, target.clientId, session)
				: null;
			await this.record(
				{
					_id: `${eventId}:credit:${target.id}`,
					userId: target.id,
					kind: "user.credit",
					title: "Wallet credited",
					message: `${parent?.name ?? "Your client"} added ${formatTnd(amount)} to your wallet.`,
					href: "/bets",
				},
				session,
			);
		}
		const clientId =
			target.role === "client"
				? target.id
				: target.role === "user"
					? target.clientId
					: null;
		if (!clientId) return;
		const client = await findAccount(this.db, clientId, session);
		if (!client?.fournisseurId || client.role !== "client") return;
		const totals = await this.db
			.collection("walletTransfer")
			.aggregate<{ _id: string; total: number }>(
				[
					{
						$match: {
							kind: { $in: ["account.create", "wallet.transfer"] },
							$or: [
								{ targetId: clientId, sourceId: client.fournisseurId },
								{ sourceId: clientId },
							],
						},
					},
					{
						$group: {
							_id: {
								$cond: [
									{ $eq: ["$targetId", clientId] },
									"received",
									"transferred",
								],
							},
							total: { $sum: "$amountMillimes" },
						},
					},
				],
				{ session },
			)
			.toArray();
		const received = totals.find((x) => x._id === "received")?.total ?? 0;
		const transferred = totals.find((x) => x._id === "transferred")?.total ?? 0;
		const above = aboveCreditThreshold(received, transferred);
		const states = this.db.collection<{ _id: string; above: boolean }>(
			"notificationCreditThreshold",
		);
		const previous = await states.findOne({ _id: clientId }, { session });
		await states.updateOne(
			{ _id: clientId },
			{ $set: { above } },
			{ upsert: true, session },
		);
		if (above && !previous?.above)
			await this.record(
				{
					_id: `${eventId}:threshold:${clientId}`,
					userId: client.fournisseurId,
					kind: "client.low-credit",
					title: "Call your client",
					message: `${client.name} has transferred more than 80% of received credits to users (${formatTnd(transferred)} of ${formatTnd(received)}). Call them to arrange a top-up.`,
					href: "/dashboard",
				},
				session,
			);
	}
	async list(userId: string, page = 1) {
		if (!(await activeAccount(this.db, userId)))
			throw new ManagementError(
				"UNAUTHORIZED",
				"Sign in to view notifications.",
			);
		const [items, unread, total] = await Promise.all([
			this.collection()
				.find({ userId })
				.sort({ createdAt: -1, _id: -1 })
				.skip((page - 1) * 30)
				.limit(30)
				.toArray(),
			this.collection().countDocuments({ userId, readAt: null }),
			this.collection().countDocuments({ userId }),
		]);
		return {
			items: items.map(({ _id, userId: _, ...item }) => ({
				...item,
				id: _id,
				createdAt: item.createdAt.toISOString(),
				readAt: item.readAt?.toISOString() ?? null,
			})),
			unread,
			hasMore: page * 30 < total,
		};
	}
	async markRead(userId: string, id: string) {
		if (!(await activeAccount(this.db, userId)))
			throw new ManagementError(
				"UNAUTHORIZED",
				"Sign in to view notifications.",
			);
		await this.collection().updateOne(
			{ _id: id, userId, readAt: null },
			{ $set: { readAt: new Date() } },
		);
		return { ok: true };
	}
}
