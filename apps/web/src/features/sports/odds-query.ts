import { queryOptions } from "@tanstack/react-query";

/** Keep a read in flight across remounts so Strict Mode cannot send it twice. */
export function oddsQueryOptions<T>(
	ids: string[],
	load: (ids: string[]) => Promise<T>,
) {
	const matchIds = [...new Set(ids)].sort();
	return queryOptions({
		queryKey: ["flashscore", "odds", { ids: matchIds }] as const,
		queryFn: () => load(matchIds),
		staleTime: 60_000,
		gcTime: 300_000,
		refetchInterval: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
	});
}
