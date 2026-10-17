import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
	ensureAuthIndexes,
	ObjectId,
} from "@gold-bet-clean-money365/auth/storage";
import type { GameState } from "@gold-bet-clean-money365/casino-core";
import { createDb } from "@gold-bet-clean-money365/db";
import { CASINO_VERSION } from "./casino-catalog";
import { CasinoSessions, type SessionGame } from "./casino-sessions";

test("interactive sessions protect stakes, hidden state, actions and payouts", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async (t) => {
	const connection = await createDb({
		DATABASE_URL:
			process.env.AUTH_TEST_DATABASE_URL ??
			"mongodb://127.0.0.1:27017/?replicaSet=goldbet-wallets",
	});
	const db = connection.client.db(
		`goldbet_sessions_test_${randomUUID().replaceAll("-", "")}`,
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
				balanceMillimes: id === poor ? 0 : 1000000,
				updatedAt: new Date(),
			})),
		);
		const service = new CasinoSessions(db, "test-only-sessions-secret");
		const request = (game: SessionGame) => ({
			game,
			requestId: randomUUID(),
			version: CASINO_VERSION,
			stake: "1.000",
		});
		const sessions = db.collection<{
			_id: string;
			state: GameState;
			status: string;
			userId: string;
		}>("casinoSession");
		await t.test(
			"simultaneous starts debit once, hide mines, and survive service restart",
			async () => {
				const input = request("mines");
				const before = (await wallets.findOne({ _id: String(user) }))!
					.balanceMillimes;
				const rounds = await Promise.all([
					service.start(String(user), input),
					service.start(String(user), input),
				]);
				assert.deepEqual(rounds[0]?.view, rounds[1]?.view);
				assert.equal(rounds[0]?.id, rounds[1]?.id);
				const round = rounds[0]!;
				assert.equal(await service.recover(String(other), round.id), null);
				await assert.rejects(
					service.start(String(user), { ...input, stake: "2.000" }),
					/another round/,
				);
				assert.equal(
					(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
					before - 1000,
				);
				assert.deepEqual(round.view.mines, []);
				assert.equal("state" in round, false);
				assert.equal("deck" in round.view, false);
				await assert.rejects(
					service.start(String(user), request("mines")),
					/Resume/,
				);
				const restarted = new CasinoSessions(db, "test-only-sessions-secret");
				assert.equal(
					(await restarted.active(String(user), "mines"))?.id,
					round.id,
				);
				const privateState = (await sessions.findOne({ _id: round.id }))!.state;
				assert.ok(privateState.kind === "mines");
				const safe = Array.from({ length: 25 }, (_, i) => i).find(
					(i) => !privateState.mines.includes(i),
				)!;
				const action = {
					id: round.id,
					requestId: randomUUID(),
					action: { type: "reveal" as const, index: safe },
				};
				const revealed = await Promise.all([
					service.action(String(user), action),
					service.action(String(user), action),
				]);
				assert.deepEqual(revealed[0], revealed[1]);
				assert.equal(revealed[0]?.view.revealed?.length, 1);
				await assert.rejects(
					service.action(String(user), {
						...action,
						action: { type: "reveal", index: (safe + 1) % 25 },
					}),
					/already used/,
				);
				await assert.rejects(
					service.action(String(other), { ...action, requestId: randomUUID() }),
					/not found/,
				);
				const cashouts = await Promise.all([
					service.action(String(user), {
						id: round.id,
						requestId: randomUUID(),
						action: { type: "cashout" },
					}),
					service.action(String(user), {
						id: round.id,
						requestId: randomUUID(),
						action: { type: "cashout" },
					}),
				]);
				assert.equal(cashouts[0]?.status, "settled");
				assert.equal(cashouts[0]?.outcome?.multiplierHundredths, 110);
				assert.equal(
					(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
					before + 100,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ _id: `casino:payout:${round.id}` }),
					1,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("casinoRound")
						.countDocuments({ _id: round.id }),
					1,
				);
			},
		);
		await t.test(
			"blackjack only reveals dealer's second card after settlement",
			async () => {
				const round = await service.start(String(user), request("blackjack"));
				if (round.status === "active") {
					assert.equal(round.view.dealer?.[1], "hidden");
					const settled = await service.action(String(user), {
						id: round.id,
						requestId: randomUUID(),
						action: { type: "stand" },
					});
					assert.equal(settled.status, "settled");
					assert.ok(!settled.view.dealer?.includes("hidden"));
				} else assert.ok(round.outcome);
			},
		);
		await t.test(
			"poker draws exactly once; held cards remain; retries cannot redraw",
			async () => {
				const round = await service.start(String(user), request("video-poker"));
				const act = {
					id: round.id,
					requestId: randomUUID(),
					action: { type: "draw" as const, holds: [0, 1, 2] },
				};
				const final = await service.action(String(user), act);
				assert.deepEqual(
					final.view.cards?.slice(0, 3),
					round.view.cards?.slice(0, 3),
				);
				assert.equal(new Set(final.view.cards).size, 5);
				assert.deepEqual(await service.action(String(user), act), final);
				const again = await service.action(String(user), {
					...act,
					requestId: randomUUID(),
					action: { type: "draw", holds: [] },
				});
				assert.deepEqual(again.view.cards, final.view.cards);
			},
		);
		await t.test(
			"expired crash rounds settle to a loss without exposing their point early",
			async () => {
				const round = await service.start(String(other), request("crash"));
				if (round.status === "settled") return;
				assert.equal("bustAt" in round.view, false);
				assert.equal("bustHundredths" in round.view, false);
				await sessions.updateOne(
					{ _id: round.id },
					{
						$set: {
							state: {
								kind: "crash",
								startedAt: Date.now() - 10000,
								bustAt: Date.now() - 1,
								bustHundredths: 200,
							},
						},
					},
				);
				const before = (await wallets.findOne({ _id: String(other) }))!
					.balanceMillimes;
				const final = await service.active(String(other), "crash");
				assert.equal(final?.outcome?.multiplierHundredths, 0);
				assert.equal(
					(await wallets.findOne({ _id: String(other) }))!.balanceMillimes,
					before,
				);
				assert.equal(
					(await sessions.findOne({ _id: round.id }))?.status,
					"settled",
				);
			},
		);
		await t.test(
			"failed round persistence rolls back payout and leaves session resumable",
			async () => {
				const round = await service.start(String(user), request("mines"));
				const state = (await sessions.findOne({ _id: round.id }))!.state;
				assert.ok(state.kind === "mines");
				const safe = Array.from({ length: 25 }, (_, i) => i).find(
					(i) => !state.mines.includes(i),
				)!;
				await service.action(String(user), {
					id: round.id,
					requestId: randomUUID(),
					action: { type: "reveal", index: safe },
				});
				await db
					.collection<{ _id: string }>("casinoRound")
					.insertOne({ _id: round.id });
				const before = (await wallets.findOne({ _id: String(user) }))!
					.balanceMillimes;
				const act = {
					id: round.id,
					requestId: randomUUID(),
					action: { type: "cashout" as const },
				};
				await assert.rejects(service.action(String(user), act));
				assert.equal(
					(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
					before,
				);
				assert.equal(
					(await sessions.findOne({ _id: round.id }))?.status,
					"active",
				);
				await db
					.collection<{ _id: string }>("casinoRound")
					.deleteOne({ _id: round.id });
				assert.equal(
					(await service.action(String(user), act)).status,
					"settled",
				);
			},
		);
		await t.test(
			"Dino protects hidden future jumps and credits each replayed operation once",
			async () => {
				const before = (await wallets.findOne({ _id: String(user) }))!
					.balanceMillimes;
				const input = request("dino");
				const [round, duplicate] = await Promise.all([
					service.start(String(user), input),
					service.start(String(user), input),
				]);
				assert.equal(round.id, duplicate.id);
				assert.equal(
					(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
					before - 1000,
				);
				assert.equal(JSON.stringify(round.view).includes("collisionAt"), false);
				await assert.rejects(
					service.recover(String(other), round.id).then((r) => {
						if (!r) throw new Error("not found");
					}),
				);
				await assert.rejects(
					service.action(String(user), {
						id: round.id,
						requestId: randomUUID(),
						action: { type: "cashout" },
					}),
					/jump/,
				);
				await sessions.updateOne(
					{ _id: round.id },
					{ $set: { state: { kind: "dino", steps: 0, collisionAt: 2 } } },
				);
				const jump = {
					id: round.id,
					requestId: randomUUID(),
					action: { type: "jump" as const },
				};
				const replies = await Promise.all([
					service.action(String(user), jump),
					service.action(String(user), jump),
				]);
				assert.equal(replies[0]!.view.steps, 1);
				assert.equal(replies[1]!.view.steps, 1);
				const collect = {
					id: round.id,
					requestId: randomUUID(),
					action: { type: "cashout" as const },
				};
				const returns = await Promise.all([
					service.action(String(user), collect),
					service.action(String(user), collect),
				]);
				assert.equal(returns[0]!.outcome?.multiplierHundredths, 120);
				assert.equal(
					(await wallets.findOne({ _id: String(user) }))!.balanceMillimes,
					before + 200,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("casinoRound")
						.countDocuments({ _id: round.id }),
					1,
				);
			},
		);
		await t.test(
			"insufficient funds, manager roles, stale rules and banned parents fail closed",
			async () => {
				await assert.rejects(
					service.start(String(poor), request("mines")),
					/Insufficient/,
				);
				for (const id of [admin, supplier, client])
					await assert.rejects(
						service.start(String(id), request("mines")),
						/Only active/,
					);
				await assert.rejects(
					service.start(String(user), { ...request("mines"), version: "old" }),
					/latest game rules/,
				);
				await db
					.collection("user")
					.updateOne({ _id: supplier }, { $set: { banned: true } });
				await assert.rejects(
					service.start(String(user), request("mines")),
					/Only active/,
				);
			},
		);
	} finally {
		await db.dropDatabase();
		await connection.client.close();
	}
});
