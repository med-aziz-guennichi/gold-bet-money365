import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";

const fruits = ["🍒", "🍋", "🍇", "🍊", "🔔", "💎"];
export function play(
	_choice: string,
	_numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const reels = Array.from({ length: 3 }, () => random(6));
	const unique = new Set(reels).size;
	return result(
		reels.map((x) => fruits[x]!),
		unique === 1
			? "Three of a kind"
			: unique === 2
				? "Matching pair"
				: "No match",
		unique === 1 ? (reels[0] === 0 ? 3000 : 1800) : unique === 2 ? 100 : 0,
	);
}
