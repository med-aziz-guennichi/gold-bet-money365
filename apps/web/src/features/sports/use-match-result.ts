import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/** Only scores/status refresh here; price queries retain their separate cache policy. */
export function useMatchResult(id: string) {
	return useQuery(
		orpc.flashscore.results.queryOptions({
			input: { ids: [id] },
			queryKey: ["flashscore", "result", id],
			enabled: /^[A-Za-z0-9]{8}$/.test(id),
			staleTime: 20_000,
			retry: false,
			refetchInterval: (query) =>
				["RESULTED", "CANCELLED"].includes(
					query.state.data?.results[0]?.status ?? "",
				)
					? false
					: 30_000,
		}),
	);
}
