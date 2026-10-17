import { type RandomInt, result } from "@gold-bet-clean-money365/casino-core";
export function play(choice: string, _numbers: number[], random: RandomInt) {
	const face = random(2) === 0 ? "heads" : "tails";
	return result(
		[face === "heads" ? "H" : "T"],
		face,
		choice === face ? 196 : 0,
	);
}
