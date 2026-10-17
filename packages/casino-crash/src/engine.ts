import {
	type Action,
	type GameState,
	type GameView,
	type RandomInt,
	result,
	type Transition,
} from "@gold-bet-clean-money365/casino-core";
export function current(start: number, now: number) {
	return Math.min(
		10000,
		Math.max(
			100,
			Math.floor(100 * Math.exp(Math.max(0, now - start) * 0.00013)),
		),
	);
}
export function create(random: RandomInt, now: number): Transition {
	const bustHundredths = Math.min(
		10000,
		Math.floor(99000000 / (1000000 - random(1000000))),
	);
	const state: GameState = {
		kind: "crash",
		startedAt: now,
		bustHundredths,
		bustAt: now + Math.max(0, Math.log(bustHundredths / 100) / 0.00013),
	};
	return bustHundredths <= 100
		? { state, outcome: result(["1.00×"], "Crashed at launch", 0) }
		: { state };
}
export function act(state: GameState, action: Action, now: number): Transition {
	if (state.kind !== "crash") throw new Error("Invalid crash state");
	if (now >= state.bustAt) {
		const cap = state.bustHundredths === 10000;
		return {
			state,
			outcome: result(
				[`${(state.bustHundredths / 100).toFixed(2)}×`],
				cap ? "Maximum reached · automatic cash-out" : "Flight crashed",
				cap ? 10000 : 0,
			),
		};
	}
	if (action.type !== "cashout") throw new Error("Invalid crash action");
	const n = current(state.startedAt, now);
	return {
		state,
		outcome: result([`${(n / 100).toFixed(2)}×`], "Cash-out confirmed", n),
	};
}
export function view(state: GameState, ended: boolean, now: number): GameView {
	if (state.kind !== "crash") throw new Error("Invalid crash state");
	return {
		kind: state.kind,
		startedAt: state.startedAt,
		serverTime: now,
		multiplierHundredths: ended
			? state.bustHundredths
			: current(state.startedAt, now),
		busted: ended,
	};
}
