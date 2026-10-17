import { play as baccarat } from "@gold-bet-clean-money365/casino-baccarat/engine";
import type { RandomInt } from "@gold-bet-clean-money365/casino-core";
import { play as dragon_tiger } from "@gold-bet-clean-money365/casino-dragon-tiger/engine";
import { play as plinko } from "@gold-bet-clean-money365/casino-plinko/engine";
import { play as roulette } from "@gold-bet-clean-money365/casino-roulette/engine";
import { play as sic_bo } from "@gold-bet-clean-money365/casino-sic-bo/engine";
import { play as slots } from "@gold-bet-clean-money365/casino-slots/engine";
import type { CasinoGameId } from "./casino-catalog";
import { playCasino as legacy } from "./casino-engine-v1";

export { bankerDraws } from "@gold-bet-clean-money365/casino-core/cards";
export { plinkoReturns } from "@gold-bet-clean-money365/casino-plinko/engine";
export { casinoPayout, wheelReturns } from "./casino-engine-v1";
export function playCasino(
	game: CasinoGameId,
	choice: string,
	numbers: number[],
	random: RandomInt,
) {
	switch (game) {
		case "roulette":
			return roulette(choice, numbers, random);
		case "baccarat":
			return baccarat(choice, numbers, random);
		case "dragon-tiger":
			return dragon_tiger(choice, numbers, random);
		case "sic-bo":
			return sic_bo(choice, numbers, random);
		case "slots":
			return slots(choice, numbers, random);
		case "plinko":
			return plinko(choice, numbers, random);
		case "coin":
		case "dice":
		case "keno":
		case "wheel":
			return legacy(game, choice, numbers, random);
		default:
			throw new Error("This game requires an interactive session");
	}
}
