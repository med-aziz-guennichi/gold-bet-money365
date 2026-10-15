import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";
import type {
  FootballOddsSnapshot,
} from "@gold-bet-clean-money365/api/football";
import type { Match, Region } from "./types";

/** Loads fixtures and all odds through the server-side Flashscore service. */
export function useFlashscoreMatches(oddsMatchId?: string) {
  const [pricesByMatch, setPricesByMatch] = useState<
    Record<string, FootballOddsSnapshot | null>
  >({});
  const [oddsLoading, setOddsLoading] = useState(false);
  const [oddsError, setOddsError] = useState("");
  const matchesQuery = useQuery(
    orpc.flashscore.matches.queryOptions({
      staleTime: 45 * 1000,
      refetchInterval: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
    }),
  );
  const fixtureMatches: Match[] = matchesQuery.data?.matches ?? [];
  const oddsIds = oddsMatchId
    ? [oddsMatchId]
    : fixtureMatches.map((match) => String(match.id));
  const fixtureIdKey = JSON.stringify(oddsIds);

  useEffect(() => {
    const ids = JSON.parse(fixtureIdKey) as string[];
    if (!ids.length) {
      setOddsLoading(false);
      setOddsError("");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setOddsLoading(true);
    setOddsError("");

    async function loadOdds() {
      try {
        for (let offset = 0; offset < ids.length; offset += 30) {
          const batch = await orpc.flashscore.odds.call(
            { ids: ids.slice(offset, offset + 30) },
            { signal: controller.signal },
          );
          if (cancelled) return;
          setPricesByMatch((current) => ({ ...current, ...batch.odds }));
        }
      } catch (error) {
        if (!cancelled && !controller.signal.aborted)
          setOddsError(
            error instanceof Error
              ? error.message
              : "Could not load Flashscore prices.",
          );
      } finally {
        if (!cancelled) setOddsLoading(false);
      }
    }

    void loadOdds();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fixtureIdKey, matchesQuery.dataUpdatedAt]);

  const matches = useMemo(
    () =>
      fixtureMatches.map((match) => {
        const snapshot = pricesByMatch[String(match.id)];
        if (!snapshot) return match;
        return {
          ...match,
          odds: {
            ...match.odds,
            result: snapshot.result ?? match.odds.result,
            ...(snapshot.result ? { resultSource: "Flashscore" } : {}),
            markets: snapshot.markets,
          },
        };
      }),
    [fixtureMatches, pricesByMatch],
  );
  const pricedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.odds.result.every((odd) => odd !== "—") ||
          match.odds.markets.some((market) =>
            market.selections.some((selection) => selection.value !== null),
          ),
      ),
    [matches],
  );
  const regions = useMemo<Region[]>(
    () =>
      Array.from(
        new Map(
          pricedMatches
            .filter((match) => match.categoryKey)
            .map((match) => [
              match.categoryKey,
              { key: match.categoryKey, name: match.categoryName },
            ]),
        ).values(),
      ),
    [pricedMatches],
  );
  const featuredMatch =
    pricedMatches.find((match) => match.status === "TRADING_LIVE") ??
    pricedMatches[0];

  return {
    matchesQuery,
    fixtureMatches,
    matches,
    pricedMatches,
    regions,
    featuredMatch,
    oddsLoading,
    oddsError,
  };
}
