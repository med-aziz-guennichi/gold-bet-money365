import assert from "node:assert/strict";
import test from "node:test";
import * as dino from "@gold-bet-clean-money365/casino-dino/engine";

test("Dino conceals its future collision and requires a successful jump to collect", () => {
	const initial = dino.create(() => 99, 0);
	assert.equal(initial.state.kind, "dino");
	assert.equal("collisionAt" in dino.view(initial.state, false, 0), false);
	assert.throws(() => dino.act(initial.state, { type: "cashout" }, 0), /jump/);
	assert.equal(
		dino.act(initial.state, { type: "jump" }, 0).outcome?.multiplierHundredths,
		0,
	);
});
test("Dino successful jumps collect exact returns and stop at twenty", () => {
	let state = dino.create(() => 0, 0).state;
	const first = dino.act(state, { type: "jump" }, 0);
	assert.equal(
		dino.act(first.state, { type: "cashout" }, 0).outcome?.multiplierHundredths,
		120,
	);
	assert.throws(
		() => dino.act(first.state, { type: "reveal", index: 0 }, 0),
		/jump/,
	);
	for (let i = 0; i < 20; i++) {
		const next = dino.act(state, { type: "jump" }, 0);
		assert.equal(!!next.outcome, i === 19);
		state = next.state;
	}
	assert.equal(dino.multiplier(2), 144);
	assert.equal(dino.multiplier(20), 3833);
});
