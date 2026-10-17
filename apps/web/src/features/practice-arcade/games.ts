export const arcadeGames = [
	{
		id: "crash",
		name: "Orbit Crash",
		icon: "↗",
		color: "#a78bfa",
		description: "Ride the curve. Choose your moment.",
		rules:
			"The multiplier grows until a random crash. Collect before it stops. Each round is independent.",
	},
	{
		id: "plinko",
		name: "Golden Plinko",
		icon: "◉",
		color: "#f4c96b",
		description: "One drop. A whole world of possibilities.",
		rules:
			"A ball takes eight independent left or right steps. Its final pocket determines your practice point return.",
	},
	{
		id: "mines",
		name: "Gem Garden",
		icon: "◆",
		color: "#53e0bd",
		description: "Find the gems. Leave the danger behind.",
		rules:
			"Three mines are hidden among 25 tiles. Reveal gems to grow your multiplier; collect at any time after finding a gem.",
	},
	{
		id: "dino",
		name: "Dino Dash",
		icon: "🦖",
		color: "#fb9475",
		description: "A little courage. One more jump.",
		rules:
			"Choose Jump to attempt the next obstacle, with an independent 80% success chance. Each success multiplies the return by 1.2. Collect before a collision.",
	},
] as const;
export type ArcadeId = (typeof arcadeGames)[number]["id"];

import { plinkoReturns } from "@gold-bet-clean-money365/casino-plinko/engine";
export const pockets = plinkoReturns.map((value) => value / 100);
