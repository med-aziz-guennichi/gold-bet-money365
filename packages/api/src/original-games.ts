export const originalGames = [
	{
		id: "scratch-nine",
		name: "Scratch Nine",
		icon: "✦",
		category: "Arcade",
		mode: "instant",
		choices: ["ticket"],
		action: "Reveal ticket",
		rules:
			"Reveal a nine-cell ticket. Three matching prize symbols pay the displayed total return. Tickets return 0× (60%), 1× (20%), 2× (12%), 5× (6%), 10× (1.5%) or 20× (0.5%). Revealing cells does not change the result.",
		rtp: "99% before credit rounding",
	},
	{
		id: "poker-dice",
		name: "Poker Dice",
		icon: "⚄",
		category: "Dice",
		mode: "instant",
		choices: ["roll"],
		action: "Roll five dice",
		rules:
			"Roll five independent fair dice once. Five of a kind returns 50×; four of a kind 10×; full house 4×; straight 4×; three of a kind 1.5×; two pairs 1×. Other rolls return zero. No rerolls.",
		rtp: "97.22% before credit rounding",
	},
	{
		id: "hand-duel",
		name: "Hand Duel",
		icon: "✌",
		category: "Arcade",
		mode: "instant",
		choices: ["rock", "paper", "scissors"],
		action: "Play duel",
		rules:
			"Choose rock, paper or scissors. The opponent chooses independently with equal probability. A win returns 1.94×; a tie returns your stake; a loss returns zero.",
		rtp: "98% before credit rounding",
	},
	{
		id: "lucky-seven",
		name: "Lucky Seven",
		icon: "⑦",
		category: "Dice",
		mode: "instant",
		choices: ["under", "seven", "over"],
		action: "Roll the pair",
		rules:
			"Roll two fair dice. Under 7 or over 7 returns 2.35× when correct (15 of 36 outcomes). Exactly 7 returns 5.88× (6 of 36 outcomes). Other outcomes return zero.",
		rtp: "97.92% under/over; 98% exactly seven, before credit rounding",
	},
	{
		id: "three-card",
		name: "Three Card Studio",
		icon: "♣",
		category: "Cards",
		mode: "instant",
		choices: ["deal"],
		action: "Deal three cards",
		rules:
			"Three cards are drawn without replacement from a 52-card deck. Straight flush returns 41×; three of a kind 31×; straight 7×; flush 4×; pair 2×. Other hands return zero. Ace can be low in A-2-3 or high in Q-K-A. Multipliers include the stake.",
		rtp: "92.72% before credit rounding",
	},
] as const;
export type OriginalGameId = (typeof originalGames)[number]["id"];
