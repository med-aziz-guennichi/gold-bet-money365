import assert from "node:assert/strict";
import { test } from "node:test";
import { marketRestriction } from "./market-availability";

test("selectable odds match the server's sport, status and live-market restrictions", () => {
	const winner = {
		betType: "HOME_AWAY",
		scope: "FULL_TIME",
		hasLiveBetting: true,
	};
	assert.equal(marketRestriction("Tennis", "TRADING", winner), null);
	assert.equal(marketRestriction("Tennis", "TRADING_LIVE", winner), null);
	assert.match(
		marketRestriction("Tennis", "TRADING", {
			...winner,
			scope: "FIRST_HALF",
		}) ?? "",
		/View only/,
	);
	assert.match(
		marketRestriction("Tennis", "TRADING", {
			...winner,
			betType: "OVER_UNDER",
		}) ?? "",
		/View only/,
	);
	assert.match(
		marketRestriction("Football", "TRADING_LIVE", {
			...winner,
			hasLiveBetting: false,
		}) ?? "",
		/live bets/,
	);
	assert.match(marketRestriction("Tennis", "RESULTED", winner) ?? "", /closed/);
});
