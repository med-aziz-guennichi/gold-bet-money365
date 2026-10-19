import { play as baccarat } from "@gold-bet-clean-money365/casino-baccarat/engine";
import { play as coin } from "@gold-bet-clean-money365/casino-coin/engine";
import type { RandomInt } from "@gold-bet-clean-money365/casino-core";
import { play as dice } from "@gold-bet-clean-money365/casino-dice/engine";
import { play as dragon_tiger } from "@gold-bet-clean-money365/casino-dragon-tiger/engine";
import { play as keno } from "@gold-bet-clean-money365/casino-keno/engine";
import { play as limbo } from "@gold-bet-clean-money365/casino-limbo/engine";
import { play as plinko } from "@gold-bet-clean-money365/casino-plinko/engine";
import { play as roulette } from "@gold-bet-clean-money365/casino-roulette/engine";
import { play as sic_bo } from "@gold-bet-clean-money365/casino-sic-bo/engine";
import { play as slots } from "@gold-bet-clean-money365/casino-slots/engine";
import { play as wheel } from "@gold-bet-clean-money365/casino-wheel/engine";
import type { CasinoGameId } from "./casino-catalog";
import { playOriginal } from "./original-engines";

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
		case "scratch-nine":
		case "poker-dice":
		case "hand-duel":
		case "lucky-seven":
		case "three-card":
			return playOriginal(game, choice, random);
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
			return coin(choice, numbers, random);
		case "dice":
			return dice(choice, numbers, random);
		case "keno":
			return keno(choice, numbers, random);
		case "wheel":
			return wheel(choice, numbers, random);
		case "limbo":
			return limbo(choice, numbers, random);
		default:
			throw new Error("This game requires an interactive session");
	}
}
