import { currentEventStatus } from "@gold-bet-clean-money365/api/event-status";
import type {
	FlashscoreService,
	FootballMatch,
	FootballMatchResult,
	FootballOddsMarket,
	FootballOddsSnapshot,
} from "@gold-bet-clean-money365/api/football";
import { ENV } from "../env.server";
import { AsyncCache } from "./async-cache";

type TeamPayload = { name?: string; short_name?: string };
type CompetitionPayload = {
	name?: string;
	country?: { name?: string };
};
type MatchPayload = {
	id?: string;
	status?: string;
	start_time?: string;
	home?: TeamPayload;
	away?: TeamPayload;
	home_score?: number | null;
	away_score?: number | null;
	competition?: CompetitionPayload;
};
type CompetitionGroupPayload = {
	competition?: CompetitionPayload;
	matches?: MatchPayload[];
};
type MatchesPayload = {
	sport?: { name?: string };
	competitions?: CompetitionGroupPayload[];
};
type OddsMarketPayload = {
	bet_type?: string;
	bet_scope?: string;
	bookmaker?: { name?: string };
	has_live_betting?: boolean;
	selections?: {
		selection?: unknown;
		value?: string | number | null;
		opening_value?: string | number | null;
		handicap?: unknown;
		score?: unknown;
		is_active?: boolean;
	}[];
};
type OddsPayload = { markets?: OddsMarketPayload[] };
type MatchDetailsPayload = MatchPayload & {
	sport?: { name?: string };
	winner?: "home" | "away" | "draw" | null;
	stage?: string;
	stage_id?: number;
	status?: string;
	home_score?: number | null;
	away_score?: number | null;
};
type StatisticsPayload = {
	periods?: {
		period?: string | null;
		groups?: {
			statistics?: {
				name?: string | null;
				home_value?: number | string | null;
				away_value?: number | string | null;
			}[];
		}[];
	}[];
};
type SummaryPayload = {
	periods?: {
		period?: string | null;
		incidents?: {
			minute?: string | null;
			type?: string | null;
			reason?: string | null;
			team?: "home" | "away" | null;
			player?: { name?: string | null } | string | null;
		}[];
	}[];
};
type Prices = [string, string, string];

/** The scraper sometimes wraps display values in GraphQL objects. */
function normalizeOfferLabel(value: unknown): string | null {
	if (typeof value === "string" || typeof value === "number") {
		const text = String(value).trim();
		if (text.includes("__typename") || text.includes("EventOddsItem")) {
			const serializedValue = text
				.match(/["']?value["']?\s*:\s*["']?([^,"'}\]]+)["']?/i)?.[1]
				?.trim();
			if (serializedValue) return serializedValue;
		}
		return text || null;
	}
	if (value && typeof value === "object" && "value" in value) {
		return normalizeOfferLabel((value as { value?: unknown }).value);
	}
	return null;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
const ODDS_CONCURRENCY = 6;
const FINISHED_MATCH_RETENTION_MS = 60 * 60 * 1000;
// Fixture, price and detail caches remain separate so accepting a bet can
// bypass display prices without crawling a whole sport schedule.

type MatchesResponse = Awaited<ReturnType<FlashscoreService["getMatches"]>>;

function toCategoryKey(value: string) {
	return (
		value
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "international"
	);
}

function normalizeStatus(status?: string) {
	const value = (status ?? "unknown").trim().toLowerCase();
	if (
		["live", "in_play", "in play"].includes(value) ||
		value.includes("1st half") ||
		value.includes("2nd half") ||
		value.includes("extra time") ||
		value.includes("penalties")
	)
		return "TRADING_LIVE";
	if (
		value.includes("finished") ||
		value === "resulted" ||
		value === "closed" ||
		value === "ended" ||
		value === "complete" ||
		value === "completed" ||
		value === "ft"
	)
		return "RESULTED";
	if (["cancelled", "canceled"].includes(value)) return "CANCELLED";
	if (["postponed", "suspended"].includes(value)) return "POST_TRADING";
	return value === "scheduled" ? "TRADING" : "UNKNOWN";
}

function normalizeScore(match: MatchPayload) {
	return {
		home: typeof match.home_score === "number" ? match.home_score : null,
		away: typeof match.away_score === "number" ? match.away_score : null,
	};
}

function getResultPrices(payload: OddsPayload): Prices | null {
	const prices: Record<"home" | "draw" | "away", number> = {
		home: 0,
		draw: 0,
		away: 0,
	};

	for (const market of payload.markets ?? []) {
		if (
			market.bet_type?.toUpperCase() !== "HOME_DRAW_AWAY" ||
			market.bet_scope?.toUpperCase() !== "FULL_TIME"
		)
			continue;

		for (const selection of market.selections ?? []) {
			if (selection.is_active === false) continue;
			const label = normalizeOfferLabel(selection.selection)?.toLowerCase();
			const outcome = ["home", "1", "1 (home)"].includes(label ?? "")
				? "home"
				: ["draw", "x", "tie"].includes(label ?? "")
					? "draw"
					: ["away", "2", "2 (away)"].includes(label ?? "")
						? "away"
						: null;
			const price = Number(selection.value);
			if (outcome && Number.isFinite(price) && price > prices[outcome])
				prices[outcome] = price;
		}
	}

	if (prices.home <= 1 || prices.draw <= 1 || prices.away <= 1) return null;
	return [prices.home, prices.draw, prices.away].map((price) =>
		price.toFixed(2),
	) as Prices;
}

/** Encapsulates scraper URLs, authentication, payload mapping, and feed policy. */
export class FlashscoreClient implements FlashscoreService {
	constructor(private readonly transport?: <T>(path: string) => Promise<T>) {}
	private readonly baseUrl = (
		ENV.FLASHSCORE_API_URL?.trim() || DEFAULT_BASE_URL
	).replace(/\/+$/, "");

	// Per-match keys also deduplicate requests from overlapping RPC batches.
	private readonly resultCache = new AsyncCache<FootballMatchResult | null>(
		20_000,
		2_000,
		5_000,
	);

	private readonly oddsCache = new AsyncCache<FootballOddsSnapshot | null>(
		60_000,
		2_000,
		10_000,
	);

	private async request<T>(path: string): Promise<T> {
		if (this.transport) return this.transport<T>(path);
		const headers = new Headers({ Accept: "application/json" });
		const apiKey = ENV.FLASHSCORE_API_KEY?.trim();
		if (apiKey) headers.set("API-Key", apiKey);

		const response = await fetch(
			new URL(path.replace(/^\/+/, ""), `${this.baseUrl}/`),
			{
				headers,
				cache: "no-store",
				signal: AbortSignal.timeout(15_000),
			},
		);
		if (!response.ok) {
			const details = (await response.text()).trim().slice(0, 500);
			throw new Error(
				`Flashscore scraper returned HTTP ${response.status} for ${path}.${details ? ` Response: ${details}` : ""}`,
			);
		}
		return (await response.json()) as T;
	}

	private readonly fixturesCache = new AsyncCache<MatchesResponse>(
		90_000,
		50,
		10_000,
	);
	private readonly detailCache = new AsyncCache<FootballMatch | null>(
		30_000,
		2000,
		5000,
	);
	private readonly sportsCache = new AsyncCache<
		Awaited<ReturnType<NonNullable<FlashscoreService["getSports"]>>>
	>(300_000, 1, 10000);
	private readonly browseCache = new AsyncCache<
		MatchesResponse & { nextCursor: number | null; checked: number }
	>(60_000, 200, 5000);

	async getSports() {
		return this.sportsCache.get("sports", async () => {
			const data = await this.request<{
				sports: {
					id: number;
					slug: string;
					name: string;
					event_count?: number;
					live_count?: number;
				}[];
			}>("/sports");
			const leaderboard = new Set([23, 31, 34, 35, 37, 38, 39, 41]);
			return {
				sports: data.sports.map((sport) => ({
					id: sport.id,
					slug: sport.slug,
					name: sport.name,
					eventCount: sport.event_count ?? null,
					liveCount: sport.live_count ?? null,
					format: leaderboard.has(sport.id)
						? ("leaderboard" as const)
						: ("matches" as const),
				})),
			};
		});
	}

	async getMatches(options?: {
		sport?: string;
		ids?: string[];
	}): Promise<MatchesResponse> {
		if (options?.ids) {
			const matches = await Promise.all(
				options.ids.map((id) =>
					this.detailCache.get(id, async () => {
						const event = await this.request<MatchDetailsPayload>(
							`/matches/details?match=${encodeURIComponent(id)}`,
						);
						return this.mapMatch(
							event,
							event.competition,
							event.sport?.name ?? "Unknown",
						);
					}),
				),
			);
			return {
				matches: matches.filter((item): item is FootballMatch => item !== null),
				source: "Local Flashscore scraper",
				updatedAt: new Date().toISOString(),
			};
		}
		const sport = options?.sport ?? "football";
		if (!(await this.getSports()).sports.some((item) => item.slug === sport))
			throw new Error("Unknown sport");
		return this.fixturesCache.get(sport, () => this.fetchMatches(sport));
	}

	async getPricedMatches(input: { sport: string; cursor: number }) {
		return this.browseCache.get(`${input.sport}:${input.cursor}`, async () => {
			const fixtures = await this.getMatches({ sport: input.sport });
			const candidates = fixtures.matches.filter((match) =>
				["TRADING", "TRADING_LIVE"].includes(
					currentEventStatus(match.status, match.time),
				),
			);
			const batch = candidates.slice(input.cursor, input.cursor + 30);
			const prices = await this.getOdds(batch.map((match) => match.id));
			// Transport failures are distinct from genuine events without offered odds.
			if (
				batch.length &&
				Object.values(prices.odds).every((value) => value === null)
			)
				throw new Error("Prices are temporarily unavailable. Please retry.");
			const matches = batch.flatMap((match) => {
				const snapshot = prices.odds[match.id];
				if (
					!snapshot ||
					!snapshot.markets.some((market) =>
						market.selections.some(
							(offer) =>
								offer.active && offer.value !== null && Number(offer.value) > 1,
						),
					)
				)
					return [];
				return [
					{
						...match,
						odds: {
							...match.odds,
							result: snapshot.result ?? match.odds.result,
							resultSource: snapshot.result ? "Flashscore" : undefined,
							markets: snapshot.markets,
						},
					},
				];
			});
			const cursor = input.cursor + batch.length;
			return {
				...fixtures,
				matches,
				checked: batch.length,
				nextCursor: cursor < candidates.length ? cursor : null,
			};
		});
	}

	private async fetchMatches(sport: string): Promise<MatchesResponse> {
		const today = await this.request<MatchesPayload>(
			// The scraper defaults to today's fixtures. Keep this request minimal so
			// it also works with local scraper versions that expose fewer filters.
			`/matches?sport=${encodeURIComponent(sport)}`,
		);
		// Tomorrow and live are supplementary feeds; failures should not hide today's fixtures.
		const [tomorrow, live] = await Promise.all([
			this.request<MatchesPayload>(
				`/matches?sport=${encodeURIComponent(sport)}&day=1`,
			).catch((): MatchesPayload => ({ competitions: [] })),
			this.request<MatchesPayload>(
				`/matches/live?sport=${encodeURIComponent(sport)}`,
			).catch((): MatchesPayload => ({ competitions: [] })),
		]);

		const byId = new Map<
			string,
			{ match: MatchPayload; competition?: CompetitionPayload }
		>();
		for (const payload of [today, tomorrow, live]) {
			for (const group of payload.competitions ?? []) {
				for (const match of group.matches ?? []) {
					if (
						match.id &&
						match.home?.name &&
						match.away?.name &&
						match.start_time
					)
						byId.set(match.id, { match, competition: group.competition });
				}
			}
		}

		const finishedCutoff = Date.now() - FINISHED_MATCH_RETENTION_MS;
		const entries = [...byId.values()]
			.filter(({ match }) => {
				const kickoff = Date.parse(match.start_time ?? "");
				return !(
					normalizeStatus(match.status) === "RESULTED" &&
					Number.isFinite(kickoff) &&
					kickoff < finishedCutoff
				);
			})
			.sort(
				(left, right) =>
					Date.parse(left.match.start_time ?? "") -
					Date.parse(right.match.start_time ?? ""),
			);

		const sportName = today.sport?.name ?? sport;
		const matches = entries.flatMap(({ match, competition }) => {
			const event = this.mapMatch(match, competition, sportName);
			return event ? [event] : [];
		});

		return {
			matches,
			source: "Local Flashscore scraper" as const,
			updatedAt: new Date().toISOString(),
		};
	}

	private mapMatch(
		match: MatchPayload,
		competition: CompetitionPayload | undefined,
		sportName: string,
	): FootballMatch | null {
		if (
			!match.id ||
			!match.home?.name ||
			!match.away?.name ||
			!match.start_time ||
			!Number.isFinite(Date.parse(match.start_time))
		)
			return null;

		const home = match.home.name;
		const away = match.away.name;
		const country = competition?.country?.name ?? "International";
		return {
			id: match.id,
			provider: "Flashscore",
			sport: sportName,
			league: competition?.name ?? match.competition?.name ?? sportName,
			categoryName: country,
			categoryKey: toCategoryKey(country),
			time: match.start_time,
			home,
			away,
			homeMark: match.home?.short_name || home.slice(0, 3).toUpperCase(),
			awayMark: match.away?.short_name || away.slice(0, 3).toUpperCase(),
			score: normalizeScore(match),
			odds: {
				result: ["—", "—", "—"],
				markets: [],
				handicap: {
					homeLabel: "Home",
					awayLabel: "Away",
					home: "—",
					away: "—",
				},
				totals: {
					overLabel: "Over",
					underLabel: "Under",
					over: "—",
					under: "—",
				},
			},
			status: currentEventStatus(
				normalizeStatus(match.status),
				match.start_time,
			),
		};
	}

	async getOdds(ids: string[], options?: { fresh?: boolean }) {
		const odds: Record<string, FootballOddsSnapshot | null> = {};
		const uniqueIds = [...new Set(ids)];
		let nextIndex = 0;

		// Keep pressure on the local scraper bounded while allowing a batch to finish quickly.
		await Promise.all(
			Array.from(
				{ length: Math.min(ODDS_CONCURRENCY, uniqueIds.length) },
				async () => {
					while (nextIndex < uniqueIds.length) {
						const id = uniqueIds[nextIndex++];
						if (!id) continue;
						odds[id] = await this.oddsCache.get(
							id,
							async () => {
								try {
									const params = new URLSearchParams({
										match: id,
										geo: "TN",
									});
									const payload = await this.request<OddsPayload>(
										`/matches/odds?${params.toString()}`,
									);
									const markets: FootballOddsMarket[] = (
										payload.markets ?? []
									).map((market) => ({
										betType: market.bet_type ?? "UNKNOWN",
										scope: market.bet_scope ?? "UNKNOWN",
										bookmaker: market.bookmaker?.name ?? "Bookmaker",
										hasLiveBetting: Boolean(market.has_live_betting),
										selections: (market.selections ?? []).map((selection) => {
											const value = Number(selection.value);
											const openingValue = Number(selection.opening_value);
											return {
												selection:
													normalizeOfferLabel(selection.selection) ?? "Unknown",
												value:
													Number.isFinite(value) && value > 1
														? value.toFixed(2)
														: null,
												openingValue:
													Number.isFinite(openingValue) && openingValue > 1
														? openingValue.toFixed(2)
														: null,
												handicap: normalizeOfferLabel(selection.handicap),
												score: normalizeOfferLabel(selection.score),
												active: selection.is_active !== false,
											};
										}),
									}));
									return { result: getResultPrices(payload), markets };
								} catch {
									// Briefly cache failures to avoid hammering an unavailable scraper.
									return null;
								}
							},
							options?.fresh,
						);
					}
				},
			),
		);

		return {
			odds,
			priced: Object.values(odds).filter(
				(entry) =>
					entry &&
					(entry.result !== null ||
						entry.markets.some((market) =>
							market.selections.some((selection) => selection.value !== null),
						)),
			).length,
			total: uniqueIds.length,
		};
	}

	async getResults(ids: string[], options?: { fresh?: boolean }) {
		const results = await Promise.all(
			ids.map((id) =>
				this.resultCache.get(
					id,
					async (): Promise<FootballMatchResult | null> => {
						try {
							const params = new URLSearchParams({ match: id });
							const event = await this.request<MatchDetailsPayload>(
								`/matches/details?${params.toString()}`,
							);
							const status = [4, 5, 36, 37, 43].includes(event.stage_id ?? 0)
								? ((
										{
											4: "POST_TRADING",
											5: "CANCELLED",
											36: "INTERRUPTED",
											37: "INTERRUPTED",
											43: "POST_TRADING",
										} as Record<number, string>
									)[event.stage_id ?? 0] ?? "INTERRUPTED")
								: currentEventStatus(
										normalizeStatus(event.status),
										event.start_time ?? "",
									);
							const score =
								typeof event.home_score === "number" &&
								typeof event.away_score === "number"
									? { home: event.home_score, away: event.away_score }
									: null;
							const base = {
								sport: event.sport?.name,
								winner: event.winner ?? null,
								completedNormally:
									event.stage_id === 3 && status === "RESULTED",
								id,
								status,
								score,
								stage: event.stage,
								regulationScore:
									event.stage_id === 3 && status === "RESULTED" ? score : null,
							};
							if (
								event.sport?.name !== "Football" ||
								(status !== "TRADING_LIVE" && status !== "RESULTED")
							)
								return base;

							// The scraper exposes corners/card counts in the statistics tab and
							// player card incidents in the summary tab. Load these only once the
							// match is final, so the periodic pending-bet poll stays bounded.
							const [statistics, summary] = await Promise.all([
								status === "RESULTED"
									? this.request<StatisticsPayload>(
											`/matches/statistics?${params.toString()}`,
										).catch(() => null)
									: Promise.resolve(null),
								this.request<SummaryPayload>(
									`/matches/summary?${params.toString()}`,
								).catch(() => null),
							]);
							const stats: NonNullable<FootballMatchResult["statistics"]> = {};
							for (const period of statistics?.periods ?? []) {
								const periodKey = normalizePeriodKey(period.period);
								for (const group of period.groups ?? []) {
									for (const stat of group.statistics ?? []) {
										if (!stat.name) continue;
										stats[`${periodKey}:${stat.name.toLowerCase()}`] = {
											home: parseStatValue(stat.home_value),
											away: parseStatValue(stat.away_value),
										};
									}
								}
							}
							const incidents = summary
								? (summary.periods ?? []).flatMap((period) =>
										(period.incidents ?? []).map((incident) => ({
											type: incident.type ?? "",
											reason: incident.reason ?? "",
											period: normalizePeriodKey(period.period),
											team: incident.team ?? null,
											player:
												typeof incident.player === "string"
													? incident.player
													: (incident.player?.name ?? null),
										})),
									)
								: undefined;
							const minutes = (summary?.periods ?? [])
								.flatMap((period) =>
									(period.incidents ?? []).map((incident) => incident.minute),
								)
								.filter(
									(minute): minute is string =>
										typeof minute === "string" &&
										/^\d{1,3}(?:\+\d{1,2})?[′']?$/.test(minute),
								);
							const rank = (minute: string) =>
								minute
									.replace(/[′']/g, "")
									.split("+")
									.reduce((sum, part) => sum + Number(part), 0);
							minutes.sort((a, b) => rank(b) - rank(a));
							return {
								...base,
								latestEventMinute: minutes[0]?.replace(/[′']/g, "") ?? null,
								statistics: stats,
								incidents,
							};
						} catch {
							return null;
						}
					},
					options?.fresh,
				),
			),
		);
		return { results: results.filter((result) => result !== null) };
	}
}

function parseStatValue(value: number | string | null | undefined) {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;
	const parsed = Number(value.replace(/%$/, "").trim());
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizePeriodKey(value?: string | null) {
	const period = (value ?? "full_time").toLowerCase();
	if (period.includes("first") || period.includes("1st")) return "first_half";
	if (period.includes("second") || period.includes("2nd")) return "second_half";
	return "full_time";
}

export const flashscoreService: FlashscoreService = new FlashscoreClient();
