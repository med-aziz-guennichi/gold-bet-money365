/** Shared Flashscore event DTOs; legacy Football names remain API-compatible. */
export type FootballMatch = {
	id: string;
	provider: "Flashscore";
	sport: string;
	league: string;
	categoryName: string;
	categoryKey: string;
	time: string;
	finishedAt?: string;
	stage?: string;
	latestEventMinute?: string | null;
	home: string;
	away: string;
	homeMark: string;
	awayMark: string;
	score: { home: number | null; away: number | null };
	odds: {
		result: [string, string, string];
		resultSource?: string;
		markets: FootballOddsMarket[];
		handicap: {
			homeLabel: string;
			awayLabel: string;
			home: string;
			away: string;
		};
		totals: {
			overLabel: string;
			underLabel: string;
			over: string;
			under: string;
		};
	};
	status: string;
};

export type FootballOddsSelection = {
	selection: string;
	value: string | null;
	openingValue: string | null;
	handicap: string | null;
	score: string | null;
	active: boolean;
};

/** A single bookmaker's offer for one market and period. */
export type FootballOddsMarket = {
	betType: string;
	scope: string;
	bookmaker: string;
	hasLiveBetting: boolean;
	selections: FootballOddsSelection[];
};

export type FootballOddsSnapshot = {
	result: [string, string, string] | null;
	markets: FootballOddsMarket[];
};

export type FootballMatchesResponse = {
	matches: FootballMatch[];
	source: "Local Flashscore scraper";
	updatedAt: string;
};

export type FootballOddsResponse = {
	odds: Record<string, FootballOddsSnapshot | null>;
	priced: number;
	total: number;
};

export type FootballMatchResult = {
	sport?: string;
	winner?: "home" | "away" | "draw" | null;
	completedNormally?: boolean;
	id: string;
	status: string;
	score: { home: number; away: number } | null;
	stage?: string;
	latestEventMinute?: string | null;
	/** Verified regulation-time score; absent for extra time/penalties or uncertain data. */
	regulationScore?: { home: number; away: number } | null;
	/** Match stats keyed by scraper period and stat label (e.g. full-time:Corners). */
	statistics?: Record<string, { home: number | null; away: number | null }>;
	incidents?: {
		type: string;
		reason: string;
		period?: string;
		team: "home" | "away" | null;
		player: string | null;
	}[];
};

/** Server-only implementation is injected through the API context. */
export type FlashscoreService = {
	getCurrentStates?(ids: string[]): Promise<{ results: FootballMatchResult[] }>;
	getMatches(options?: {
		sport?: string;
		ids?: string[];
	}): Promise<FootballMatchesResponse>;
	getSports?(): Promise<{
		sports: {
			id: number;
			slug: string;
			name: string;
			eventCount: number | null;
			liveCount: number | null;
			format: "matches" | "leaderboard";
		}[];
	}>;
	getPricedMatches?(input: {
		sport: string;
		cursor: number;
		day?: number;
		liveOnly?: boolean;
		query?: string;
	}): Promise<
		FootballMatchesResponse & { nextCursor: number | null; checked: number }
	>;
	getOdds(
		ids: string[],
		options?: { fresh?: boolean },
	): Promise<FootballOddsResponse>;
	getResults(
		ids: string[],
		options?: { fresh?: boolean },
	): Promise<{ results: FootballMatchResult[] }>;
};
