import type {
  FlashscoreService,
  FootballMatch,
  FootballMatchResult,
  FootballOddsMarket,
  FootballOddsSnapshot,
} from "@gold-bet-clean-money365/api/football";

import { ENV } from "../env.server";

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
type MatchesPayload = { competitions?: CompetitionGroupPayload[] };
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
type MatchDetailsPayload = {
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
      const serializedValue = text.match(
        /["']?value["']?\s*:\s*["']?([^,"'}\]]+)["']?/i,
      )?.[1]?.trim();
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
// Keep fixture refreshes below the scraper's rate limit and serve the last good
// snapshot during brief upstream throttling or outages.
const MATCHES_CACHE_TTL_MS = 90 * 1000;
const MATCHES_STALE_TTL_MS = 10 * 60 * 1000;

type MatchesResponse = Awaited<ReturnType<FlashscoreService["getMatches"]>>;
let matchesCache: { value: MatchesResponse; fetchedAt: number } | undefined;
let matchesRequest: Promise<MatchesResponse> | undefined;

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
  const value = (status ?? "scheduled").trim().toLowerCase();
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
  return "TRADING";
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
class FlashscoreClient implements FlashscoreService {
  private readonly baseUrl = (
    ENV.FLASHSCORE_API_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  private async request<T>(path: string): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    const apiKey = ENV.FLASHSCORE_API_KEY?.trim();
    if (apiKey) headers.set("API-Key", apiKey);

    const response = await fetch(new URL(path, `${this.baseUrl}/`), {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const details = (await response.text()).trim().slice(0, 500);
      throw new Error(
        `Flashscore scraper returned HTTP ${response.status} for ${path}.${details ? ` Response: ${details}` : ""}`,
      );
    }
    return (await response.json()) as T;
  }

  getMatches(): Promise<MatchesResponse> {
    const now = Date.now();
    if (matchesCache && now - matchesCache.fetchedAt < MATCHES_CACHE_TTL_MS)
      return Promise.resolve(matchesCache.value);
    if (matchesRequest) return matchesRequest;

    const request = this.fetchMatches()
      .then((value) => {
        matchesCache = { value, fetchedAt: Date.now() };
        return value;
      })
      .catch((error: unknown) => {
        // A stale but previously successful feed is more useful than a blank
        // page when Flashscore temporarily responds with HTTP 429.
        if (
          matchesCache &&
          Date.now() - matchesCache.fetchedAt < MATCHES_STALE_TTL_MS
        )
          return matchesCache.value;
        throw error;
      })
      .finally(() => {
        matchesRequest = undefined;
      });
    matchesRequest = request;
    return request;
  }

  private async fetchMatches(): Promise<MatchesResponse> {
    const today = await this.request<MatchesPayload>(
      // The scraper defaults to today's fixtures. Keep this request minimal so
      // it also works with local scraper versions that expose fewer filters.
      "/matches?sport=football",
    );
    // Tomorrow and live are supplementary feeds; failures should not hide today's fixtures.
    const [tomorrow, live] = await Promise.all([
      this.request<MatchesPayload>(
        "/matches?sport=football&day=1",
      ).catch((): MatchesPayload => ({ competitions: [] })),
      this.request<MatchesPayload>(
        "/matches/live?sport=football",
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
          Date.parse(left.match.start_time!) -
          Date.parse(right.match.start_time!),
      );

    const matches: FootballMatch[] = entries.map(({ match, competition }) => {
      const home = match.home!.name!;
      const away = match.away!.name!;
      const country = competition?.country?.name ?? "International";
      return {
        id: match.id!,
        provider: "Flashscore",
        sport: "Football",
        league: competition?.name ?? match.competition?.name ?? "Football",
        categoryName: country,
        categoryKey: toCategoryKey(country),
        time: match.start_time!,
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
        status: normalizeStatus(match.status),
      };
    });

    return {
      matches,
      source: "Local Flashscore scraper" as const,
      updatedAt: new Date().toISOString(),
    };
  }

  async getOdds(ids: string[]) {
    const odds: Record<string, FootballOddsSnapshot | null> = {};
    let nextIndex = 0;

    // Keep pressure on the local scraper bounded while allowing a batch to finish quickly.
    await Promise.all(
      Array.from({ length: Math.min(ODDS_CONCURRENCY, ids.length) }, async () => {
        while (nextIndex < ids.length) {
          const id = ids[nextIndex++];
          if (!id) continue;
          try {
            const params = new URLSearchParams({
              match: id,
              geo: "TN",
            });
            const payload = await this.request<OddsPayload>(
              `/matches/odds?${params.toString()}`,
            );
            const markets: FootballOddsMarket[] = (payload.markets ?? []).map(
              (market) => ({
                betType: market.bet_type ?? "UNKNOWN",
                scope: market.bet_scope ?? "UNKNOWN",
                bookmaker: market.bookmaker?.name ?? "Bookmaker",
                hasLiveBetting: Boolean(market.has_live_betting),
                selections: (market.selections ?? []).map((selection) => {
                  const value = Number(selection.value);
                  const openingValue = Number(selection.opening_value);
                  return {
                    selection: normalizeOfferLabel(selection.selection) ?? "Unknown",
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
              }),
            );
            odds[id] = { result: getResultPrices(payload), markets };
          } catch {
            odds[id] = null;
          }
        }
      }),
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
      total: ids.length,
    };
  }

  async getResults(ids: string[]) {
    const results = await Promise.all(
      ids.map(async (id): Promise<FootballMatchResult | null> => {
        try {
          const params = new URLSearchParams({ match: id });
          const event = await this.request<MatchDetailsPayload>(
            `/matches/details?${params.toString()}`,
          );
          const status = normalizeStatus(event.status);
          const score =
            typeof event.home_score === "number" &&
            typeof event.away_score === "number"
              ? { home: event.home_score, away: event.away_score }
              : null;
          if (!score || status !== "RESULTED") return { id, status, score };

          // The scraper exposes corners/card counts in the statistics tab and
          // player card incidents in the summary tab. Load these only once the
          // match is final, so the periodic pending-bet poll stays bounded.
          const [statistics, summary] = await Promise.all([
            this.request<StatisticsPayload>(
              `/matches/statistics?${params.toString()}`,
            ).catch(() => null),
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
                      : incident.player?.name ?? null,
                })),
              )
            : undefined;
          return { id, status, score, statistics: stats, incidents };
        } catch {
          return null;
        }
      }),
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
