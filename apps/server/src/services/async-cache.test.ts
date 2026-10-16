import assert from "node:assert/strict";
import { test } from "node:test";
import { AsyncCache } from "./async-cache";

test("acceptance can bypass cached display odds while concurrent refreshes deduplicate", async () => {
	const cache = new AsyncCache<number>(60_000, 2);
	let calls = 0;
	const load = async () => ++calls;
	assert.equal(await cache.get("match", load), 1);
	const refresh = cache.get("match", load, true);
	assert.equal(cache.get("match", load, true), refresh);
	assert.equal(await refresh, 2);
	assert.equal(await cache.get("match", load), 2);
	assert.equal(calls, 2);
});

test("shares concurrent loads and refreshes only after expiry", async () => {
	let now = 0;
	let calls = 0;
	const cache = new AsyncCache<number>(60, 2, 10, () => now);
	const load = async () => ++calls;
	const first = cache.get("match", load);
	assert.equal(cache.get("match", load), first);
	assert.deepEqual(
		await Promise.all([first, cache.get("match", load)]),
		[1, 1],
	);
	now = 59;
	assert.equal(await cache.get("match", load), 1);
	now = 60;
	assert.equal(await cache.get("match", load), 2);
});

test("briefly caches null results and retries rejected loads", async () => {
	let now = 0;
	let calls = 0;
	const cache = new AsyncCache<number | null>(60, 2, 10, () => now);
	const load = async () => {
		calls++;
		return null;
	};
	await cache.get("empty", load);
	now = 9;
	await cache.get("empty", load);
	assert.equal(calls, 1);
	now = 10;
	await cache.get("empty", load);
	assert.equal(calls, 2);
	await assert.rejects(
		cache.get("failed", async () => {
			throw new Error("offline");
		}),
	);
	assert.equal(await cache.get("failed", async () => 3), 3);
});

test("evicts the oldest entry when capacity is reached", async () => {
	const cache = new AsyncCache<number>(60, 2);
	await cache.get("a", async () => 1);
	await cache.get("b", async () => 2);
	await cache.get("c", async () => 3);
	assert.equal(await cache.get("b", async () => 99), 2);
	assert.equal(await cache.get("a", async () => 4), 4);
});
