import assert from "node:assert/strict";
import test from "node:test";
import {
	arcadeGames,
	crashPoint,
	makeMines,
	mineMultiplier,
	pockets,
	randomInt,
} from "./games";

test("practice catalog has exactly the four independently routed games", () => {
	assert.deepEqual(
		arcadeGames.map((g) => g.id),
		["crash", "plinko", "mines", "dino"],
	);
});
test("mine shuffle never duplicates tiles and does not reveal more than three mines", () => {
	for (let seed = 0; seed < 25; seed++) {
		const mines = makeMines((max) => seed % max);
		assert.equal(new Set(mines).size, 3);
		assert.ok(mines.every((n) => n >= 0 && n < 25));
	}
	assert.ok(mineMultiplier(1) > 1);
	assert.ok(mineMultiplier(22) > mineMultiplier(21));
});
test("all 256 Plinko paths map to a defined symmetric pocket", () => {
	for (let bits = 0; bits < 256; bits++) {
		const bin = bits.toString(2).replaceAll("0", "").length;
		assert.ok(Number.isFinite(pockets[bin]));
		assert.equal(pockets[bin], pockets[8 - bin]);
	}
});
test("crash boundary outcomes remain between one and the automatic collection cap", () => {
	assert.equal(
		crashPoint(() => 0),
		1,
	);
	assert.equal(
		crashPoint(() => 999999),
		50,
	);
	assert.throws(() => randomInt(0));
	assert.throws(() => randomInt(1.5));
});
