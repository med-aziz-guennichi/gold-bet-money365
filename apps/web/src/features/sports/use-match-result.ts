import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { orpc, queryClient } from "@/utils/orpc";

/** Only scores/status refresh here; price queries retain their separate cache policy. */
export function useMatchResult(id: string) {
	return useQuery(
		orpc.flashscore.results.queryOptions({
			input: { ids: [id] },
			queryKey: ["flashscore", "result", id],
			enabled: /^[A-Za-z0-9]{8}$/.test(id),
			staleTime: 5_000,
			retry: false,
			refetchInterval: (query) =>
				["RESULTED", "CANCELLED"].includes(
					query.state.data?.results[0]?.status ?? "",
				)
					? false
					: 15_000,
		}),
	);
}

export function useLiveMatchState(id: string) {
	const query = useQuery(
		orpc.flashscore.states.queryOptions({
			input: { ids: [id] },
			queryKey: ["flashscore", "state", id],
			enabled: /^[A-Za-z0-9]{8}$/.test(id),
			staleTime: 5_000,
			refetchInterval: (query) =>
				["RESULTED", "CANCELLED"].includes(
					query.state.data?.results[0]?.status ?? "",
				)
					? false
					: 15_000,
			retry: false,
		}),
	);
	const status = query.data?.results[0]?.status;
	useEffect(() => {
		if (["RESULTED", "CANCELLED"].includes(status ?? ""))
			void queryClient.invalidateQueries({
				queryKey: ["flashscore", "priced-events"],
			});
	}, [status]);
	return query;
}
