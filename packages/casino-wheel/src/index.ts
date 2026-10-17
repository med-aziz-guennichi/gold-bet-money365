export const game = {
	id: "wheel",
	mode: "instant",
	name: "Aurora Wheel",
	icon: "◴",
	category: "Table",
	choices: ["spin"],
	rules:
		"Spin one of 20 equally likely sectors. The visible fixed table returns 0×, 1×, 2× or 6×. The pointer selects the final sector; returns include your played credits.",
	rtp: "90% before credit rounding",
	action: "Spin wheel",
} as const;
