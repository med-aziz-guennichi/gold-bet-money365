import type { FootballOddsSnapshot } from "@gold-bet-clean-money365/api/football";
import {
	type UseQueryResult,
	useQueries,
	useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { orpc } from "@/utils/orpc";
import { oddsQueryOptions } from "./odds-query";
import type { Match, Region } from "./types";

type OddsResponse = Awaited<ReturnType<typeof orpc.flashscore.odds.call>>;

function combineOdds(queries: UseQueryResult<OddsResponse>[]) {
	const pricesByMatch: Record<string, FootballOddsSnapshot | null> = {};
	for (const query of queries) Object.assign(pricesByMatch, query.data?.odds);
	return {
		pricesByMatch,
		oddsLoading: queries.some((query) => query.isPending),
		oddsError: queries.find((query) => query.error)?.error?.message ?? "",
	};
}

/** Loads fixtures and caches odds only for the requested visible matches. */
export function useFlashscoreMatches(oddsMatchIds: string | string[] = []) {
	const matchesQuery = useQuery(
		orpc.flashscore.matches.queryOptions({
			input:
				typeof oddsMatchIds === "string" ? { ids: [oddsMatchIds] } : undefined,
			staleTime: 5_000,
			refetchInterval: 15_000,
			refetchOnWindowFocus: false,
			retry: false,
		}),
	);
	const fixtureMatches: Match[] = matchesQuery.data?.matches ?? [];
	// Canonical batches share query keys across renders and fixture reorderings.
	const oddsIds = [
		...new Set(
			typeof oddsMatchIds === "string" ? [oddsMatchIds] : oddsMatchIds,
		),
	].sort();
	const batches: string[][] = [];
	for (let offset = 0; offset < oddsIds.length; offset += 30) {
		batches.push(oddsIds.slice(offset, offset + 30));
	}
	const { pricesByMatch, oddsLoading, oddsError } = useQueries({
		combine: combineOdds,
		queries: batches.map((ids) => ({
			...oddsQueryOptions(ids, (matchIds) =>
				orpc.flashscore.odds.call({ ids: matchIds }),
			),
			staleTime: 10_000,
			refetchInterval: fixtureMatches.some(
				(match) =>
					ids.includes(match.id) &&
					["TRADING", "TRADING_LIVE"].includes(match.status),
			)
				? 15_000
				: false,
			refetchOnWindowFocus: true,
		})),
	});
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
					fixtureMatches
						.filter((match) => match.categoryKey)
						.map((match) => [
							match.categoryKey,
							{ key: match.categoryKey, name: match.categoryName },
						]),
				).values(),
			),
		[fixtureMatches],
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
