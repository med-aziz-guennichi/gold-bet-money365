import { createHmac } from "node:crypto";
import type { Database } from "@gold-bet-clean-money365/db";

type RateBucket = { _id: string; count: number; expiresAt: Date };

/** Atomic, shared across server instances; keys do not expose phone numbers. */
export function createRateLimiter(db: Database, secret: string) {
	return async (key: string, rule: { window: number; max: number }) => {
		const now = Date.now();
		const windowMs = rule.window * 1000;
		const bucket = Math.floor(now / windowMs);
		const digest = createHmac("sha256", secret).update(key).digest("hex");
		const id = `${digest}:${rule.window}:${bucket}`;
		const expiresAt = new Date((bucket + 1) * windowMs);
		const collection = db.collection<RateBucket>("securityRateLimit");
		// Concurrent first writes may race on the unique primary key. Retry as an update.
		let result: RateBucket | null;
		try {
			result = await collection.findOneAndUpdate(
				{ _id: id },
				{ $inc: { count: 1 }, $setOnInsert: { expiresAt } },
				{ upsert: true, returnDocument: "after" },
			);
		} catch (error) {
			if (
				!(
					error &&
					typeof error === "object" &&
					"code" in error &&
					error.code === 11000
				)
			)
				throw error;
			result = await collection.findOneAndUpdate(
				{ _id: id },
				{ $inc: { count: 1 } },
				{ returnDocument: "after" },
			);
		}
		const allowed = result !== null && result.count <= rule.max;
		return {
			allowed,
			retryAfter: allowed
				? null
				: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
		};
	};
}
