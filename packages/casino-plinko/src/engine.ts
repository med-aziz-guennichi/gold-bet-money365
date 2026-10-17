import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";
export const plinkoReturns = [1600, 400, 150, 50, 20, 50, 150, 400, 1600];
export function play(
	_choice: string,
	_numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const path = Array.from({ length: 8 }, () => random(2));
	const bin = path.reduce((a, b) => a + b, 0);
	return result(
		[`${plinkoReturns[bin]! / 100}×`],
		`Bin ${bin + 1} · ${path.map((n) => (n ? "R" : "L")).join(" ")}`,
		plinkoReturns[bin]!,
		path,
	);
}
