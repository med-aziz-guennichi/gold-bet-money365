import {
	type Action,
	type GameState,
	type GameView,
	type RandomInt,
	result,
	type Transition,
} from "@gold-bet-clean-money365/casino-core";
export function multiplier(steps: number) {
	return Number(
		(BigInt(100) * BigInt(6) ** BigInt(steps)) / BigInt(5) ** BigInt(steps),
	);
}
export function create(random: RandomInt, _now: number): Transition {
	let collisionAt = 21;
	for (let step = 1; step <= 20; step++) {
		if (random(100) >= 80) {
			collisionAt = step;
			break;
		}
	}
	return { state: { kind: "dino", steps: 0, collisionAt } };
}
export function act(
	previous: GameState,
	action: Action,
	_now: number,
): Transition {
	if (previous.kind !== "dino") throw new Error("Invalid Dino state");
	const state = { ...previous };
	if (action.type === "cashout") {
		if (state.steps < 1) throw new Error("Complete a jump before collecting");
		return {
			state,
			outcome: result(
				["DINO"],
				`${state.steps} jumps · collected`,
				multiplier(state.steps),
			),
		};
	}
	if (action.type !== "jump") throw new Error("Choose jump or collect");
	state.steps++;
	if (state.steps >= state.collisionAt)
		return { state, outcome: result(["COLLISION"], "Obstacle collision", 0) };
	if (state.steps === 20)
		return {
			state,
			outcome: result(
				["DINO"],
				"20 jumps · automatic collection",
				multiplier(20),
			),
		};
	return { state };
}
export function view(state: GameState, ended: boolean, _now: number): GameView {
	if (state.kind !== "dino") throw new Error("Invalid Dino state");
	return {
		kind: "dino",
		steps: state.steps,
		multiplierHundredths: multiplier(state.steps),
		busted: ended && state.steps >= state.collisionAt,
	};
}
