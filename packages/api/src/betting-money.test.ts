import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateBetReturn } from "./betting-money";

test("returns are calculated exactly and rounded down only once", () => {
	assert.deepEqual(calculateBetReturn(10_125, ["2.00"]), {
		potentialReturnMillimes: 20_250,
		totalOdds: 2,
	});
	assert.equal(
		calculateBetReturn(1, ["1.50", "1.50"]).potentialReturnMillimes,
		2,
	);
	assert.equal(
		calculateBetReturn(100_001, ["1.23", "2.34"]).potentialReturnMillimes,
		287_822,
	);
	for (const price of ["9999.99", "1.00", "NaN", "0.00", "-2.00", "2.001"])
		assert.throws(() => calculateBetReturn(1000, [price]));
	assert.throws(() => calculateBetReturn(-1, ["2.00"]));
	assert.throws(() => calculateBetReturn(1000, []));
	assert.throws(() => calculateBetReturn(1_000_000_000_000, ["2.00"]));
});
