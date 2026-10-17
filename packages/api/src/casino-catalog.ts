/** Public, versioned rules. Multipliers are TOTAL returns, including the stake. */
export const CASINO_VERSION = "2026-10-17.1";
export const casinoGames = [
	{
		id: "roulette",
		name: "European Roulette",
		icon: "◉",
		category: "Table",
		choices: ["red", "black", "odd", "even", "number"],
		rules:
			"Single zero, 37 equally likely pockets. Red/black/odd/even return 2×; a chosen number returns 36×. Zero loses outside bets.",
		rtp: "97.30%",
		action: "Spin wheel",
	},
	{
		id: "baccarat",
		name: "Baccarat",
		icon: "♠",
		category: "Cards",
		choices: ["player", "banker", "tie"],
		rules:
			"Fresh eight-deck shoe each round. Standard punto banco third-card rules. Player 2×, banker 1.95× (5% commission), tie 9×. Player/banker bets push on a tie. Cards A=1, 10/J/Q/K=0; totals modulo 10.",
		rtp: "98.94% banker · 98.76% player · 85.64% tie",
		action: "Deal cards",
	},
	{
		id: "dragon-tiger",
		name: "Dragon Tiger",
		icon: "♣",
		category: "Cards",
		choices: ["dragon", "tiger", "tie"],
		rules:
			"Two cards without replacement from eight decks. Ace low, king high; suits do not count. Higher side returns 2×. On equal ranks, side bets return half the stake; tie returns 12×.",
		rtp: "96.27% sides · 89.64% tie",
		action: "Deal cards",
	},
	{
		id: "sic-bo",
		name: "Sic Bo",
		icon: "⚄",
		category: "Dice",
		choices: ["small", "big", "triple"],
		rules:
			"Three independent six-sided dice. Small totals 4–10 and big totals 11–17 return 2×, except any triple loses. Any triple returns 31×.",
		rtp: "97.22% small/big · 86.11% triple",
		action: "Shake dice",
	},
	{
		id: "slots",
		name: "Orchard Reels",
		icon: "✿",
		category: "Arcade",
		choices: ["spin"],
		rules:
			"One payline, three independent reels, six equally likely symbols. Three cherries return 30×; any other triple 18×; exactly one matching pair 1×; otherwise 0. Only the highest payout applies.",
		rtp: "97.22%",
		action: "Spin reels",
	},
	{
		id: "keno",
		name: "Keno 20",
		icon: "✦",
		category: "Arcade",
		choices: ["draw"],
		rules:
			"Choose exactly 3 different numbers from 1–20. Five numbers drawn without replacement. Match 3 returns 65×; match 2 returns 3×; fewer returns 0.",
		rtp: "96.49%",
		action: "Draw numbers",
	},
	{
		id: "plinko",
		name: "Plinko",
		icon: "⋮",
		category: "Arcade",
		choices: ["drop"],
		rules:
			"Eight independent left/right steps at 50% each. Nine bins return, left to right: 16×, 4×, 1.5×, 0.5×, 0.2×, 0.5×, 1.5×, 4×, 16×.",
		rtp: "97.66%",
		action: "Drop ball",
	},
	{
		id: "wheel",
		name: "Lucky Wheel",
		icon: "☸",
		category: "Arcade",
		choices: ["spin"],
		rules:
			"20 equally likely sectors: ten return 0×, six return 1×, three return 2×, one returns 6×.",
		rtp: "90.00%",
		action: "Spin wheel",
	},
	{
		id: "coin",
		name: "Coin Flip",
		icon: "◐",
		category: "Instant",
		choices: ["heads", "tails"],
		rules:
			"Choose heads or tails. Each is equally likely. A correct call returns 1.96×; otherwise 0.",
		rtp: "98.00%",
		action: "Flip coin",
	},
	{
		id: "dice",
		name: "Dice 100",
		icon: "⚂",
		category: "Dice",
		choices: ["under", "over"],
		rules:
			"Uniform integer 0–99. Under wins on 0–49; over wins on 50–99. A winning call returns 1.96×.",
		rtp: "98.00%",
		action: "Roll dice",
	},
] as const;
export type CasinoGameId = (typeof casinoGames)[number]["id"];
export type CasinoInput = {
	requestId: string;
	game: CasinoGameId;
	version: string;
	stake: string;
	choice: string;
	numbers: number[];
};
export type CasinoOutcome = {
	symbols: string[];
	detail: string;
	multiplierHundredths: number;
	path?: number[];
};
export type CasinoRound = {
	id: string;
	game: CasinoGameId;
	version: string;
	choice: string;
	numbers: number[];
	stakeMillimes: number;
	payoutMillimes: number;
	balanceMillimes: number;
	outcome: CasinoOutcome;
	status: "won" | "lost" | "push";
	createdAt: string;
};
