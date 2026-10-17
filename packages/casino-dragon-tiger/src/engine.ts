import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";
import {
	cardLabel,
	rank,
	shoe,
} from "@gold-bet-clean-money365/casino-core/cards";
export function play(
	choice: string,
	_numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const draw = shoe(random);
	const a = draw();
	const b = draw();
	const side =
		rank(a) === rank(b) ? "tie" : rank(a) > rank(b) ? "dragon" : "tiger";
	return result(
		[cardLabel(a), cardLabel(b)],
		`${side} · dragon / tiger`,
		side === choice
			? side === "tie"
				? 1200
				: 200
			: side === "tie" && choice !== "tie"
				? 50
				: 0,
	);
}
