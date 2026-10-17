/** Retired games remain available only to historical rule regression tests. */
import {
	type CasinoOutcome,
	type RandomInt,
	result,
} from "@gold-bet-clean-money365/casino-core";
export const wheelReturns = [
	0, 100, 0, 200, 0, 100, 0, 600, 0, 100, 0, 200, 0, 100, 0, 100, 0, 200, 0,
	100,
];
export function playCasino(
	game: "coin" | "dice" | "keno" | "wheel",
	choice: string,
	numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	switch (game) {
		case "coin": {
			const face = random(2) === 0 ? "heads" : "tails";
			return result(
				[face === "heads" ? "H" : "T"],
				face,
				choice === face ? 196 : 0,
			);
		}
		case "dice": {
			const n = random(100);
			return result(
				[String(n).padStart(2, "0")],
				`${n} · ${n < 50 ? "under 50" : "50 or over"}`,
				(choice === "under" ? n < 50 : n >= 50) ? 196 : 0,
			);
		}
		case "keno": {
			const pool = Array.from({ length: 20 }, (_, i) => i + 1);
			const drawn = Array.from({ length: 5 }, () => {
				const i = random(pool.length);
				return pool.splice(i, 1)[0]!;
			});
			const hits = drawn.filter((n) => numbers.includes(n)).length;
			return result(
				drawn.map(String),
				`${hits} of 3 matches`,
				hits === 3 ? 6500 : hits === 2 ? 300 : 0,
			);
		}
		case "wheel": {
			const sector = random(20);
			const multiplier = wheelReturns[sector]!;
			return result(
				[`${multiplier / 100}×`],
				`Sector ${sector + 1} of 20`,
				multiplier,
				[sector],
			);
		}
	}
}
export function casinoPayout(stake: number, multiplierHundredths: number) {
	return Number((BigInt(stake) * BigInt(multiplierHundredths)) / BigInt(100));
}
