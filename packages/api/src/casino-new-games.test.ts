import assert from "node:assert/strict";
import test from "node:test";
import { casinoGames } from "./casino-catalog";
import { playCasino } from "./casino-engine";

test("catalog has fifteen unique games, five additions, and no Dino", () => {
	assert.equal(casinoGames.length, 15);
	assert.equal(new Set(casinoGames.map((g) => g.id)).size, 15);
	assert.equal(
		casinoGames.some((g) => String(g.id) === "dino"),
		false,
	);
	for (const id of ["coin", "dice", "keno", "wheel", "limbo"])
		assert.ok(casinoGames.some((g) => g.id === id));
});
test("coin and dice publish exactly the outcomes used for settlement", () => {
	let returns = 0;
	for (let n = 0; n < 100; n++)
		returns += playCasino("dice", "under", [], () => n).multiplierHundredths;
	assert.equal(returns, 9800);
	assert.equal(
		playCasino("coin", "heads", [], () => 0).multiplierHundredths,
		196,
	);
	assert.equal(
		playCasino("coin", "heads", [], () => 1).multiplierHundredths,
		0,
	);
});
test("Keno rejects invalid selections and draws five distinct numbers", () => {
	for (const numbers of [[], [1, 1, 2], [0, 2, 3], [1, 2, 21]])
		assert.throws(() => playCasino("keno", "play", numbers, () => 0));
	const win = playCasino("keno", "play", [1, 2, 3], () => 0);
	assert.deepEqual(win.symbols, ["1", "2", "3", "4", "5"]);
	assert.equal(win.multiplierHundredths, 6500);
	assert.equal(
		playCasino("keno", "play", [1, 2, 20], () => 0).multiplierHundredths,
		300,
	);
});
test("wheel has twenty valid visible sectors and a fixed 90% average return", () => {
	let sum = 0;
	for (let sector = 0; sector < 20; sector++) {
		const r = playCasino("wheel", "spin", [], () => sector);
		assert.deepEqual(r.path, [sector]);
		sum += r.multiplierHundredths;
	}
	assert.equal(sum, 1800);
});
test("Limbo threshold outcomes match each selected target", () => {
	for (const target of [2, 5, 10]) {
		const threshold = 1000000 - 970000 / target;
		assert.equal(
			playCasino("limbo", String(target), [], () => threshold - 1)
				.multiplierHundredths,
			0,
		);
		assert.equal(
			playCasino("limbo", String(target), [], () => threshold)
				.multiplierHundredths,
			target * 100,
		);
	}
	assert.throws(() => playCasino("limbo", "999", [], () => 0));
});
