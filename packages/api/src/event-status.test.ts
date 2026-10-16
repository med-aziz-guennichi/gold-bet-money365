import assert from "node:assert/strict";
import { test } from "node:test";
import { currentEventStatus } from "./event-status";

test("kickoff closes pre-match offers without inventing a live status", () => {
	const now = Date.parse("2026-10-16T19:00:00Z");
	assert.equal(
		currentEventStatus("TRADING", "2026-10-16T17:00:00Z", now),
		"AWAITING_RESULTS",
	);
	assert.equal(
		currentEventStatus("TRADING", "2026-10-16T19:00:00Z", now),
		"AWAITING_RESULTS",
	);
	assert.equal(
		currentEventStatus("TRADING", "invalid", now),
		"AWAITING_RESULTS",
	);
	assert.equal(
		currentEventStatus("TRADING", "2026-10-16T20:00:00Z", now),
		"TRADING",
	);
	assert.equal(
		currentEventStatus("TRADING_LIVE", "2026-10-16T17:00:00Z", now),
		"TRADING_LIVE",
	);
	assert.equal(
		currentEventStatus("RESULTED", "2026-10-16T17:00:00Z", now),
		"RESULTED",
	);
});
