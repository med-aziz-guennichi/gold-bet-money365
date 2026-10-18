import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { test } from "node:test";

test("multi-sport browsing filters inactive/unpriced events, caches batches and preserves cursor progress", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	const calls: string[] = [];
	const fixtures = Array.from({ length: 35 }, (_, index) => ({
		id: `event${String(index).padStart(3, "0")}`,
		home: { name: "Home" },
		away: { name: "Away" },
		status: "scheduled",
		start_time: new Date(Date.now() + 86400000).toISOString(),
	}));
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		calls.push(path);
		const url = new URL(path, "http://test");
		let response: unknown;
		if (url.pathname === "/sports")
			response = {
				sports: [
					{ id: 2, slug: "tennis", name: "Tennis" },
					{ id: 23, slug: "golf", name: "Golf" },
				],
			};
		else if (url.pathname === "/matches/odds") {
			const id = url.searchParams.get("match");
			response = {
				markets:
					id === "event000"
						? []
						: [
								{
									bet_type: "HOME_AWAY",
									bet_scope: "FULL_TIME",
									bookmaker: { name: "Test" },
									selections: [
										{
											selection: "home",
											value: 1.8,
											is_active: id !== "event001",
										},
										{
											selection: "away",
											value: 2.1,
											is_active: id !== "event001",
										},
									],
								},
							],
			};
		} else if (url.pathname === "/matches/details")
			response = { ...fixtures[2], sport: { name: "Tennis" } };
		else
			response = {
				sport: { name: "Tennis" },
				competitions: [
					{
						competition: { name: "ATP Test", country: { name: "Test" } },
						matches: fixtures,
					},
				],
			};
		return response as T;
	});
	const catalog = await client.getSports();
	assert.equal(catalog.sports[1]?.format, "leaderboard");
	const first = await client.getPricedMatches({ sport: "tennis", cursor: 0 });
	assert.equal(first.matches.length, 28);
	assert.equal(first.matches[0]?.sport, "Tennis");
	assert.equal(first.nextCursor, 30);
	assert.equal(first.checked, 30);
	const count = calls.length;
	assert.deepEqual(
		await client.getPricedMatches({ sport: "tennis", cursor: 0 }),
		first,
	);
	assert.equal(calls.length, count);
	assert.ok(calls.some((path) => path.includes("day=2")));
	assert.ok(calls.some((path) => path.includes("day=-1")));
	const next = await client.getPricedMatches({ sport: "tennis", cursor: 30 });
	assert.equal(next.matches.length, 5);
	assert.equal(next.nextCursor, null);
	assert.ok(
		calls
			.filter((path) => path.startsWith("/matches?"))
			.every((path) => path.includes("sport=tennis")),
	);
	const detail = await client.getMatches({ ids: ["event002"] });
	assert.equal(detail.matches[0]?.sport, "Tennis");
	await assert.rejects(
		() => client.getMatches({ sport: "fake" }),
		/Unknown sport/,
	);
});

test("live schedule entries are verified against the current core before prices are offered", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	let priceCalls = 0;
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		if (path === "/sports")
			return { sports: [{ id: 1, slug: "football", name: "Football" }] } as T;
		if (path.startsWith("/matches/status"))
			return {
				status: "finished",
				stage: "Finished",
				home_score: 2,
				away_score: 1,
				start_time: new Date(Date.now() - 7200_000).toISOString(),
			} as T;
		if (path.startsWith("/matches/odds")) {
			priceCalls++;
			throw new Error("No prices for a finished event");
		}
		return {
			sport: { name: "Football" },
			competitions: [
				{
					matches: [
						{
							id: "final001",
							status: "live",
							start_time: new Date(Date.now() - 7200_000).toISOString(),
							home: { name: "Home" },
							away: { name: "Away" },
						},
					],
				},
			],
		} as T;
	});
	const page = await client.getPricedMatches({ sport: "football", cursor: 0 });
	assert.equal(page.matches[0]?.status, "RESULTED");
	assert.deepEqual(page.matches[0]?.score, { home: 2, away: 1 });
	assert.equal(priceCalls, 0);
});

test("day filters include both future days and retain only results within 24 hours", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	const now = Date.now();
	const fixture = (
		id: string,
		offset: number,
		status = "scheduled",
		endOffset?: number,
	) => ({
		id,
		status,
		start_time: new Date(now + offset).toISOString(),
		end_time:
			endOffset === undefined
				? undefined
				: new Date(now + endOffset).toISOString(),
		home: { name: "Home" },
		away: { name: "Away" },
		home_score: status === "finished" ? 2 : null,
		away_score: status === "finished" ? 1 : null,
	});
	const fixtures = [
		fixture("nextday1", 86400_000),
		fixture("nextday2", 2 * 86400_000),
		fixture("recent01", -5 * 3600_000, "finished", -3 * 3600_000),
		fixture("oldgame1", -28 * 3600_000, "finished", -25 * 3600_000),
	];
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		if (path === "/sports")
			return { sports: [{ id: 1, slug: "football", name: "Football" }] } as T;
		if (path.startsWith("/matches/odds"))
			return {
				markets: [
					{
						bet_type: "HOME_DRAW_AWAY",
						bet_scope: "FULL_TIME",
						selections: [{ selection: "home", value: 2, is_active: true }],
					},
				],
			} as T;
		return {
			sport: { name: "Football" },
			competitions: [{ matches: fixtures }],
		} as T;
	});
	assert.deepEqual(
		(
			await client.getPricedMatches({ sport: "football", day: 1, cursor: 0 })
		).matches.map((m) => m.id),
		["nextday1"],
	);
	assert.deepEqual(
		(
			await client.getPricedMatches({ sport: "football", day: 2, cursor: 0 })
		).matches.map((m) => m.id),
		["nextday2"],
	);
	const recent = (
		await client.getPricedMatches({ sport: "football", day: -1, cursor: 0 })
	).matches;
	assert.deepEqual(
		recent.map((m) => m.id),
		["recent01"],
	);
	assert.deepEqual(recent[0]?.score, { home: 2, away: 1 });
});

test("past scheduled events stay closed while recent results remain visible", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	const past = new Date(Date.now() - 4 * 3600_000).toISOString();
	const fixtures = ["scheduled", "finished", "mystery"].map(
		(status, index) => ({
			id: `closed0${index}`,
			status,
			start_time: past,
			home: { name: "Home" },
			away: { name: "Away" },
		}),
	);
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		const url = new URL(path, "http://test");
		if (url.pathname === "/sports")
			return { sports: [{ id: 1, slug: "football", name: "Football" }] } as T;
		if (url.pathname === "/matches/details")
			return { ...fixtures[0], sport: { name: "Football" } } as T;
		if (url.pathname === "/matches/odds") return { markets: [] } as T;
		return {
			sport: { name: "Football" },
			competitions: [{ matches: fixtures }],
		} as T;
	});
	assert.equal(
		(await client.getPricedMatches({ sport: "football", cursor: 0 })).matches[0]
			?.status,
		"RESULTED",
	);
	assert.equal(
		(await client.getMatches({ ids: ["closed00"] })).matches[0]?.status,
		"AWAITING_RESULTS",
	);
	assert.equal(
		(await client.getResults(["closed00"], { fresh: true })).results[0]?.status,
		"AWAITING_RESULTS",
	);
});

test("live discovery and team search filter the entire schedule before pagination", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	const now = Date.now();
	const live = {
		id: "estlive1",
		home: { name: "Espérance Tunis" },
		away: { name: "Opponent" },
		status: "live",
		start_time: new Date(now - 3600_000).toISOString(),
	};
	const upcoming = Array.from({ length: 40 }, (_, i) => ({
		id: `next${String(i).padStart(4, "0")}`,
		home: { name: "Other" },
		away: { name: "Team" },
		status: "scheduled",
		start_time: new Date(now + 3600_000).toISOString(),
	}));
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		const url = new URL(path, "http://test");
		if (url.pathname === "/sports")
			return { sports: [{ id: 1, slug: "football", name: "Football" }] } as T;
		if (url.pathname === "/matches/status")
			return {
				...live,
				stage: "Second Half",
				home_score: 1,
				away_score: 0,
			} as T;
		if (url.pathname === "/matches/odds")
			return {
				markets: [
					{
						bookmaker: { name: "Other Book" },
						bet_type: "HOME_DRAW_AWAY",
						bet_scope: "FULL_TIME",
						selections: [{ selection: "home", value: 2 }],
					},
				],
			} as T;
		if (url.pathname === "/matches/live")
			assert.equal(url.searchParams.get("timezone"), "1");
		return {
			sport: { name: "Football" },
			competitions: [{ matches: [...upcoming, live, live] }],
		} as T;
	});
	const all = await client.getPricedMatches({ sport: "football", cursor: 0 });
	assert.equal(all.matches[0]?.id, live.id);
	assert.equal(all.matches.filter((match) => match.id === live.id).length, 1);
	const filtered = await client.getPricedMatches({
		sport: "football",
		cursor: 0,
		liveOnly: true,
	});
	assert.deepEqual(
		filtered.matches.map((match) => match.id),
		[live.id],
	);
	assert.equal(filtered.nextCursor, null);
	const search = await client.getPricedMatches({
		sport: "football",
		cursor: 0,
		query: "esperance tunis",
	});
	assert.deepEqual(
		search.matches.map((match) => match.id),
		[live.id],
	);
	assert.equal(search.nextCursor, null);
});

test("regional odds union retains every bookmaker and line without duplicate or resurrected offers", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	const geos: string[] = [];
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		const geo = new URL(path, "http://test").searchParams.get("geo");
		geos.push(geo ?? "");
		const home = {
			selection: { value: "home" },
			value: 2,
			is_active: geo !== "TN",
		};
		const shared = {
			bookmaker: { name: "1xBet" },
			bet_type: "HOME_DRAW_AWAY",
			bet_scope: "FULL_TIME",
			selections: [
				home,
				home,
				{ selection: "draw", value: 3 },
				{ selection: "away", value: 4 },
			],
		};
		return {
			markets: [
				shared,
				shared,
				...(geo === "GB"
					? [{ ...shared, bookmaker: { name: "Another Book" } }]
					: []),
				{
					bookmaker: { name: "1xBet" },
					bet_type: "OVER_UNDER",
					bet_scope: "FULL_TIME",
					selections: [
						{ selection: "over", handicap: 2.5, value: 1.9 },
						{ selection: "over", handicap: 3.5, value: 2.5 },
					],
				},
			],
		} as T;
	});
	const snapshot = (await client.getOdds(["estlive1", "estlive1"])).odds
		.estlive1;
	assert.deepEqual(geos, ["TN", "GB"]);
	assert.equal(snapshot?.markets.length, 3);
	assert.equal(
		snapshot?.markets.find(
			(m) => m.bookmaker === "1xBet" && m.betType === "HOME_DRAW_AWAY",
		)?.selections.length,
		3,
	);
	assert.equal(snapshot?.markets[0]?.selections[0]?.active, false);
	assert.equal(
		snapshot?.markets.find((m) => m.betType === "OVER_UNDER")?.selections
			.length,
		2,
	);
	assert.ok(snapshot?.markets.some((m) => m.bookmaker === "Another Book"));
	await client.getOdds(["estlive1"]);
	assert.equal(geos.length, 2);
});

test("an unavailable regional catalogue does not hide odds from a healthy catalogue", async () => {
	loadEnvFile(new URL("../../.env", import.meta.url));
	process.env.VERCEL = "1";
	const { FlashscoreClient } = await import("./flashscore");
	const client = new FlashscoreClient(async <T>(path: string): Promise<T> => {
		if (path.includes("geo=TN")) throw new Error("Unavailable");
		return {
			markets: [
				{
					bookmaker: { name: "Alternative" },
					bet_type: "HOME_AWAY",
					bet_scope: "FULL_TIME",
					selections: [{ selection: "home", value: 2 }],
				},
			],
		} as T;
	});
	assert.equal(
		(await client.getOdds(["estlive1"])).odds.estlive1?.markets[0]?.bookmaker,
		"Alternative",
	);
});
