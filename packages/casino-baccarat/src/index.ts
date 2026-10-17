export const game = {
	id: "baccarat",
	name: "Baccarat",
	icon: "♠",
	category: "Cards",
	choices: ["player", "banker", "tie"],
	rules:
		"Fresh eight-deck shoe each round. Standard punto banco third-card rules. Player 2×, banker 1.95× (5% commission), tie 9×. Player/banker bets push on a tie. Cards A=1, 10/J/Q/K=0; totals modulo 10.",
	rtp: "98.94% banker · 98.76% player · 85.64% tie",
	action: "Deal cards",
	mode: "instant",
} as const;
