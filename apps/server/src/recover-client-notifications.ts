/** Explicit, idempotent repair. Reads ledger entries; writes notifications only. */

import { formatTnd } from "@gold-bet-clean-money365/auth/money";
import type { NotificationDocument } from "@gold-bet-clean-money365/auth/notifications";
import {
	findAccount,
	userCollection,
} from "@gold-bet-clean-money365/auth/storage";
import { createDb } from "@gold-bet-clean-money365/db";

const sinceValue = process.argv
	.find((value) => value.startsWith("--since="))
	?.slice(8);
const since = new Date(sinceValue ?? "invalid");
if (!Number.isFinite(since.getTime()))
	throw new Error("An explicit --since=ISO-date is required.");
const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri)
	throw new Error(
		"A private database URL must be supplied in the environment.",
	);
const db = await createDb({ DATABASE_URL: uri });
try {
	const admins = await userCollection(db)
		.find({ role: "admin", banned: { $ne: true } })
		.toArray();
	if (!admins.length)
		throw new Error("No admin found; repair stopped without writes.");
	const apply = process.argv.includes("--apply");
	let matched = 0;
	let inserted = 0;
	const ledger = db.collection<{
		_id: string;
		kind: string;
		actorId: string;
		targetId: string;
		targetName: string;
		sourceId: string | null;
		sourceName: string;
		amountMillimes: number;
		createdAt: Date;
	}>("walletTransfer");
	for await (const transfer of ledger.find({
		kind: "account.create",
		createdAt: { $gte: since },
	})) {
		const target = await findAccount(db, transfer.targetId);
		if (
			target?.role !== "client" ||
			!target.fournisseurId ||
			transfer.sourceId !== target.fournisseurId ||
			transfer.actorId !== target.fournisseurId
		)
			continue;
		matched++;
		for (const admin of admins) {
			const id = `${transfer._id}:client-created:${admin._id.toHexString()}`;
			const collection = db.collection<NotificationDocument>("notification");
			if (
				await collection.findOne({
					_id: `${transfer._id}:credit:${admin._id.toHexString()}`,
				})
			)
				continue;
			if (!apply) {
				if (!(await collection.findOne({ _id: id }))) inserted++;
				continue;
			}
			const result = await collection.updateOne(
				{ _id: id },
				{
					$setOnInsert: {
						userId: admin._id.toHexString(),
						kind: "client.created",
						title: "Client created",
						message: `${transfer.sourceName} created client ${transfer.targetName} with ${formatTnd(transfer.amountMillimes)} initial credit.`,
						href: "/dashboard",
						createdAt: transfer.createdAt,
						readAt: null,
					},
				},
				{ upsert: true },
			);
			inserted += result.upsertedCount;
		}
	}
	console.log(
		JSON.stringify({
			mode: apply ? "apply" : "dry-run",
			database: db.databaseName,
			matchedTransfers: matched,
			missingNotifications: inserted,
		}),
	);
} finally {
	await db.client.close();
}
