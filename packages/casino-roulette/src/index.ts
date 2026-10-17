export const game = {
	id: "roulette",
	name: "European Roulette",
	icon: "◉",
	category: "Table",
	choices: ["red", "black", "odd", "even", "number"],
	rules:
		"Single zero, 37 equally likely pockets. Red/black/odd/even return 2×; a chosen number returns 36×. Zero loses outside bets.",
	rtp: "97.30%",
	action: "Spin wheel",
	mode: "instant",
} as const;
