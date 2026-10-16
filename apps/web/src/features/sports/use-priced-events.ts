"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { orpc } from "@/utils/orpc";

export function usePricedEvents(sport: string) {
	const sports = useQuery(
		orpc.flashscore.sports.queryOptions({ staleTime: 300_000, retry: false }),
	);
	const events = useInfiniteQuery({
		queryKey: ["flashscore", "priced-events", sport],
		queryFn: ({ pageParam }) =>
			orpc.flashscore.browse.call({ sport, cursor: pageParam }),
		initialPageParam: 0,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry: false,
	});
	const matches = useMemo(
		() =>
			Array.from(
				new Map(
					(events.data?.pages ?? [])
						.flatMap((page) => page.matches)
						.map((match) => [match.id, match]),
				).values(),
			),
		[events.data],
	);
	// Skip empty opening batches without an unbounded crawl through the schedule.
	useEffect(() => {
		if (
			events.hasNextPage &&
			!events.isFetching &&
			!events.isError &&
			matches.length === 0 &&
			(events.data?.pages.length ?? 0) < 5
		)
			void events.fetchNextPage();
	}, [
		events.hasNextPage,
		events.isFetching,
		events.isError,
		events.fetchNextPage,
		events.data?.pages.length,
		matches.length,
	]);
	const regions = useMemo(
		() =>
			Array.from(
				new Map(
					matches.map((match) => [
						match.categoryKey,
						{ key: match.categoryKey, name: match.categoryName },
					]),
				).values(),
			),
		[matches],
	);
	return {
		sports,
		events,
		matches,
		regions,
		featuredMatch:
			matches.find((match) => match.status === "TRADING_LIVE") ?? matches[0],
	};
}
