import assert from "node:assert/strict";
import { test } from "node:test";
import {
	currencies,
	currencyOf,
	formatAmount,
	formatTnd,
	parseTnd,
} from "./money";

test("TND amounts use exact integer millimes", () => {
	assert.equal(parseTnd("100000"), 100_000_000);
	assert.equal(parseTnd("5000.125"), 5_000_125);
	assert.equal(parseTnd("0.001"), 1);
	assert.equal(parseTnd("0"), 0);
	assert.equal(formatTnd(100_000_001), "100,000.001 TND");
	assert.equal(formatTnd(-1_125), "−1.125 TND");
	assert.equal(formatTnd(-1), "−0.001 TND");
	for (const value of [
		"-1",
		"NaN",
		"Infinity",
		"1e3",
		"0.0001",
		"1,000",
		"",
		"1.2.3",
		"1000000001",
		"01",
	])
		assert.throws(() => parseTnd(value), value);
});

test("denominations preserve integer credit precision and default to TND", () => {
	assert.equal(currencyOf(), "TND");
	for (const currency of currencies) {
		assert.equal(
			formatAmount(parseTnd("1234.005"), currency),
			`1,234.005 ${currency}`,
		);
		assert.equal(formatAmount(-1, currency), `−0.001 ${currency}`);
	}
});
