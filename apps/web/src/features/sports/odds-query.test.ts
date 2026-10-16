import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { oddsQueryOptions } from "./odds-query";

test("rerenders, fixture reorderings, and remounts share one odds request", async () => {
	const client = new QueryClient();
	let calls = 0;
	let finish!: (value: string) => void;
	const load = () => {
		calls++;
		return new Promise<string>((resolve) => {
			finish = resolve;
		});
	};
	const first = new QueryObserver(client, oddsQueryOptions(["b", "a"], load));
	const unsubscribe = first.subscribe(() => {});
	unsubscribe();
	const remounted = new QueryObserver(
		client,
		oddsQueryOptions(["a", "b", "a"], load),
	);
	const stop = remounted.subscribe(() => {});
	for (let i = 0; i < 20; i++) {
		remounted.setOptions(oddsQueryOptions(["b", "a"], load));
	}
	assert.equal(calls, 1);
	finish("prices");
	assert.equal(
		await client.fetchQuery(oddsQueryOptions(["a", "b"], load)),
		"prices",
	);
	assert.equal(
		await client.fetchQuery(oddsQueryOptions(["b", "a"], load)),
		"prices",
	);
	assert.equal(calls, 1);
	assert.equal(remounted.options.refetchInterval, false);
	stop();
	client.clear();
});

test("different visible matches fetch separately", async () => {
	const client = new QueryClient();
	const loaded: string[][] = [];
	const load = async (ids: string[]) => {
		loaded.push(ids);
		return ids;
	};
	await client.fetchQuery(oddsQueryOptions(["a"], load));
	await client.fetchQuery(oddsQueryOptions(["b"], load));
	await client.fetchQuery(oddsQueryOptions(["a"], load));
	assert.deepEqual(loaded, [["a"], ["b"]]);
	client.clear();
});
