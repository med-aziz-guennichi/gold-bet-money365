import { type RandomInt, result } from "@gold-bet-clean-money365/casino-core";
export function play(_choice: string, numbers: number[], random: RandomInt) {
	if (
		numbers.length !== 3 ||
		new Set(numbers).size !== 3 ||
		numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 20)
	)
		throw new Error("Choose exactly three different numbers from 1 to 20");
	const pool = Array.from({ length: 20 }, (_, i) => i + 1);
	const drawn = Array.from(
		{ length: 5 },
		() => pool.splice(random(pool.length), 1)[0]!,
	);
	const hits = drawn.filter((n) => numbers.includes(n)).length;
	return result(
		drawn.map(String),
		`${hits} of 3 matches`,
		hits === 3 ? 6500 : hits === 2 ? 300 : 0,
	);
}
