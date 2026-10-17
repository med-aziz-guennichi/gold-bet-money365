export const game = {
	id: "dino",
	name: "Dino Dash",
	icon: "🦖",
	category: "Arcade",
	choices: ["play"],
	mode: "session",
	rules:
		"Jump has an independent 80% success chance. Each success multiplies the return by 1.2, rounded down to 0.01×. Collect after a successful jump; a collision ends the round with no return. After 20 jumps collection is automatic. Play credits have no cash value.",
	rtp: "96% for one jump before rounding; decreases for each additional jump",
	action: "Start round",
} as const;
