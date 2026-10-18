import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { createAuth } from "@gold-bet-clean-money365/auth";
import { bootstrapAdmin } from "@gold-bet-clean-money365/auth/bootstrap";
import { createAuthHttpHandler } from "@gold-bet-clean-money365/auth/http";
import { AccountManagement } from "@gold-bet-clean-money365/auth/management";
import {
	ensureAuthIndexes,
	ObjectId,
	userCollection,
} from "@gold-bet-clean-money365/auth/storage";
import { createDb } from "@gold-bet-clean-money365/db";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import type { PlaceBetInput } from "./betting";
import { BettingService } from "./betting-service";
import { CASINO_VERSION, type CasinoInput } from "./casino-catalog";
import { CasinoService } from "./casino-service";
import { CasinoSessions } from "./casino-sessions";
import type { Context } from "./context";
import type { FlashscoreService, FootballMatch } from "./football";
import { type AppRouterClient, appRouter } from "./routers/index";

test("server betting debits persisted wallets and saves isolated bets", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async (t) => {
	loadEnvFile(new URL("../../../apps/server/.env", import.meta.url));
	const connection = await createDb({
		DATABASE_URL:
			process.env.AUTH_TEST_DATABASE_URL ??
			process.env.DATABASE_URL ??
			"mongodb://127.0.0.1:27017",
	});
	const db = connection.client.db(
		`goldbet_bet_test_${randomUUID().replaceAll("-", "")}`,
	);
	try {
		await ensureAuthIndexes(db);
		const env = {
			BETTER_AUTH_URL: "http://localhost:3000",
			CORS_ORIGIN: "http://localhost:3001",
			BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
		};
		const auth = createAuth(env, db);
		const accounts = new AccountManagement(auth, db, env.BETTER_AUTH_SECRET);
		const password = "Test-only-password-123!";
		await bootstrapAdmin(auth, db, {
			name: "Bet test admin",
			phoneNumber: "+21622000000",
			password,
		});
		const root = await userCollection(db).findOne({ role: "admin" });
		assert.ok(root);
		const admin = root._id.toHexString();
		const supplier = (
			await accounts.create(admin, {
				name: "Supplier",
				phoneNumber: "+21622000001",
				password,
				role: "fournisseur",
				parentId: admin,
				initialAmount: "100000",
			})
		).id;
		const client = (
			await accounts.create(supplier, {
				name: "Client",
				phoneNumber: "+21622000002",
				password,
				role: "client",
				parentId: supplier,
				initialAmount: "10000",
			})
		).id;
		let counter = 2;
		const phones = new Map<string, string>();
		async function newUser() {
			const phoneNumber = `+21622${String(++counter).padStart(6, "0")}`;
			const user = (
				await accounts.create(client, {
					name: `Bettor ${counter}`,
					phoneNumber,
					password,
					role: "user",
					parentId: client,
					initialAmount: "100",
				})
			).id;
			phones.set(user, phoneNumber);
			return user;
		}
		let currentStatus = "TRADING";
		let currentScore: { home: number; away: number } | null = null;
		let verifiedScore = true;
		let currentPrice = "2.00";
		let offerActive = true;
		let liveAvailable = false;
		let missingResults = false;
		let unavailable = false;
		let quoteCalls = 0;
		const fixture = (id: string): FootballMatch => ({
			id,
			provider: "Flashscore",
			sport: "Football",
			league: "Test league",
			categoryName: "Test",
			categoryKey: "test",
			time: new Date(Date.now() + 86_400_000).toISOString(),
			home: "Home team",
			away: "Away team",
			homeMark: "HOM",
			awayMark: "AWY",
			score: { home: null, away: null },
			status: "TRADING",
			odds: {
				result: ["2.00", "3.00", "4.00"],
				markets: [],
				handicap: {
					homeLabel: "Home",
					awayLabel: "Away",
					home: "—",
					away: "—",
				},
				totals: {
					overLabel: "Over",
					underLabel: "Under",
					over: "—",
					under: "—",
				},
			},
		});
		const feed: FlashscoreService = {
			getMatches: async () => ({
				matches: [fixture("match001"), fixture("match002")],
				updatedAt: new Date().toISOString(),
				source: "Local Flashscore scraper",
			}),
			getResults: async (ids) => ({
				results: missingResults
					? []
					: ids.map((id) => ({
							id,
							status: currentStatus,
							score: currentScore,
							regulationScore: verifiedScore ? currentScore : null,
						})),
			}),
			getOdds: async (ids, options) => {
				assert.equal(
					options?.fresh,
					true,
					"placing a bet must bypass display-price caches",
				);
				quoteCalls++;
				if (unavailable) throw new Error("Scraper offline");
				return {
					odds: Object.fromEntries(
						ids.map((id) => [
							id,
							{
								result: [currentPrice, "3.00", "4.00"],
								markets: [
									{
										betType: "HOME_DRAW_AWAY",
										scope: "FULL_TIME",
										bookmaker: "Trusted bookmaker",
										hasLiveBetting: liveAvailable,
										selections: [
											{
												selection: "Home",
												value: id === "match002" ? "3.00" : currentPrice,
												openingValue: null,
												handicap: null,
												score: null,
												active: offerActive,
											},
										],
									},
								],
							},
						]),
					),
					priced: ids.length,
					total: ids.length,
				};
			},
		};
		const bets = new BettingService(db, feed, env.BETTER_AUTH_SECRET);
		const input = (stake = "10.125"): PlaceBetInput => ({
			requestId: randomUUID(),
			stake,
			picks: [
				{
					matchId: "match001",
					expectedOdd: "2.00",
					market: {
						type: "HOME_DRAW_AWAY",
						scope: "FULL_TIME",
						selection: "home",
					},
				},
			],
		});
		const forbidden = (error: unknown) =>
			error instanceof Error && "code" in error && error.code === "FORBIDDEN";

		await t.test(
			"two-way sport bets persist their sport, reject unsupported markets and pay once",
			async () => {
				const user = await newUser();
				let ended = false;
				let verifiedSport = "Unknown";
				const tennisFeed: FlashscoreService = {
					getMatches: async () => ({
						matches: [{ ...fixture("match001"), sport: verifiedSport }],
						source: "Local Flashscore scraper",
						updatedAt: new Date().toISOString(),
					}),
					getResults: async (ids) => ({
						results: ids.map((id) => ({
							id,
							sport: "Tennis",
							status: ended ? "RESULTED" : "TRADING",
							score: ended ? { home: 2, away: 0 } : null,
							winner: ended ? ("home" as const) : null,
							completedNormally: ended,
						})),
					}),
					getOdds: async (ids, options) => {
						const data = await feed.getOdds(ids, options);
						for (const snapshot of Object.values(data.odds))
							if (snapshot)
								snapshot.markets = snapshot.markets.map((market) => ({
									...market,
									betType: "HOME_AWAY",
								}));
						return data;
					},
				};
				const tennisBets = new BettingService(
					db,
					tennisFeed,
					env.BETTER_AUTH_SECRET,
				);
				await assert.rejects(
					() => tennisBets.place(user, input("10")),
					/sport could not be verified/,
				);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 100000);
				verifiedSport = "Tennis";
				await assert.rejects(
					() => tennisBets.place(user, input("10")),
					/View only/,
				);
				const betInput = input("10");
				betInput.picks[0]!.market.type = "HOME_AWAY";
				const saved = await tennisBets.place(user, betInput);
				assert.equal(saved.picks[0]?.sport, "Tennis");
				ended = true;
				await Promise.all([
					tennisBets.settlePending(5, user),
					tennisBets.settlePending(5, user),
				]);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110000);
				await tennisBets.settlePending(5, user);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110000);
			},
		);

		await t.test("only active user roles can place bets", async () => {
			const existingBets = await db.collection("bet").countDocuments({});
			for (const id of [admin, supplier, client])
				await assert.rejects(bets.place(id, input()), forbidden);
			assert.equal(await db.collection("bet").countDocuments({}), existingBets);
		});
		await t.test(
			"wallet stake, immutable bet snapshot, and ledger commit together",
			async () => {
				const user = await newUser();
				const saved = await bets.place(user, input());
				assert.equal(saved.stakeMillimes, 10_125);
				assert.equal(saved.potentialReturnMillimes, 20_250);
				assert.equal(saved.status, "Pending");
				assert.equal(saved.picks[0]?.home, "Home team");
				assert.equal(saved.picks[0]?.market.bookmaker, "Trusted bookmaker");
				assert.equal((await accounts.wallet(user)).balanceMillimes, 89_875);
				const stored = await db.collection("bet").findOne({ userId: user });
				assert.equal(stored?.stakeMillimes, 10_125);
				assert.equal(stored?.clientId, client);
				assert.equal(
					await db.collection("walletTransfer").countDocuments({
						sourceId: user,
						kind: "bet.stake",
						amountMillimes: 10_125,
					}),
					1,
				);
			},
		);
		await t.test(
			"same request is charged once, including concurrent retries and closed-feed replays",
			async () => {
				const user = await newUser();
				const request = input("10.001");
				const [first, second] = await Promise.all([
					bets.place(user, request),
					bets.place(user, request),
				]);
				assert.equal(first.id, second.id);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 89_999);
				const beforeQuotes = quoteCalls;
				currentStatus = "RESULTED";
				const replay = await bets.place(user, request);
				assert.equal(replay.id, first.id);
				assert.equal(quoteCalls, beforeQuotes);
				await assert.rejects(bets.place(user, { ...request, stake: "1" }));
				assert.equal(
					await db.collection("bet").countDocuments({ userId: user }),
					1,
				);
				currentStatus = "TRADING";
			},
		);
		await t.test(
			"independent match accumulators save exact combined returns",
			async () => {
				const user = await newUser();
				const request = input("10.125");
				request.picks.push({
					matchId: "match002",
					expectedOdd: "3.00",
					market: {
						type: "HOME_DRAW_AWAY",
						scope: "FULL_TIME",
						selection: "home",
					},
				});
				const saved = await bets.place(user, request);
				assert.equal(saved.totalOdds, 6);
				assert.equal(saved.potentialReturnMillimes, 60_750);
				const reordered = await bets.place(user, {
					...request,
					picks: [...request.picks].reverse(),
				});
				assert.equal(reordered.id, saved.id);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 89_875);
			},
		);

		await t.test(
			"concurrent overspending is rejected without overdraft or partial bet",
			async () => {
				const user = await newUser();
				const results = await Promise.allSettled([
					bets.place(user, input("70")),
					bets.place(user, input("70")),
				]);
				assert.equal(
					results.filter((result) => result.status === "fulfilled").length,
					1,
				);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 30_000);
				assert.equal(
					await db.collection("bet").countDocuments({ userId: user }),
					1,
				);
			},
		);
		await t.test(
			"invalid stakes and same-match combinations cannot spend credits",
			async () => {
				const user = await newUser();
				for (const stake of ["0", "-1", "NaN", "1e2", "0.0001", "101"])
					await assert.rejects(bets.place(user, input(stake)));
				const duplicate = input();
				assert.ok(duplicate.picks[0]);
				duplicate.picks.push({ ...duplicate.picks[0] });
				await assert.rejects(bets.place(user, duplicate));
				assert.equal((await accounts.wallet(user)).balanceMillimes, 100_000);
				assert.equal(
					await db.collection("bet").countDocuments({ userId: user }),
					0,
				);
			},
		);
		await t.test(
			"closed events, inactive selections, fake prices, and outages fail closed",
			async () => {
				const user = await newUser();
				currentStatus = "RESULTED";
				await assert.rejects(bets.place(user, input()));
				currentStatus = "CANCELLED";
				await assert.rejects(bets.place(user, input()));
				currentStatus = "TRADING";
				offerActive = false;
				await assert.rejects(bets.place(user, input()));
				offerActive = true;
				currentPrice = "1.90";
				await assert.rejects(bets.place(user, input()));
				currentPrice = "2.00";
				const fake = input();
				assert.ok(fake.picks[0]);
				fake.picks[0].expectedOdd = "999.00";
				await assert.rejects(bets.place(user, fake));
				missingResults = true;
				await assert.rejects(bets.place(user, input()));
				missingResults = false;
				unavailable = true;
				await assert.rejects(bets.place(user, input()));
				unavailable = false;
				assert.equal((await accounts.wallet(user)).balanceMillimes, 100_000);
			},
		);
		await t.test("live bets require an active live-betting offer", async () => {
			const user = await newUser();
			currentStatus = "TRADING_LIVE";
			await assert.rejects(bets.place(user, input()));
			liveAvailable = true;
			assert.equal((await bets.place(user, input())).status, "Pending");
			currentStatus = "TRADING";
			liveAvailable = false;
		});
		await t.test(
			"failed bet persistence rolls back the stake and ledger",
			async () => {
				const user = await newUser();
				await db.command({
					collMod: "bet",
					validator: { testOnlyReject: true },
				});
				try {
					await assert.rejects(bets.place(user, input()));
				} finally {
					await db.command({ collMod: "bet", validator: {} });
				}
				assert.equal((await accounts.wallet(user)).balanceMillimes, 100_000);
				assert.equal(
					await db.collection("bet").countDocuments({ userId: user }),
					0,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ sourceId: user, kind: "bet.stake" }),
					0,
				);
			},
		);
		await t.test(
			"API blocks anonymous, forged-identity, and GET placement requests",
			async () => {
				const user = await newUser();
				const context: Context = {
					db,
					accounts,
					bets,
					casino: new CasinoService(db, "test-only-casino-secret"),
					casinoSessions: new CasinoSessions(db, "test-only-casino-secret"),
					flashscore: feed,
					session: null,
				};
				const handler = new RPCHandler(appRouter);
				const rpc: AppRouterClient = createORPCClient(
					new RPCLink({
						url: "http://test/rpc",
						fetch: async (url, options) => {
							const result = await handler.handle(new Request(url, options), {
								prefix: "/rpc",
								context,
							});
							return result.matched
								? result.response
								: new Response(null, { status: 404 });
						},
					}),
				);
				await assert.rejects(
					rpc.bets.place(input()),
					(error: unknown) =>
						error instanceof Error &&
						"code" in error &&
						error.code === "UNAUTHORIZED",
				);
				const http = await createAuthHttpHandler(auth, db, env);
				const casinoInput: CasinoInput = {
					requestId: randomUUID(),
					game: "roulette",
					choice: "red",
					numbers: [],
					version: CASINO_VERSION,
					stake: "1.000",
				};
				await assert.rejects(rpc.casino.play(casinoInput), {
					code: "UNAUTHORIZED",
				});
				const sessionStart = {
					requestId: randomUUID(),
					game: "mines" as const,
					version: CASINO_VERSION,
					stake: "1.000",
				};
				await assert.rejects(rpc.casino.start(sessionStart), {
					code: "UNAUTHORIZED",
				});
				const login = await http(
					new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/phone-number`, {
						method: "POST",
						headers: {
							origin: env.CORS_ORIGIN,
							"content-type": "application/json",
						},
						body: JSON.stringify({ phoneNumber: phones.get(user), password }),
					}),
					"192.0.2.10",
				);
				const cookie = login.headers
					.getSetCookie()
					.map((value) => value.split(";")[0])
					.join("; ");
				context.session = await auth.api.getSession({ headers: { cookie } });
				assert.ok(context.session);
				await assert.rejects(
					rpc.casino.start({ ...sessionStart, userId: admin } as Parameters<
						AppRouterClient["casino"]["start"]
					>[0]),
					{ code: "BAD_REQUEST" },
				);
				await assert.rejects(
					rpc.casino.action({
						id: "unused",
						requestId: randomUUID(),
						action: { type: "cashout" },
						payoutMillimes: 1000000,
					} as Parameters<AppRouterClient["casino"]["action"]>[0]),
					{ code: "BAD_REQUEST" },
				);
				for (const path of ["start", "action"]) {
					const rejected = await handler.handle(
						new Request(`http://test/rpc/casino/${path}`),
						{ prefix: "/rpc", context },
					);
					assert.equal(rejected.matched && rejected.response.status, 405);
				}
				await assert.rejects(
					rpc.casino.play({
						...casinoInput,
						userId: admin,
						payoutMillimes: 1000000,
					} as CasinoInput),
					{ code: "BAD_REQUEST" },
				);
				const casinoGet = await handler.handle(
					new Request("http://test/rpc/casino/play"),
					{ prefix: "/rpc", context },
				);
				assert.equal(casinoGet.matched && casinoGet.response.status, 405);
				await assert.rejects(
					rpc.bets.place({ ...input(), userId: admin } as PlaceBetInput),
					(error: unknown) =>
						error instanceof Error &&
						"code" in error &&
						error.code === "BAD_REQUEST",
				);
				const get = await handler.handle(
					new Request("http://test/rpc/bets/place"),
					{ prefix: "/rpc", context },
				);
				assert.equal(get.matched && get.response.status, 405);
				const saved = await rpc.bets.place(input());
				assert.equal(
					(await rpc.bets.mine({ page: 1, limit: 10 })).items[0]?.id,
					saved.id,
				);
				const other = await newUser();
				assert.equal((await bets.list(other, { page: 1, limit: 10 })).total, 0);
				assert.equal((await bets.list(user, { page: 1, limit: 10 })).total, 1);
				await accounts.setDisabled(admin, { id: supplier, disabled: true });
				await assert.rejects(rpc.bets.place(input()), forbidden);
				await accounts.setDisabled(admin, { id: supplier, disabled: false });
			},
		);

		await t.test(
			"finished winning bets pay exactly once across concurrent workers and restarts",
			async () => {
				const user = await newUser();
				const saved = await bets.place(user, input("10.125"));
				currentStatus = "TRADING_LIVE";
				currentScore = { home: 2, away: 0 };
				await bets.settlePending();
				assert.equal((await accounts.wallet(user)).balanceMillimes, 89_875);
				currentStatus = "RESULTED";
				const restarted = new BettingService(db, feed, env.BETTER_AUTH_SECRET);
				await Promise.all([bets.settlePending(), restarted.settlePending()]);
				await restarted.settlePending();
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110_125);
				const history = await bets.list(user, { page: 1, limit: 10 });
				assert.equal(history.items[0]?.status, "Won");
				assert.equal(
					await db
						.collection("notification")
						.countDocuments({ userId: user, kind: "bet.settled" }),
					1,
				);
				assert.equal(history.items[0]?.payoutMillimes, 20_250);
				assert.ok(history.items[0]?.settledAt);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ _id: `bet:payout:${saved.id}` }),
					1,
				);
				currentStatus = "TRADING";
				currentScore = null;
			},
		);
		await t.test(
			"losses pay nothing and ambiguous results remain pending",
			async () => {
				const user = await newUser();
				await bets.place(user, input("10"));
				currentStatus = "RESULTED";
				currentScore = { home: 0, away: 1 };
				verifiedScore = false;
				await bets.settlePending();
				assert.equal(
					(await bets.list(user, { page: 1, limit: 10 })).items[0]?.status,
					"Pending",
				);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 90_000);
				verifiedScore = true;
				await bets.settlePending();
				assert.equal(
					(await bets.list(user, { page: 1, limit: 10 })).items[0]?.status,
					"Lost",
				);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 90_000);
				currentStatus = "TRADING";
				currentScore = null;
			},
		);

		await t.test(
			"accumulators wait for every final result before crediting winnings",
			async () => {
				const user = await newUser();
				let started = false;
				let secondFinished = false;
				const stagedFeed: FlashscoreService = {
					...feed,
					getResults: async (ids) => ({
						results: ids.map((id) => {
							const final = started && (id === "match001" || secondFinished);
							return {
								id,
								status: final
									? "RESULTED"
									: started
										? "TRADING_LIVE"
										: "TRADING",
								score: started ? { home: 2, away: 0 } : null,
								regulationScore: final ? { home: 2, away: 0 } : null,
							};
						}),
					}),
				};
				const staged = new BettingService(
					db,
					stagedFeed,
					env.BETTER_AUTH_SECRET,
				);
				const request = input("10");
				const firstPick = request.picks[0];
				assert.ok(firstPick);
				request.picks.push({
					...firstPick,
					matchId: "match002",
					expectedOdd: "3.00",
				});
				await staged.place(user, request);
				started = true;
				await staged.settlePending();
				assert.equal((await accounts.wallet(user)).balanceMillimes, 90_000);
				assert.equal(
					(await staged.list(user, { page: 1, limit: 10 })).items[0]?.status,
					"Pending",
				);
				secondFinished = true;
				await staged.settlePending();
				assert.equal((await accounts.wallet(user)).balanceMillimes, 150_000);
				const saved = (await staged.list(user, { page: 1, limit: 10 }))
					.items[0];
				assert.equal(saved?.status, "Won");
				assert.equal(saved?.payoutMillimes, 60_000);
				assert.equal(saved?.pickResults?.length, 2);
			},
		);
		await t.test(
			"a failed wallet payout rolls back the bet status and retries safely",
			async () => {
				const user = await newUser();
				await bets.place(user, input("10"));
				// A full wallet cannot receive winnings; the bet must remain payable.
				await db
					.collection<{ _id: string; balanceMillimes: number }>("wallet")
					.updateOne(
						{ _id: user },
						{ $set: { balanceMillimes: 1_000_000_000_000 } },
					);
				currentStatus = "RESULTED";
				currentScore = { home: 1, away: 0 };
				await bets.settlePending();
				assert.equal(
					(await bets.list(user, { page: 1, limit: 10 })).items[0]?.status,
					"Pending",
				);
				assert.equal(
					await db
						.collection("walletTransfer")
						.countDocuments({ targetId: user, kind: "bet.payout" }),
					0,
				);
				await db
					.collection<{ _id: string; balanceMillimes: number }>("wallet")
					.updateOne({ _id: user }, { $set: { balanceMillimes: 90_000 } });
				await bets.settlePending();
				assert.equal(
					(await bets.list(user, { page: 1, limit: 10 })).items[0]?.status,
					"Won",
				);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110_000);
				currentStatus = "TRADING";
				currentScore = null;
			},
		);

		await t.test(
			"manual result refresh is owner-scoped, rate limited and cannot pay twice",
			async () => {
				const user = await newUser();
				const other = await newUser();
				await bets.place(user, input("10"));
				await bets.place(other, input("10"));
				currentStatus = "RESULTED";
				currentScore = { home: 1, away: 0 };
				await bets.refreshResults(user);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110_000);
				assert.equal((await accounts.wallet(other)).balanceMillimes, 90_000);
				for (let repeat = 0; repeat < 4; repeat++)
					await bets.refreshResults(user);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110_000);
				await assert.rejects(bets.refreshResults(user));
				await assert.rejects(bets.refreshResults(admin));
				currentStatus = "TRADING";
				currentScore = null;
			},
		);
		await t.test(
			"advanced history filters paginate every bet and isolate totals and receipt search",
			async () => {
				const user = await newUser();
				const other = await newUser();
				await bets.place(user, input("1"));
				const original = await db.collection("bet").findOne({ userId: user });
				assert.ok(original);
				const firstPick = original.picks[0];
				const documents = Array.from({ length: 40 }, (_, index) => {
					const status = ["Pending", "Won", "Lost", "Void"][index % 4];
					const stakeMillimes = (index + 1) * 1000;
					const first = {
						...firstPick,
						home: "History [FC]",
						league: "History Cup",
					};
					return {
						...original,
						_id: new ObjectId(),
						requestId: randomUUID(),
						createdAt: new Date(Date.UTC(2025, 0, index + 1, 12)),
						status,
						stakeMillimes,
						payoutMillimes:
							status === "Won"
								? stakeMillimes * 2
								: status === "Void"
									? stakeMillimes
									: 0,
						picks:
							index % 2 ? [first, { ...first, matchId: "match002" }] : [first],
					};
				});
				await db.collection("bet").insertMany(documents);
				const foreign = {
					...documents[1],
					_id: new ObjectId(),
					userId: other,
					requestId: randomUUID(),
					stakeMillimes: 999_000_000,
					payoutMillimes: 999_000_000,
				};
				await db.collection("bet").insertOne(foreign);
				const filters = {
					page: 1,
					limit: 2,
					query: "history",
					status: "Won" as const,
					type: "multiple" as const,
					minStake: "5",
					maxStake: "20",
					from: "2025-01-01T00:00:00.000Z",
					to: "2025-01-31T23:59:59.999Z",
					sort: "oldest" as const,
				};
				const firstPage = await bets.list(user, filters);
				assert.equal(firstPage.total, 4);
				assert.deepEqual(
					firstPage.items.map((bet) => bet.stakeMillimes),
					[6000, 10000],
				);
				assert.equal(firstPage.summary.stakeMillimes, 48000);
				assert.equal(firstPage.summary.payoutMillimes, 96000);
				const secondPage = await bets.list(user, { ...filters, page: 2 });
				assert.deepEqual(
					secondPage.items.map((bet) => bet.stakeMillimes),
					[14000, 18000],
				);
				assert.deepEqual(secondPage.summary, firstPage.summary);
				const seen = new Set<string>();
				for (let page = 1; page <= 4; page++) {
					const result = await bets.list(user, {
						page,
						limit: 10,
						query: "History [FC]",
						sort: "oldest",
					});
					assert.equal(result.total, 40);
					assert.equal(result.summary.stakeMillimes, 820000);
					assert.equal(result.summary.payoutMillimes, 620000);
					assert.equal(result.summary.settledStakeMillimes, 630000);
					assert.equal(result.summary.pending, 10);
					for (const bet of result.items) seen.add(bet.id);
				}
				assert.equal(seen.size, 40);
				assert.equal(
					(await bets.list(user, { page: 1, limit: 10, query: ".*" })).total,
					0,
				);
				assert.equal(
					(
						await bets.list(user, {
							page: 1,
							limit: 10,
							query: foreign._id.toHexString(),
						})
					).summary.total,
					0,
				);
				assert.equal(
					(
						await bets.list(user, {
							page: 1,
							limit: 10,
							query: documents[0]?._id.toHexString(),
						})
					).total,
					1,
				);
				assert.equal(
					(
						await bets.list(user, {
							page: 1,
							limit: 10,
							query: "History Cup",
							sort: "stake",
						})
					).items[0]?.stakeMillimes,
					40000,
				);
				assert.equal(
					(
						await bets.list(user, {
							page: 1,
							limit: 10,
							query: "History Cup",
							sort: "payout",
						})
					).items[0]?.payoutMillimes,
					76000,
				);
				assert.equal(
					(
						await bets.list(user, {
							page: 1,
							limit: 50,
							query: "History Cup",
							type: "single",
						})
					).total,
					20,
				);
				assert.equal(
					(
						await bets.list(user, {
							page: 1,
							limit: 50,
							query: "History Cup",
							status: "Lost",
						})
					).total,
					10,
				);
				await assert.rejects(
					bets.list(user, { page: 1, limit: 10, minStake: "5", maxStake: "2" }),
				);
				await assert.rejects(bets.list(admin, { page: 1, limit: 10 }));
			},
		);
		await t.test(
			"admin review is private, auditable and cannot pay twice",
			async () => {
				currentStatus = "TRADING";
				currentPrice = "2.00";
				offerActive = true;
				missingResults = false;
				unavailable = false;
				const user = await newUser();
				const invalid = input("10");
				const invalidPick = invalid.picks[0];
				assert.ok(invalidPick);
				invalidPick.market.scope = "FIRST_HALF";
				await assert.rejects(
					bets.place(user, invalid),
					(error: unknown) =>
						error instanceof Error &&
						"code" in error &&
						error.code === "BAD_REQUEST",
				);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 100000);
				const bet = await bets.place(user, input("10"));
				await assert.rejects(bets.reviewQueue(user), forbidden);
				await assert.rejects(bets.reviewQueue(supplier), forbidden);
				const decision = {
					betId: bet.id,
					requestId: randomUUID(),
					reason: "Verified abandoned fixture; return the play credits.",
					outcomes: ["void" as const],
				};
				await assert.rejects(
					bets.resolveReview(admin, decision),
					/does not require review/,
				);
				await db.collection("bet").updateOne(
					{ _id: new ObjectId(bet.id) },
					{
						$set: {
							pickResults: [
								{
									matchId: "match001",
									status: "CANCELLED",
									score: null,
									outcome: "review",
								},
							],
						},
					},
				);
				assert.ok(
					(await bets.reviewQueue(admin)).items.some(
						(item) => item.id === bet.id,
					),
				);
				await assert.rejects(bets.resolveReview(user, decision), forbidden);
				await assert.rejects(
					bets.resolveReview(admin, { ...decision, outcomes: [] }),
					/every selection/,
				);
				const results = await Promise.all([
					bets.resolveReview(admin, decision),
					bets.resolveReview(admin, decision),
				]);
				assert.ok(results.every((result) => result.status === "Void"));
				assert.equal((await accounts.wallet(user)).balanceMillimes, 100000);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ _id: `bet:payout:${bet.id}` }),
					1,
				);
				assert.equal(
					await db
						.collection("managementAudit")
						.countDocuments({ targetId: bet.id, action: "bet.manual-settle" }),
					1,
				);
				await assert.rejects(
					bets.resolveReview(admin, {
						...decision,
						requestId: randomUUID(),
						outcomes: ["won"],
					}),
					/already been settled/,
				);
				const combo = input("10");
				const firstCombo = combo.picks[0];
				assert.ok(firstCombo);
				combo.picks.push({
					...firstCombo,
					matchId: "match002",
					expectedOdd: "3.00",
				});
				const multiple = await bets.place(user, combo);
				await db.collection("bet").updateOne(
					{ _id: new ObjectId(multiple.id) },
					{
						$set: {
							pickResults: [
								{
									matchId: "match002",
									status: "CANCELLED",
									score: null,
									outcome: "review",
								},
							],
						},
					},
				);
				const paid = await bets.resolveReview(admin, {
					betId: multiple.id,
					requestId: randomUUID(),
					reason: "Official final score verified; second fixture cancelled.",
					outcomes: ["won", "void"],
				});
				assert.equal(paid.payoutMillimes, 20000);
				assert.equal((await accounts.wallet(user)).balanceMillimes, 110000);
				const rollbackUser = user;
				const beforeRollback = (await accounts.wallet(rollbackUser))
					.balanceMillimes;
				const rollbackBet = await bets.place(rollbackUser, input("10"));
				await db.collection("bet").updateOne(
					{ _id: new ObjectId(rollbackBet.id) },
					{
						$set: {
							pickResults: [
								{
									matchId: "match001",
									status: "CANCELLED",
									score: null,
									outcome: "review",
								},
							],
						},
					},
				);
				const wallets = db.collection<{
					_id: string;
					balanceMillimes: number;
					updatedAt: Date;
				}>("wallet");
				const previousWallet = await wallets.findOne({ _id: rollbackUser });
				assert.ok(previousWallet);
				await wallets.deleteOne({ _id: rollbackUser });
				const rollbackDecision = {
					betId: rollbackBet.id,
					requestId: randomUUID(),
					reason: "Verified cancelled fixture; refund all play credits.",
					outcomes: ["void" as const],
				};
				await assert.rejects(
					bets.resolveReview(admin, rollbackDecision),
					/wallet missing/,
				);
				assert.equal(
					(
						await db
							.collection("bet")
							.findOne({ _id: new ObjectId(rollbackBet.id) })
					)?.status,
					"Pending",
				);
				assert.equal(
					await db.collection("managementAudit").countDocuments({
						targetId: rollbackBet.id,
						action: "bet.manual-settle",
					}),
					0,
				);
				await wallets.insertOne(previousWallet);
				assert.equal(
					(await bets.resolveReview(admin, rollbackDecision)).status,
					"Void",
				);
				assert.equal(
					(await accounts.wallet(rollbackUser)).balanceMillimes,
					beforeRollback,
				);
			},
		);
	} finally {
		assert.ok(db.databaseName.startsWith("goldbet_bet_test_"));
		await db.dropDatabase();
		await connection.client.close();
	}
});
