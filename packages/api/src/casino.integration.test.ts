import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
	ensureAuthIndexes,
	ObjectId,
} from "@gold-bet-clean-money365/auth/storage";
import { WalletService } from "@gold-bet-clean-money365/auth/wallets";
import { createDb } from "@gold-bet-clean-money365/db";
import {
	CASINO_VERSION,
	type CasinoInput,
	casinoGames,
} from "./casino-catalog";
import { CasinoService } from "./casino-service";

test("casino wallet atomicity, retries, isolation and authorization", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async (t) => {
	const connection = await createDb({
		DATABASE_URL:
			process.env.AUTH_TEST_DATABASE_URL ??
			"mongodb://127.0.0.1:27017/?replicaSet=goldbet-wallets",
	});
	const db = connection.client.db(
		`goldbet_casino_test_${randomUUID().replaceAll("-", "")}`,
	);
	try {
		await ensureAuthIndexes(db);
		const ids = Array.from({ length: 6 }, () => new ObjectId());
		const [admin, supplier, client, user, other, poor] = ids as [
			ObjectId,
			ObjectId,
			ObjectId,
			ObjectId,
			ObjectId,
			ObjectId,
		];
		const now = new Date();
		await db.collection("user").insertMany(
			ids.map((id, i) => ({
				_id: id,
				name: `Test ${i}`,
				email: `${id}@test.invalid`,
				role:
					i === 0
						? "admin"
						: i === 1
							? "fournisseur"
							: i === 2
								? "client"
								: "user",
				parentId:
					i === 0
						? null
						: i === 1
							? String(admin)
							: i === 2
								? String(supplier)
								: String(client),
				fournisseurId: i >= 2 ? String(supplier) : null,
				clientId: i >= 3 ? String(client) : null,
				banned: false,
				createdAt: now,
				updatedAt: now,
			})),
		);
		const wallets = db.collection<{
			_id: string;
			balanceMillimes: number;
			updatedAt: Date;
		}>("wallet");
		await wallets.insertMany(
			ids.map((id) => ({
				_id: String(id),
				balanceMillimes: id === poor ? 0 : 100000,
				updatedAt: now,
			})),
		);
		const service = new CasinoService(db, "isolated-casino-test-secret");
		const input = (overrides: Partial<CasinoInput> = {}): CasinoInput => ({
			requestId: randomUUID(),
			game: "coin",
			version: CASINO_VERSION,
			choice: "heads",
			numbers: [],
			stake: "1.000",
			...overrides,
		});
		await t.test(
			"all ten games persist a result and exact ledger arithmetic",
			async () => {
				for (const game of casinoGames) {
					const before = (await wallets.findOne({ _id: String(user) }))!
						.balanceMillimes;
					const round = await service.play(
						String(user),
						input({
							game: game.id,
							choice: game.choices[0],
							numbers: game.id === "keno" ? [1, 2, 3] : [],
						}),
					);
					assert.equal(
						round.balanceMillimes,
						before - round.stakeMillimes + round.payoutMillimes,
					);
					assert.equal(
						(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
						round.balanceMillimes,
					);
					assert.equal(
						await db
							.collection<{ _id: string }>("walletTransfer")
							.countDocuments({
								_id: {
									$in: [
										`casino:stake:${round.id}`,
										`casino:payout:${round.id}`,
									],
								},
							}),
						2,
					);
				}
			},
		);
		await t.test(
			"concurrent identical requests charge once and return the same result",
			async () => {
				const request = input();
				const before = (await wallets.findOne({ _id: String(user) }))!
					.balanceMillimes;
				const rounds = await Promise.all(
					Array.from({ length: 4 }, () => service.play(String(user), request)),
				);
				assert.ok(
					rounds.every((r) => JSON.stringify(r) === JSON.stringify(rounds[0])),
				);
				const round = rounds[0]!;
				assert.equal(
					(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
					before - 1000 + round.payoutMillimes,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("notification")
						.countDocuments({ _id: `casino:${round.id}:settled` }),
					1,
				);
				await assert.rejects(
					service.play(String(user), { ...request, stake: "2.000" }),
					/already belongs/,
				);
				assert.deepEqual(
					await service.recover(String(user), request.requestId),
					round,
				);
				assert.equal(
					await service.recover(String(other), request.requestId),
					null,
				);
			},
		);
		await t.test(
			"managers, suspended ancestors, invalid numbers and stale rules are blocked",
			async () => {
				for (const id of [admin, supplier, client])
					await assert.rejects(
						service.play(String(id), input()),
						/Only active user/,
					);
				await assert.rejects(
					service.play(String(user), input({ version: "old" })),
					/rules have changed/,
				);
				await assert.rejects(
					service.play(
						String(user),
						input({ game: "keno", choice: "draw", numbers: [1, 1, 2] }),
					),
					/Invalid game numbers/,
				);
				await assert.rejects(
					service.play(String(user), input({ choice: "hacked" })),
					/Invalid game selection/,
				);
				await assert.rejects(
					service.play(String(user), input({ stake: "100.001" })),
					/Stake must/,
				);
				await db
					.collection("user")
					.updateOne({ _id: supplier }, { $set: { banned: true } });
				await assert.rejects(
					service.play(String(user), input()),
					/Only active user/,
				);
				await db
					.collection("user")
					.updateOne({ _id: supplier }, { $set: { banned: false } });
			},
		);
		await t.test(
			"insufficient funds never create a round or ledger",
			async () => {
				const request = input();
				await assert.rejects(
					service.play(String(poor), request),
					/Insufficient/,
				);
				assert.equal(
					await db
						.collection("casinoRound")
						.countDocuments({ userId: String(poor) }),
					0,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ sourceId: String(poor) }),
					0,
				);
			},
		);
		await t.test(
			"persistence failure rolls back debit, payout, ledger and audit",
			async () => {
				const wallet = new WalletService(db, "test-secret");
				const before = (await wallets.findOne({ _id: String(other) }))!
					.balanceMillimes;
				await assert.rejects(
					wallet.casinoRound(String(other), {
						id: "rollback",
						stakeMillimes: 1000,
						payoutMillimes: 2000,
						existing: async () => null,
						save: async () => {
							throw new Error("injected persistence failure");
						},
					}),
					/injected persistence/,
				);
				assert.equal(
					(await wallets.findOne({ _id: String(other) }))!.balanceMillimes,
					before,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ _id: "casino:stake:rollback" }),
					0,
				);
			},
		);
		await t.test(
			"concurrent rounds cannot overspend the same credits",
			async () => {
				await wallets.updateOne(
					{ _id: String(poor) },
					{ $set: { balanceMillimes: 100 } },
				);
				const wallet = new WalletService(db, "test-secret");
				const results = await Promise.allSettled(
					["concurrent-a", "concurrent-b"].map((id) =>
						wallet.casinoRound(String(poor), {
							id,
							stakeMillimes: 100,
							payoutMillimes: 0,
							existing: async () => null,
							save: async () => id,
						}),
					),
				);
				assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
				assert.equal(
					(await wallets.findOne({ _id: String(poor) }))?.balanceMillimes,
					0,
				);
			},
		);
		await t.test("owner-only paginated history and rate limit", async () => {
			assert.equal(
				(await service.history(String(other), { page: 1 })).total,
				0,
			);
			const mine = await service.history(String(user), { page: 1 });
			assert.equal(mine.total, 11);
			assert.ok(
				mine.items.every((r) => !("userId" in r) && !("fingerprint" in r)),
			);
			await assert.rejects(
				service.history(String(admin), { page: 1 }),
				/Only active user/,
			);
			let blocked = false;
			for (let n = 0; n < 22; n++) {
				try {
					await service.play(String(other), input({ stake: "0.100" }));
				} catch (e) {
					if (e instanceof Error && e.message.includes("Please wait")) {
						blocked = true;
						break;
					}
					throw e;
				}
			}
			assert.equal(blocked, true);
		});
	} finally {
		await db.dropDatabase();
		await connection.client.close();
	}
});
