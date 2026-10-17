import {
	type Action,
	type GameState,
	type GameView,
	type RandomInt,
	result,
	type Transition,
} from "@gold-bet-clean-money365/casino-core";
export function multiplier(k: number) {
	let a = BigInt(97);
	let b = BigInt(1);
	for (let i = 0; i < k; i++) {
		a *= BigInt(25 - i);
		b *= BigInt(22 - i);
	}
	return Number(a / b);
}
export function create(random: RandomInt, _now: number): Transition {
	const pool = Array.from({ length: 25 }, (_, i) => i);
	return {
		state: {
			kind: "mines",
			mines: Array.from(
				{ length: 3 },
				() => pool.splice(random(pool.length), 1)[0]!,
			),
			revealed: [],
		},
	};
}
export function act(
	previous: GameState,
	action: Action,
	_now: number,
): Transition {
	if (previous.kind !== "mines") throw new Error("Invalid mines state");
	const state = structuredClone(previous);
	if (action.type === "cashout") {
		if (!state.revealed.length) throw new Error("Reveal a safe tile first");
		return {
			state,
			outcome: result(
				["DIAMOND"],
				`${state.revealed.length} safe tiles · cashed out`,
				multiplier(state.revealed.length),
			),
		};
	}
	if (
		action.type !== "reveal" ||
		!Number.isInteger(action.index) ||
		action.index! < 0 ||
		action.index! > 24 ||
		state.revealed.includes(action.index!)
	)
		throw new Error("Choose an unrevealed tile");
	state.revealed.push(action.index!);
	if (state.mines.includes(action.index!))
		return { state, outcome: result(["MINE"], "Mine hit", 0) };
	return state.revealed.length === 22
		? {
				state,
				outcome: result(["DIAMOND"], "All safe tiles revealed", multiplier(22)),
			}
		: { state };
}
export function view(state: GameState, ended: boolean, _now: number): GameView {
	if (state.kind !== "mines") throw new Error("Invalid mines state");
	const k = state.revealed.length;
	return {
		kind: state.kind,
		revealed: state.revealed,
		mines: ended ? state.mines : [],
		multiplierHundredths: k ? multiplier(k) : 100,
		nextMultiplierHundredths: k < 22 ? multiplier(k + 1) : multiplier(22),
	};
}
