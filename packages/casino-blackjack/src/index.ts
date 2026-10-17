export const game = {
	id: "blackjack",
	name: "Blackjack 21",
	icon: "♠",
	category: "Cards",
	choices: ["play"],
	mode: "session",
	rules:
		"Six decks, reshuffled each round. Hit or stand; dealer stands on all 17s. Blackjack returns 2.5×, ordinary win 2×, push 1×. No splits, doubles, insurance or surrender. Aces count 1 or 11. Dealer checks for blackjack before your first action.",
	rtp: "Depends on player decisions; no fixed session return",
	action: "Deal hand",
} as const;
