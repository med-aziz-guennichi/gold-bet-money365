export const game = {
	id: "coin",
	mode: "instant",
	name: "Golden Coin",
	icon: "◐",
	category: "Arcade",
	choices: ["heads", "tails"],
	rules:
		"Choose heads or tails. Each face has a 50% chance. A correct choice returns 1.96× the credits played; an incorrect choice returns zero.",
	rtp: "98% before credit rounding",
	action: "Flip coin",
} as const;
