import { type RandomInt, result } from "@gold-bet-clean-money365/casino-core";
export const wheelReturns = [
	0, 100, 0, 200, 0, 100, 0, 600, 0, 100, 0, 200, 0, 100, 0, 100, 0, 200, 0,
	100,
];
export function play(_choice: string, _numbers: number[], random: RandomInt) {
	const sector = random(20);
	const multiplier = wheelReturns[sector]!;
	return result(
		[`${multiplier / 100}×`],
		`Sector ${sector + 1} of 20`,
		multiplier,
		[sector],
	);
}
