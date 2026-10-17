export const game = {
	id: "dragon-tiger",
	name: "Dragon Tiger",
	icon: "♣",
	category: "Cards",
	choices: ["dragon", "tiger", "tie"],
	rules:
		"Two cards without replacement from eight decks. Ace low, king high; suits do not count. Higher side returns 2×. On equal ranks, side bets return half the stake; tie returns 12×.",
	rtp: "96.27% sides · 89.64% tie",
	action: "Deal cards",
	mode: "instant",
} as const;
