import assert from "node:assert/strict";
import { test } from "node:test";
import * as blackjack from "@gold-bet-clean-money365/casino-blackjack/engine";
import type { GameState } from "@gold-bet-clean-money365/casino-core";
import * as crash from "@gold-bet-clean-money365/casino-crash/engine";
import * as mines from "@gold-bet-clean-money365/casino-mines/engine";
import * as poker from "@gold-bet-clean-money365/casino-video-poker/engine";

test("blackjack aces, dealer stand, natural priority, hit and bust", () => {
	assert.equal(blackjack.total([0, 13, 8]), 21);
	assert.equal(blackjack.total([0, 9]), 21);
	assert.equal(blackjack.total([0, 13, 26]), 13);
	const state: GameState = {
		kind: "blackjack",
		player: [9, 6],
		dealer: [9, 5],
		deck: [1],
	};
	assert.deepEqual(blackjack.view(state, false, 0).dealer, ["10♠", "hidden"]);
	const won = blackjack.act(state, { type: "stand" }, 0);
	assert.equal(won.outcome?.multiplierHundredths, 0); // Dealer draws to 18, beats 17.
	const bust = blackjack.act(
		{ ...state, player: [9, 8], deck: [5] },
		{ type: "hit" },
		0,
	);
	assert.equal(bust.outcome?.multiplierHundredths, 0);
	const hit = blackjack.act(
		{ ...state, player: [1, 2], deck: [3] },
		{ type: "hit" },
		0,
	);
	assert.equal(hit.outcome, undefined);
	assert.equal(
		blackjack.total(hit.state.kind === "blackjack" ? hit.state.player : []),
		9,
	);
	assert.throws(
		() => blackjack.act(state, { type: "cashout" }, 0),
		/hit or stand/,
	);
});
test("mines hide positions, reject duplicate reveals, and pay the probability table", () => {
	const state: GameState = { kind: "mines", mines: [0, 1, 2], revealed: [] };
	assert.deepEqual(mines.view(state, false, 0).mines, []);
	assert.throws(() => mines.act(state, { type: "cashout" }, 0), /safe tile/);
	const safe = mines.act(state, { type: "reveal", index: 3 }, 0);
	assert.equal(safe.outcome, undefined);
	assert.equal(mines.multiplier(1), 110);
	const cash = mines.act(safe.state, { type: "cashout" }, 0);
	assert.equal(cash.outcome?.multiplierHundredths, 110);
	assert.throws(
		() => mines.act(safe.state, { type: "reveal", index: 3 }, 0),
		/unrevealed/,
	);
	assert.equal(
		mines.act(state, { type: "reveal", index: 0 }, 0).outcome
			?.multiplierHundredths,
		0,
	);
	assert.equal(mines.multiplier(22), 223100);
	const nearEnd: GameState = {
		kind: "mines",
		mines: [0, 1, 2],
		revealed: Array.from({ length: 21 }, (_, i) => i + 3),
	};
	assert.equal(
		mines.act(nearEnd, { type: "reveal", index: 24 }, 0).outcome
			?.multiplierHundredths,
		223100,
	);
});
test("crash cash-out is time-authoritative and never exposes its hidden point", () => {
	const start = 100000;
	const made = crash.create(() => 500000, start);
	assert.equal(made.state.kind, "crash");
	assert.equal(made.outcome, undefined);
	assert.equal("bustAt" in crash.view(made.state, false, start), false);
	assert.equal("bustHundredths" in crash.view(made.state, false, start), false);
	const early = crash.act(made.state, { type: "cashout" }, start + 100);
	assert.ok(early.outcome);
	assert.ok(early.outcome.multiplierHundredths >= 100);
	const late = crash.act(made.state, { type: "cashout" }, start + 100000);
	assert.equal(late.outcome?.multiplierHundredths, 0);
	assert.equal(crash.create(() => 0, start).outcome?.multiplierHundredths, 0);
	const cap = crash.create(() => 999999, start);
	assert.equal(
		crash.act(cap.state, { type: "cashout" }, start + 100000).outcome
			?.multiplierHundredths,
		10000,
	);
});
test("video poker evaluates every hand category, including low-ace straight", () => {
	const cases: [number[], string, number][] = [
		[[0, 9, 10, 11, 12], "Royal flush", 80000],
		[[1, 2, 3, 4, 5], "Straight flush", 5000],
		[[0, 13, 26, 39, 5], "Four of a kind", 2500],
		[[0, 13, 26, 1, 14], "Full house", 900],
		[[0, 2, 5, 8, 12], "Flush", 600],
		[[0, 14, 28, 42, 4], "Straight", 400],
		[[0, 13, 26, 5, 7], "Three of a kind", 300],
		[[0, 13, 1, 14, 8], "Two pairs", 200],
		[[10, 23, 1, 5, 7], "Jacks or better", 100],
		[[1, 14, 3, 5, 8], "No qualifying hand", 0],
	];
	for (const [cards, name, pay] of cases)
		assert.deepEqual(poker.evaluate(cards), { name, pay });
	const state: GameState = {
		kind: "video-poker",
		cards: [0, 9, 10, 11, 1],
		deck: [12, 6, 7, 8, 3],
	};
	assert.throws(
		() => poker.act(state, { type: "draw", holds: [0, 0] }, 0),
		/held cards/,
	);
	const drawn = poker.act(state, { type: "draw", holds: [0, 1, 2, 3] }, 0);
	assert.ok(drawn.state.kind === "video-poker");
	assert.deepEqual(drawn.state.cards.slice(0, 4), state.cards.slice(0, 4));
	assert.equal(drawn.state.cards[4], 3);
});
