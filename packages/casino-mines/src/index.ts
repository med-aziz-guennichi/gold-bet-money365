export const game = {
	id: "mines",
	name: "Mines",
	icon: "✦",
	category: "Strategy",
	choices: ["play"],
	mode: "session",
	rules:
		"25 tiles hide 3 mines. Reveal safe diamonds, then cash out. Hitting a mine loses the stake. Total return after k safe tiles is 97% × C(25,k)/C(22,k), rounded down to 0.01×. Revealing all 22 safe tiles cashes out automatically. You must reveal at least one tile before cashing out.",
	rtp: "97% before multiplier and millime rounding",
	action: "Start round",
} as const;
