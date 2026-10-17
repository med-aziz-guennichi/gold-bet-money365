import type { CasinoGameId, CasinoOutcome } from "./casino-catalog";

export type RandomInt = (exclusiveMaximum: number) => number;
const reds = new Set([
	1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
const fruits = ["🍒", "🍋", "🍇", "🍊", "🔔", "💎"];
export const plinkoReturns = [1600, 400, 150, 50, 20, 50, 150, 400, 1600];
export const wheelReturns = [
	0, 100, 0, 200, 0, 100, 0, 600, 0, 100, 0, 200, 0, 100, 0, 100, 0, 200, 0,
	100,
];

function shoe(random: RandomInt) {
	const cards = Array.from({ length: 416 }, (_, i) => i % 52);
	return () => {
		const index = random(cards.length);
		const card = cards[index]!;
		cards[index] = cards[cards.length - 1]!;
		cards.pop();
		return card;
	};
}
function rank(card: number) {
	return (card % 13) + 1;
}
function cardLabel(card: number) {
	return `${["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][rank(card) - 1]}${["♠", "♥", "♣", "♦"][Math.floor(card / 13)]}`;
}
function points(card: number) {
	return rank(card) >= 10 ? 0 : rank(card);
}

export function bankerDraws(total: number, playerThird: number | null) {
	if (playerThird === null) return total <= 5;
	return (
		total <= 2 ||
		(total === 3 && playerThird !== 8) ||
		(total === 4 && playerThird >= 2 && playerThird <= 7) ||
		(total === 5 && playerThird >= 4 && playerThird <= 7) ||
		(total === 6 && (playerThird === 6 || playerThird === 7))
	);
}

/** Pure rules; production supplies node:crypto.randomInt. No balance-dependent outcomes. */
export function playCasino(
	game: CasinoGameId,
	choice: string,
	numbers: number[],
	random: RandomInt,
): CasinoOutcome {
	const result = (
		symbols: string[],
		detail: string,
		multiplierHundredths: number,
		path?: number[],
	): CasinoOutcome => ({
		symbols,
		detail,
		multiplierHundredths,
		...(path ? { path } : {}),
	});
	switch (game) {
		case "roulette": {
			const n = random(37);
			const color = n === 0 ? "green" : reds.has(n) ? "red" : "black";
			const win =
				choice === "number"
					? n === numbers[0]
					: n !== 0 &&
						(choice === color ||
							(choice === "odd" && n % 2 === 1) ||
							(choice === "even" && n % 2 === 0));
			return result(
				[String(n)],
				`${n} · ${color}`,
				win ? (choice === "number" ? 3600 : 200) : 0,
			);
		}
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
		case "sic-bo": {
			const dice = Array.from({ length: 3 }, () => random(6) + 1);
			const sum = dice.reduce((a, b) => a + b, 0);
			const triple = dice.every((x) => x === dice[0]);
			const win =
				choice === "triple"
					? triple
					: !triple &&
						(choice === "small"
							? sum >= 4 && sum <= 10
							: sum >= 11 && sum <= 17);
			return result(
				dice.map((n) => ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][n - 1]!),
				`Total ${sum}${triple ? " · triple" : ""}`,
				win ? (choice === "triple" ? 3100 : 200) : 0,
			);
		}
		case "slots": {
			const reels = Array.from({ length: 3 }, () => random(6));
			const unique = new Set(reels).size;
			return result(
				reels.map((x) => fruits[x]!),
				unique === 1
					? "Three of a kind"
					: unique === 2
						? "Matching pair"
						: "No match",
				unique === 1 ? (reels[0] === 0 ? 3000 : 1800) : unique === 2 ? 100 : 0,
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
		case "plinko": {
			const path = Array.from({ length: 8 }, () => random(2));
			const bin = path.reduce((a, b) => a + b, 0);
			return result(
				[`${plinkoReturns[bin]! / 100}×`],
				`Bin ${bin + 1} · ${path.map((n) => (n ? "R" : "L")).join(" ")}`,
				plinkoReturns[bin]!,
				path,
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
		case "dragon-tiger": {
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
		case "baccarat": {
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
	}
}

export function casinoPayout(stake: number, multiplierHundredths: number) {
	return Number((BigInt(stake) * BigInt(multiplierHundredths)) / 100n);
}
