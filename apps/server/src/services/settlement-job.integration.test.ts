import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDb } from "@gold-bet-clean-money365/db";
import { runDailySettlement } from "./settlement-job";

test("daily settlement lease prevents overlapping runs, records progress and releases failed jobs", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async () => {
	const uri = process.env.AUTH_TEST_DATABASE_URL;
	assert.ok(
		uri && /^mongodb:\/\/127\.0\.0\.1[:/]/.test(uri),
		"Use an explicit disposable local database server",
	);
	const connection = await createDb({ DATABASE_URL: uri });
	const db = connection.client.db(
		`goldbet_jobs_test_${randomUUID().replaceAll("-", "")}`,
	);
	try {
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let started: () => void = () => {};
		const began = new Promise<void>((resolve) => {
			started = resolve;
		});
		const first = runDailySettlement(db, {
			settlePending: async () => {
				started();
				await gate;
				return 3;
			},
		});
		await began;
		assert.equal(
			(
				await runDailySettlement(db, {
					settlePending: async () => {
						throw new Error("Should not run");
					},
				})
			).skipped,
			true,
		);
		release();
		assert.equal((await first).checked, 3);
		await assert.rejects(
			runDailySettlement(db, {
				settlePending: async () => {
					throw new Error("Feed unavailable");
				},
			}),
			/Feed unavailable/,
		);
		const job = await db.collection("settlementJob").findOne({});
		assert.ok(job?.lastErrorAt);
		assert.equal(
			(await runDailySettlement(db, { settlePending: async () => 0 })).checked,
			0,
		);
		assert.equal(
			(await db.collection("settlementJob").findOne({}))?.lastErrorAt,
			undefined,
		);
	} finally {
		assert.ok(db.databaseName.startsWith("goldbet_jobs_test_"));
		await db.dropDatabase();
		await connection.client.close();
	}
});
