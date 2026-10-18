import { randomUUID } from "node:crypto";
import type { BettingService } from "@gold-bet-clean-money365/api/betting-service";
import type { Database } from "@gold-bet-clean-money365/db";

/** A bounded daily safety net; user refresh and a future daemon use the same atomic payout path. */
export async function runDailySettlement(
	db: Database,
	bets: Pick<BettingService, "settlePending">,
) {
	const jobs = db.collection<{
		_id: string;
		owner: string;
		expiresAt: Date;
		lastCompletedAt?: Date;
		lastErrorAt?: Date;
		checked?: number;
	}>("settlementJob");
	const owner = randomUUID();
	const startedAt = new Date();
	try {
		await jobs.findOneAndUpdate(
			{ _id: "daily", expiresAt: { $lte: startedAt } },
			{ $set: { owner, expiresAt: new Date(startedAt.getTime() + 330000) } },
			{ upsert: true },
		);
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000
		)
			return { skipped: true, checked: 0 };
		throw error;
	}
	let checked = 0;
	try {
		for (
			let batch = 0;
			batch < 5 && Date.now() - startedAt.getTime() < 220000;
			batch++
		) {
			const count = await bets.settlePending(20, undefined, startedAt);
			checked += count;
			if (count < 20) break;
		}
		await jobs.updateOne(
			{ _id: "daily", owner },
			{
				$set: { lastCompletedAt: new Date(), checked },
				$unset: { lastErrorAt: "" },
			},
		);
		return { skipped: false, checked };
	} catch (error) {
		await jobs.updateOne(
			{ _id: "daily", owner },
			{ $set: { lastErrorAt: new Date() } },
		);
		throw error;
	} finally {
		await jobs.updateOne(
			{ _id: "daily", owner },
			{ $set: { expiresAt: new Date() } },
		);
	}
}
