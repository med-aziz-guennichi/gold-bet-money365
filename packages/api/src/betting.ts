import type { Currency } from "@gold-bet-clean-money365/auth/money";
export type BetPickInput = {
	matchId: string;
	expectedOdd: string;
	market: {
		type: string;
		scope: string;
		selection: string;
		handicap?: string | null;
		score?: string | null;
		bookmaker?: string;
	};
};

export type PlaceBetInput = {
	requestId: string;
	stake: string;
	picks: BetPickInput[];
};
export type AcceptedBetPick = {
	sport?: string;
	matchId: string;
	home: string;
	away: string;
	league: string;
	kickoff: string;
	odd: string;
	market: BetPickInput["market"] & { bookmaker: string };
};
export type SavedBet = {
	currency?: Currency;
	id: string;
	stakeMillimes: number;
	potentialReturnMillimes: number;
	totalOdds: number;
	picks: AcceptedBetPick[];
	placedAt: string;
	status: "Pending" | "Won" | "Lost" | "Void";
	payoutMillimes?: number;
	settledAt?: string;
	settlementNote?: string;
	pickResults?: {
		matchId: string;
		status: string;
		score: { home: number; away: number } | null;
		latestEventMinute?: string | null;
		outcome: "won" | "lost" | "void" | "waiting" | "review";
	}[];
};
