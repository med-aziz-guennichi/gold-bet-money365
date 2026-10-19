import {
	type RandomInt,
	result,
	shuffleDeck,
} from "@gold-bet-clean-money365/casino-core";
import type { OriginalGameId } from "./original-games";

export function dicePoker(dice: number[]) {
	const counts = [...new Set(dice)]
		.map((value) => dice.filter((die) => die === value).length)
		.sort((a, b) => b - a);
	const straight =
		counts.length === 5 && Math.max(...dice) - Math.min(...dice) === 4;
	if (counts[0] === 5) return ["Five of a kind", 5000] as const;
	if (counts[0] === 4) return ["Four of a kind", 1000] as const;
	if (counts[0] === 3 && counts[1] === 2) return ["Full house", 400] as const;
	if (straight) return ["Straight", 400] as const;
	if (counts[0] === 3) return ["Three of a kind", 150] as const;
	if (counts[0] === 2 && counts[1] === 2) return ["Two pairs", 100] as const;
	return ["No winning combination", 0] as const;
}
export function threeCard(cards: number[]) {
	const ranks = cards.map((card) => card % 13).sort((a, b) => a - b);
	const flush = cards.every(
		(card) => Math.floor(card / 13) === Math.floor((cards[0] ?? 0) / 13),
	);
	const straight =
		new Set(ranks).size === 3 &&
		((ranks[2] ?? 0) - (ranks[0] ?? 0) === 2 || ranks.join(",") === "0,11,12");
	if (straight && flush) return ["Straight flush", 4100] as const;
	if (new Set(ranks).size === 1) return ["Three of a kind", 3100] as const;
	if (straight) return ["Straight", 700] as const;
	if (flush) return ["Flush", 400] as const;
	if (new Set(ranks).size === 2) return ["Pair", 200] as const;
	return ["No winning combination", 0] as const;
}
export function playOriginal(
	game: OriginalGameId,
	choice: string,
	random: RandomInt,
) {
	switch (game) {
		case "scratch-nine": {
			const draw = random(10000);
			const multiplier =
				draw < 6000
					? 0
					: draw < 8000
						? 100
						: draw < 9200
							? 200
							: draw < 9800
								? 500
								: draw < 9950
									? 1000
									: 2000;
			const symbols = ["◆", "◆", "●", "●", "✦", "✦", "♣", "♣", "♥"];
			if (multiplier) {
				symbols[0] = `${multiplier / 100}×`;
				symbols[1] = `${multiplier / 100}×`;
				symbols[2] = `${multiplier / 100}×`;
			}
			for (let i = symbols.length - 1; i > 0; i--) {
				const j = random(i + 1);
				const a = symbols[i] ?? "◆";
				symbols[i] = symbols[j] ?? "◆";
				symbols[j] = a;
			}
			return result(
				symbols,
				multiplier ? "Matching prize symbols" : "No winning combination",
				multiplier,
			);
		}
		case "poker-dice": {
			const dice = Array.from({ length: 5 }, () => random(6) + 1);
			const [detail, multiplier] = dicePoker(dice);
			return result(dice.map(String), detail, multiplier);
		}
		case "hand-duel": {
			const options = ["rock", "paper", "scissors"] as const;
			const opponent = options[random(3)];
			const win =
				(choice === "rock" && opponent === "scissors") ||
				(choice === "paper" && opponent === "rock") ||
				(choice === "scissors" && opponent === "paper");
			return result(
				[choice, opponent ?? "rock"],
				choice === opponent ? "Tie" : win ? "Duel won" : "Duel lost",
				choice === opponent ? 100 : win ? 194 : 0,
			);
		}
		case "lucky-seven": {
			const dice = [random(6) + 1, random(6) + 1];
			const total = (dice[0] ?? 0) + (dice[1] ?? 0);
			const correct =
				choice === "seven"
					? total === 7
					: choice === "under"
						? total < 7
						: total > 7;
			return result(
				dice.map(String),
				String(total),
				correct ? (choice === "seven" ? 588 : 235) : 0,
			);
		}
		case "three-card": {
			const cards = shuffleDeck(random).slice(0, 3);
			const [detail, multiplier] = threeCard(cards);
			const ranks = [
				"A",
				"2",
				"3",
				"4",
				"5",
				"6",
				"7",
				"8",
				"9",
				"10",
				"J",
				"Q",
				"K",
			];
			const suits = ["♠", "♥", "♦", "♣"];
			return result(
				cards.map(
					(card) => `${ranks[card % 13]}${suits[Math.floor(card / 13)]}`,
				),
				detail,
				multiplier,
			);
		}
	}
}
