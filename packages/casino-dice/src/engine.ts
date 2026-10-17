import { type RandomInt, result } from "@gold-bet-clean-money365/casino-core";
export function play(choice: string, _numbers: number[], random: RandomInt) {
	const n = random(100);
	return result(
		[String(n).padStart(2, "0")],
		`${n} · ${n < 50 ? "under 50" : "50 or over"}`,
		(choice === "under" ? n < 50 : n >= 50) ? 196 : 0,
	);
}
