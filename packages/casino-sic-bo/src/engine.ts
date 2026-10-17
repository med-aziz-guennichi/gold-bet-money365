import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";
export function play(
	choice: string,
	_numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const dice = Array.from({ length: 3 }, () => random(6) + 1);
	const sum = dice.reduce((a, b) => a + b, 0);
	const triple = dice.every((x) => x === dice[0]);
	const win =
		choice === "triple"
			? triple
			: !triple &&
				(choice === "small" ? sum >= 4 && sum <= 10 : sum >= 11 && sum <= 17);
	return result(
		dice.map((n) => ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][n - 1]!),
		`Total ${sum}${triple ? " · triple" : ""}`,
		win ? (choice === "triple" ? 3100 : 200) : 0,
	);
}
