import assert from "node:assert/strict";
import { test } from "node:test";
import { betHistoryInput } from "./bet-history";

test("history filters reject invalid ranges, forged ownership, and oversized requests", () => {
	assert.deepEqual(betHistoryInput.parse({}), { page: 1, limit: 10 });
	for (const value of [
		{ userId: "someone-else" },
		{ limit: 51 },
		{ page: 0 },
		{ status: "Paid" },
		{ query: "x".repeat(81) },
		{ minStake: "-1" },
		{ minStake: "1e3" },
		{ minStake: "bad", maxStake: "2" },
		{ minStake: "2.001", maxStake: "2" },
		{ from: "2025-02-30T00:00:00Z" },
		{ from: "2025-02-01T00:00:00Z", to: "2025-01-01T00:00:00Z" },
	])
		assert.equal(
			betHistoryInput.safeParse(value).success,
			false,
			JSON.stringify(value),
		);
	assert.equal(
		betHistoryInput.safeParse({ minStake: "0", maxStake: "0.001" }).success,
		true,
	);
	assert.equal(
		betHistoryInput.safeParse({
			from: "2025-01-01T00:00:00Z",
			to: "2025-01-01T00:00:00.999Z",
		}).success,
		true,
	);
});
