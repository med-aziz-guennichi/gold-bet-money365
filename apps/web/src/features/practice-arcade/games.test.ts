import assert from "node:assert/strict";
import test from "node:test";
import { arcadeGames, pockets } from "./games";

test("practice catalog has exactly the three unique arcade games", () => {
	assert.deepEqual(
		arcadeGames.map((g) => g.id),
		["crash", "plinko", "mines"],
	);
});
test("all 256 Plinko paths map to the actual engine multipliers", () => {
	assert.equal(pockets[0], 16);
	assert.equal(pockets[4], 0.2);
	for (let bits = 0; bits < 256; bits++) {
		const bin = bits.toString(2).replaceAll("0", "").length;
		assert.ok(Number.isFinite(pockets[bin]));
		assert.equal(pockets[bin], pockets[8 - bin]);
	}
});
