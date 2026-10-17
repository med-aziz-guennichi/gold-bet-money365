export const game = {
	id: "video-poker",
	name: "Jacks or Better",
	icon: "♦",
	category: "Cards",
	choices: ["play"],
	mode: "session",
	rules:
		"52-card deck. Hold any of your five cards, then draw once. Total returns: royal flush 800×, straight flush 50×, four of a kind 25×, full house 9×, flush 6×, straight 4×, three of a kind 3×, two pairs 2×, jacks-or-better pair 1×; others lose. Ace may be high or low in a straight.",
	rtp: "99.54% with optimal 9/6 strategy, before millime rounding",
	action: "Deal cards",
} as const;
