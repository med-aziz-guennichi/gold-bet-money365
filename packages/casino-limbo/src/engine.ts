import { type RandomInt, result } from "@gold-bet-clean-money365/casino-core";
export function play(choice: string, _numbers: number[], random: RandomInt) {
	const target = Number(choice);
	if (![2, 5, 10].includes(target)) throw new Error("Invalid target");
	const landed = Math.min(
		10000,
		Math.floor(97000000 / (1000000 - random(1000000))),
	);
	return result(
		[`${(landed / 100).toFixed(2)}×`],
		`Target ${target}× · reached ${(landed / 100).toFixed(2)}×`,
		landed >= target * 100 ? target * 100 : 0,
	);
}
