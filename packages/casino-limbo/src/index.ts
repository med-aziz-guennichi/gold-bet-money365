export const game = {
	id: "limbo",
	mode: "instant",
	name: "Limbo Rise",
	icon: "↑",
	category: "Arcade",
	choices: ["2", "5", "10"],
	rules:
		"Choose a target of 2×, 5× or 10×. A random multiplier is generated independently each round. Reach your selected target to receive that multiplier; otherwise the return is zero.",
	rtp: "97% before credit rounding",
	action: "Launch multiplier",
} as const;
