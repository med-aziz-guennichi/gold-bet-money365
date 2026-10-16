import type { FootballMatch } from "@gold-bet-clean-money365/api/football";

export type Match = FootballMatch;

export type Selection = {
	match: Match;
	outcome: string;
	odd: string;
	market?: {
		type: string;
		scope: string;
		selection: string;
		handicap?: string | null;
		score?: string | null;
		bookmaker?: string;
	};
};

export type Region = { key: string; name: string };
