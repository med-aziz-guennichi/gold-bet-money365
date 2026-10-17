import * as blackjack from "@gold-bet-clean-money365/casino-blackjack/engine";
import type { SessionEngine } from "@gold-bet-clean-money365/casino-core";
import * as crash from "@gold-bet-clean-money365/casino-crash/engine";
import * as mines from "@gold-bet-clean-money365/casino-mines/engine";
import * as poker from "@gold-bet-clean-money365/casino-video-poker/engine";
export const practiceEngines: Record<string, SessionEngine> = {
	blackjack,
	mines,
	crash,
	"video-poker": poker,
};
export function randomInt(max: number) {
	const cutoff = Math.floor(4294967296 / max) * max;
	const a = new Uint32Array(1);
	do {
		crypto.getRandomValues(a);
	} while (a[0]! >= cutoff);
	return a[0]! % max;
}
