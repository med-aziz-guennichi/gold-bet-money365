export const game = {
	id: "sic-bo",
	name: "Sic Bo",
	icon: "⚄",
	category: "Dice",
	choices: ["small", "big", "triple"],
	rules:
		"Three independent six-sided dice. Small totals 4–10 and big totals 11–17 return 2×, except any triple loses. Any triple returns 31×.",
	rtp: "97.22% small/big · 86.11% triple",
	action: "Shake dice",
	mode: "instant",
} as const;
