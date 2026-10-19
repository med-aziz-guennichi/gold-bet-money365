import assert from "node:assert/strict";
import { test } from "node:test";
import { CASINO_VERSION } from "./casino-catalog";
import { casinoInputSchema } from "./casino-input";
import { dicePoker, playOriginal, threeCard } from "./original-engines";
import { originalGames } from "./original-games";

test("all new games pass authoritative input validation", () => {
	for (const game of originalGames)
		assert.equal(
			casinoInputSchema.safeParse({
				game: game.id,
				requestId: "7dcb87db-1fd3-457a-8eb8-c01549dc607a",
				version: CASINO_VERSION,
				stake: "1.000",
				choice: game.choices[0],
				numbers: [],
			}).success,
			true,
		);
});
test("Poker Dice exact distribution agrees with published return", () => {
	let sum = 0;
	let count = 0;
	for (let value = 0; value < 7776; value++) {
		let n = value;
		const dice = [];
		for (let i = 0; i < 5; i++) {
			dice.push((n % 6) + 1);
			n = Math.floor(n / 6);
		}
		sum += dicePoker(dice)[1];
		count++;
	}
	assert.equal(count, 7776);
	assert.equal(sum, 756000);
	assert.ok(Math.abs(sum / count / 100 - 0.9722222222) < 1e-9);
});
test("Three Card Studio exhausts all 22100 hands and handles ace boundaries", () => {
	let sum = 0;
	let count = 0;
	for (let a = 0; a < 50; a++)
		for (let b = a + 1; b < 51; b++)
			for (let c = b + 1; c < 52; c++) {
				sum += threeCard([a, b, c])[1];
				count++;
			}
	assert.equal(count, 22100);
	assert.equal(sum, 2049200);
	assert.equal(threeCard([0, 1, 2])[0], "Straight flush");
	assert.equal(threeCard([0, 11, 12])[0], "Straight flush");
	assert.equal(threeCard([0, 1, 12])[0], "Flush");
});
test("Scratch Nine tickets match their probabilities and displayed prizes", () => {
	let sum = 0;
	for (let value = 0; value < 10000; value++) {
		let first = true;
		const outcome = playOriginal("scratch-nine", "ticket", (max) => {
			if (first) {
				first = false;
				return value;
			}
			return max - 1;
		});
		sum += outcome.multiplierHundredths;
		assert.equal(outcome.symbols.length, 9);
		const prize = `${outcome.multiplierHundredths / 100}×`;
		assert.equal(
			outcome.symbols.filter((s) => s === prize).length,
			outcome.multiplierHundredths ? 3 : 0,
		);
	}
	assert.equal(sum, 990000);
});
test("every duel choice and seven choice has the documented expected return", () => {
	for (const choice of ["rock", "paper", "scissors"]) {
		let sum = 0;
		for (let roll = 0; roll < 3; roll++)
			sum += playOriginal("hand-duel", choice, () => roll).multiplierHundredths;
		assert.equal(sum, 294);
	}
	for (const choice of ["under", "over", "seven"]) {
		let sum = 0;
		for (let a = 0; a < 6; a++)
			for (let b = 0; b < 6; b++) {
				let turn = 0;
				sum += playOriginal("lucky-seven", choice, () =>
					turn++ === 0 ? a : b,
				).multiplierHundredths;
			}
		assert.equal(sum, choice === "seven" ? 3528 : 3525);
	}
});
