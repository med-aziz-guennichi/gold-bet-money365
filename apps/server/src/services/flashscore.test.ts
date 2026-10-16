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
