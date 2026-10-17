export const game = {
	id: "keno",
	mode: "instant",
	name: "Constellation Keno",
	icon: "✧",
	category: "Strategy",
	choices: ["play"],
	rules:
		"Select exactly 3 different numbers from 1 to 20. Five numbers are drawn without replacement. Match 2 for a 3× return or all 3 for a 65× return; other results return zero.",
	rtp: "96.49% before credit rounding",
	action: "Draw numbers",
} as const;
