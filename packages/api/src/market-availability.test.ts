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

test("football offers only accept markets and lines implemented by settlement", () => {
	const base = { scope: "FULL_TIME", hasLiveBetting: true };
	for (const betType of [
		"ASIAN_HANDICAP",
		"HALF_FULL_TIME",
		"DRAW_NO_BET",
		"ODD_OR_EVEN",
	])
		assert.match(
			marketRestriction("Football", "TRADING", { ...base, betType }) ?? "",
			/View only/,
		);
	assert.match(
		marketRestriction("Football", "TRADING", {
			...base,
			betType: "HOME_DRAW_AWAY",
			scope: "FIRST_HALF",
		}) ?? "",
		/View only/,
	);
	for (const line of ["2.25", "2.75", "invalid"])
		assert.match(
			marketRestriction("Football", "TRADING", {
				...base,
				betType: "OVER_UNDER",
				selection: "over",
				handicap: line,
			}) ?? "",
			/View only/,
		);
	for (const line of ["2", "2.5", "3.0"])
		assert.equal(
			marketRestriction("Football", "TRADING", {
				...base,
				betType: "OVER_UNDER",
				selection: "over",
				handicap: line,
			}),
			null,
		);
	assert.match(
		marketRestriction("Football", "TRADING", {
			...base,
			betType: "BOTH_TEAMS_TO_SCORE",
			selection: "Unknown",
		}) ?? "",
		/View only/,
	);
});
