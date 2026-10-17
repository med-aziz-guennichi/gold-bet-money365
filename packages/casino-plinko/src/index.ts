export const game = {
	id: "plinko",
	name: "Plinko",
	icon: "⋮",
	category: "Arcade",
	choices: ["drop"],
	rules:
		"Eight independent left/right steps at 50% each. Nine bins return, left to right: 16×, 4×, 1.5×, 0.5×, 0.2×, 0.5×, 1.5×, 4×, 16×.",
	rtp: "97.66%",
	action: "Drop ball",
	mode: "instant",
} as const;
