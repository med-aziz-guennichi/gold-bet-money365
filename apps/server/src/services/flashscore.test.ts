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
