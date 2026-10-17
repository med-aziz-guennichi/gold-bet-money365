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
export function total(cards: number[]) {
	let n = 0;
	let aces = 0;
	for (const card of cards) {
		const rank = (card % 13) + 1;
		if (rank === 1) {
			n += 11;
			aces++;
		} else n += Math.min(rank, 10);
	}
	while (n > 21 && aces-- > 0) n -= 10;
	return n;
}
function resolve(
	state: Extract<GameState, { kind: "blackjack" }>,
	natural = false,
): Transition {
	const p = total(state.player);
	const d = total(state.dealer);
	const pn = p === 21 && state.player.length === 2;
	const dn = d === 21 && state.dealer.length === 2;
	const multiplier =
		p > 21
			? 0
			: dn
				? pn
					? 100
					: 0
				: pn
					? 250
					: d > 21 || p > d
						? 200
						: p === d
							? 100
							: 0;
	return {
		state,
		outcome: result(
			state.player.map(cardLabel),
			`${natural ? "Natural · " : ""}You ${p} · Dealer ${d}`,
			multiplier,
		),
	};
}
export function create(random: RandomInt, _now: number): Transition {
	const deck = shuffleDeck(random, 6);
	const state: Extract<GameState, { kind: "blackjack" }> = {
		kind: "blackjack",
		deck,
		player: [take(deck), take(deck)],
		dealer: [take(deck), take(deck)],
	};
	return total(state.player) === 21 || total(state.dealer) === 21
		? resolve(state, true)
		: { state };
}
export function act(
	previous: GameState,
	action: Action,
	_now: number,
): Transition {
	if (previous.kind !== "blackjack") throw new Error("Invalid blackjack state");
	const state = structuredClone(previous);
	if (action.type === "hit") {
		state.player.push(take(state.deck));
		if (total(state.player) > 21) return resolve(state);
		if (total(state.player) < 21) return { state };
	} else if (action.type !== "stand") throw new Error("Choose hit or stand");
	while (total(state.dealer) < 17) state.dealer.push(take(state.deck));
	return resolve(state);
}
export function view(state: GameState, ended: boolean, _now: number): GameView {
	if (state.kind !== "blackjack") throw new Error("Invalid blackjack state");
	return {
		kind: state.kind,
		cards: state.player.map(cardLabel),
		dealer: ended
			? state.dealer.map(cardLabel)
			: [cardLabel(state.dealer[0]!), "hidden"],
	};
}
