import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";
import {
	bankerDraws,
	cardLabel,
	points,
	shoe,
} from "@gold-bet-clean-money365/casino-core/cards";
export function play(
	choice: string,
	_numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const draw = shoe(random);
	const p = [draw()];
	const b = [draw()];
	p.push(draw());
	b.push(draw());
	const total = (cards: number[]) =>
		cards.reduce((sum, c) => sum + points(c), 0) % 10;
	const pt = total(p);
	const bt = total(b);
	if (pt < 8 && bt < 8) {
		if (pt <= 5) {
			const third = draw();
			p.push(third);
			const t = points(third);
			if (bankerDraws(bt, t)) b.push(draw());
		} else if (bankerDraws(bt, null)) b.push(draw());
	}
	const ps = total(p);
	const bs = total(b);
	const side = ps === bs ? "tie" : ps > bs ? "player" : "banker";
	return result(
		[p.map(cardLabel).join(" "), b.map(cardLabel).join(" ")],
		`Player ${ps} · Banker ${bs} · ${side}`,
		side === choice
			? side === "tie"
				? 900
				: side === "banker"
					? 195
					: 200
			: side === "tie" && choice !== "tie"
				? 100
				: 0,
	);
}
