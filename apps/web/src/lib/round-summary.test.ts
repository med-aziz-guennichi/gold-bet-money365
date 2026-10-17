import assert from "node:assert/strict";
import test from "node:test";
import { roundSummary } from "./round-summary";

test("result summary distinguishes net wins, losses, refunds and partial returns", () => {
	const outcome = (n: number) => ({
		symbols: [],
		detail: "",
		multiplierHundredths: n,
	});
	assert.equal(roundSummary(1000, outcome(196)).title, "You won");
	assert.equal(roundSummary(1000, outcome(0)).title, "No return this round");
	assert.equal(roundSummary(1000, outcome(100)).title, "Stake returned");
	assert.equal(roundSummary(1000, outcome(50)).title, "Partial return");
	assert.equal(roundSummary(101, outcome(195)).returned, 196);
});
