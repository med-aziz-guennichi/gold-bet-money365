import {
	type Action,
	type GameState,
	type GameView,
	type RandomInt,
	result,
	shuffleDeck,
	type Transition,
	take,
} from "@gold-bet-clean-money365/casino-core";
import { cardLabel } from "@gold-bet-clean-money365/casino-core/cards";
export function evaluate(cards: number[]) {
	const ranks = cards.map((c) => (c % 13) + 1).sort((a, b) => a - b);
	const counts = new Map<number, number>();
	for (const n of ranks) counts.set(n, (counts.get(n) ?? 0) + 1);
	const groups = [...counts.values()].sort((a, b) => b - a);
	const flush = cards.every(
		(c) => Math.floor(c / 13) === Math.floor(cards[0]! / 13),
	);
	const straight =
		new Set(ranks).size === 5 &&
		(ranks[4]! - ranks[0]! === 4 || ranks.join(",") === "1,10,11,12,13");
	if (flush && straight)
		return ranks.join(",") === "1,10,11,12,13"
			? { name: "Royal flush", pay: 80000 }
			: { name: "Straight flush", pay: 5000 };
	if (groups[0] === 4) return { name: "Four of a kind", pay: 2500 };
	if (groups[0] === 3 && groups[1] === 2)
		return { name: "Full house", pay: 900 };
	if (flush) return { name: "Flush", pay: 600 };
	if (straight) return { name: "Straight", pay: 400 };
	if (groups[0] === 3) return { name: "Three of a kind", pay: 300 };
	if (groups[0] === 2 && groups[1] === 2)
		return { name: "Two pairs", pay: 200 };
	if (
		[...counts].some(
			([rank, count]) => count === 2 && (rank === 1 || rank >= 11),
		)
	)
		return { name: "Jacks or better", pay: 100 };
	return { name: "No qualifying hand", pay: 0 };
}
export function create(random: RandomInt, _now: number): Transition {
	const deck = shuffleDeck(random);
	return {
		state: {
			kind: "video-poker",
			deck,
			cards: Array.from({ length: 5 }, () => take(deck)),
		},
	};
}
export function act(
	previous: GameState,
	action: Action,
	_now: number,
): Transition {
	if (previous.kind !== "video-poker") throw new Error("Invalid poker state");
	if (
		action.type !== "draw" ||
		!action.holds ||
		action.holds.length > 5 ||
		new Set(action.holds).size !== action.holds.length ||
		action.holds.some((n) => !Number.isInteger(n) || n < 0 || n > 4)
	)
		throw new Error("Invalid held cards");
	const state = structuredClone(previous);
	state.cards = state.cards.map((c, i) =>
		action.holds?.includes(i) ? c : take(state.deck),
	);
	const hand = evaluate(state.cards);
	return {
		state,
		outcome: result(state.cards.map(cardLabel), hand.name, hand.pay),
	};
}
export function view(
	state: GameState,
	_ended: boolean,
	_now: number,
): GameView {
	if (state.kind !== "video-poker") throw new Error("Invalid poker state");
	return { kind: state.kind, cards: state.cards.map(cardLabel) };
}
