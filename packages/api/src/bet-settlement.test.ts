import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluatePick, settleReturns } from "./bet-settlement";
import type { AcceptedBetPick } from "./betting";
import type { FootballMatchResult } from "./football";

const pick: AcceptedBetPick = {
	matchId: "match001",
	home: "Home",
	away: "Away",
	league: "League",
	kickoff: new Date().toISOString(),
	odd: "2.25",
	market: {
		type: "HOME_DRAW_AWAY",
		scope: "FULL_TIME",
		selection: "home",
		bookmaker: "Test",
	},
};
const final: FootballMatchResult = {
	id: "match001",
	status: "RESULTED",
	score: { home: 2, away: 1 },
	regulationScore: { home: 2, away: 1 },
};

test("other sports settle verified full-match winners without applying football score rules", () => {
	const tennis: AcceptedBetPick = {
		...pick,
		sport: "Tennis",
		market: { ...pick.market, type: "HOME_AWAY" },
	};
	const result: FootballMatchResult = {
		...final,
		sport: "Tennis",
		winner: "home",
		completedNormally: true,
		regulationScore: null,
	};
	assert.equal(evaluatePick(tennis, result), "won");
	assert.equal(
		evaluatePick(
			{ ...tennis, market: { ...tennis.market, selection: "away" } },
			result,
		),
		"lost",
	);
	assert.equal(
		evaluatePick(tennis, { ...result, completedNormally: false }),
		"review",
	);
	assert.equal(
		evaluatePick(tennis, { ...result, sport: "Basketball" }),
		"review",
	);
	assert.equal(evaluatePick(tennis, { ...result, winner: null }), "review");
	assert.equal(
		evaluatePick(
			{ ...tennis, market: { ...tennis.market, type: "OVER_UNDER" } },
			result,
		),
		"review",
	);
});
test("settlement waits for final regulation scores and never guesses unavailable markets", () => {
	assert.equal(evaluatePick(pick, undefined), "waiting");
	assert.equal(
		evaluatePick(pick, { ...final, status: "TRADING_LIVE" }),
		"waiting",
	);
	assert.equal(
		evaluatePick(pick, { ...final, regulationScore: null }),
		"review",
	);
	assert.equal(evaluatePick(pick, { ...final, status: "CANCELLED" }), "review");
	assert.equal(
		evaluatePick(
			{ ...pick, market: { ...pick.market, scope: "FIRST_HALF" } },
			final,
		),
		"review",
	);
	assert.equal(evaluatePick(pick, final), "won");
	assert.equal(
		evaluatePick(
			{ ...pick, market: { ...pick.market, selection: "draw" } },
			final,
		),
		"lost",
	);
});
test("goal markets, pushes and accumulators settle exact millimes", () => {
	const over = {
		...pick,
		market: {
			...pick.market,
			type: "OVER_UNDER",
			selection: "Over",
			handicap: "3",
		},
	};
	assert.equal(evaluatePick(over, final), "void");
	assert.equal(
		evaluatePick(
			{ ...over, market: { ...over.market, handicap: "2.5" } },
			final,
		),
		"won",
	);
	assert.equal(
		evaluatePick(
			{ ...over, market: { ...over.market, handicap: "2.25" } },
			final,
		),
		"review",
	);
	assert.equal(
		evaluatePick(
			{
				...pick,
				market: {
					...pick.market,
					type: "BOTH_TEAMS_TO_SCORE",
					selection: "yes",
				},
			},
			final,
		),
		"won",
	);
	assert.equal(
		evaluatePick(
			{
				...pick,
				market: { ...pick.market, type: "CORRECT_SCORE", selection: "2:1" },
			},
			final,
		),
		"won",
	);
	assert.deepEqual(settleReturns(1001, [pick, over], ["won", "void"]), {
		status: "Won",
		payoutMillimes: 2252,
	});
	assert.deepEqual(settleReturns(1001, [over], ["void"]), {
		status: "Void",
		payoutMillimes: 1001,
	});
	assert.deepEqual(settleReturns(1001, [pick], ["lost"]), {
		status: "Lost",
		payoutMillimes: 0,
	});
	assert.equal(settleReturns(1001, [pick, over], ["won", "waiting"]), null);
});
