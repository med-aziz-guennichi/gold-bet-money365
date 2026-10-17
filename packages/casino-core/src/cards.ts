import type { RandomInt } from "./index";
export function shoe(random: RandomInt) {
	const cards = Array.from({ length: 416 }, (_, i) => i % 52);
	return () => {
		const index = random(cards.length);
		const card = cards[index]!;
		cards[index] = cards[cards.length - 1]!;
		cards.pop();
		return card;
	};
}
export function rank(card: number) {
	return (card % 13) + 1;
}
export function cardLabel(card: number) {
	return `${["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][rank(card) - 1]}${["♠", "♥", "♣", "♦"][Math.floor(card / 13)]}`;
}
export function points(card: number) {
	return rank(card) >= 10 ? 0 : rank(card);
}

export function bankerDraws(total: number, playerThird: number | null) {
	if (playerThird === null) return total <= 5;
	return (
		total <= 2 ||
		(total === 3 && playerThird !== 8) ||
		(total === 4 && playerThird >= 2 && playerThird <= 7) ||
		(total === 5 && playerThird >= 4 && playerThird <= 7) ||
		(total === 6 && (playerThird === 6 || playerThird === 7))
	);
}
