export const game = {
	id: "dice",
	mode: "instant",
	name: "Neon Dice",
	icon: "⚄",
	category: "Dice",
	choices: ["under", "over"],
	rules:
		"Roll an integer from 0 to 99. Choose under 50 or 50 and over. Both choices have 50% probability and return 1.96× on a match.",
	rtp: "98% before credit rounding",
	action: "Roll dice",
} as const;
