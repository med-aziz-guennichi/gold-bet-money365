import type { Currency } from "@gold-bet-clean-money365/auth/money";
import { game as baccarat } from "@gold-bet-clean-money365/casino-baccarat";
import { game as blackjack } from "@gold-bet-clean-money365/casino-blackjack";
import { game as coin } from "@gold-bet-clean-money365/casino-coin";
import type { GameId } from "@gold-bet-clean-money365/casino-core";
import { game as crash } from "@gold-bet-clean-money365/casino-crash";
import { game as dice } from "@gold-bet-clean-money365/casino-dice";
import { game as dragon_tiger } from "@gold-bet-clean-money365/casino-dragon-tiger";
import { game as keno } from "@gold-bet-clean-money365/casino-keno";
import { game as limbo } from "@gold-bet-clean-money365/casino-limbo";
import { game as mines } from "@gold-bet-clean-money365/casino-mines";
import { game as plinko } from "@gold-bet-clean-money365/casino-plinko";
import { game as roulette } from "@gold-bet-clean-money365/casino-roulette";
import { game as sic_bo } from "@gold-bet-clean-money365/casino-sic-bo";
import { game as slots } from "@gold-bet-clean-money365/casino-slots";
import { game as video_poker } from "@gold-bet-clean-money365/casino-video-poker";
import { game as wheel } from "@gold-bet-clean-money365/casino-wheel";
export const CASINO_VERSION = "2026-10-17.4";
export const casinoGames = [
	roulette,
	blackjack,
	baccarat,
	dragon_tiger,
	sic_bo,
	slots,
	mines,
	crash,
	video_poker,
	plinko,
	coin,
	dice,
	keno,
	wheel,
	limbo,
] as const;
export type CasinoGameId = GameId | "coin" | "dice" | "keno" | "wheel";
export type CasinoInput = {
	requestId: string;
	game: GameId;
	version: string;
	stake: string;
	choice: string;
	numbers: number[];
};
export type CasinoOutcome = {
	symbols: string[];
	detail: string;
	multiplierHundredths: number;
	path?: number[];
};
export type CasinoRound = {
	currency?: Currency;
	id: string;
	game: CasinoGameId;
	version: string;
	choice: string;
	numbers: number[];
	stakeMillimes: number;
	payoutMillimes: number;
	balanceMillimes: number;
	outcome: CasinoOutcome;
	status: "won" | "lost" | "push";
	createdAt: string;
};
