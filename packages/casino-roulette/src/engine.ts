import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";

const reds = new Set([
	1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
export function play(
	choice: string,
	numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const n = random(37);
	const color = n === 0 ? "green" : reds.has(n) ? "red" : "black";
	const win =
		choice === "number"
			? n === numbers[0]
			: n !== 0 &&
				(choice === color ||
					(choice === "odd" && n % 2 === 1) ||
					(choice === "even" && n % 2 === 0));
	return result(
		[String(n)],
		`${n} · ${color}`,
		win ? (choice === "number" ? 3600 : 200) : 0,
	);
}
