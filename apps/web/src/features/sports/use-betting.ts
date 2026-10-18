import { parseAmount } from "@gold-bet-clean-money365/api/access";
import type { PlaceBetInput } from "@gold-bet-clean-money365/api/betting";
import { calculateBetReturn } from "@gold-bet-clean-money365/api/betting-money";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { sameMarket } from "./selection-key";
import type { Match, Selection } from "./types";
import { isMatchUnavailable } from "./utils";

/** The browser owns only the unsubmitted slip. Wallets and bets come from the API. */
export function useBetting() {
	const cache = useQueryClient();
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const userId = session?.user.id;
	const eligible = session?.user.role === "user";
	const [slip, setSlip] = useState<{
		userId?: string;
		selected: Selection[];
		stake: string;
	}>({ selected: [], stake: "10" });
	const [status, setStatus] = useState<{ userId?: string; text: string }>({
		text: "",
	});
	const selected = slip.userId === userId ? slip.selected : [];
	const stake = slip.userId === userId ? slip.stake : "10";
	const notice = status.userId === userId ? status.text : "";
	const request = useRef<{ signature: string; input: PlaceBetInput } | null>(
		null,
	);
	const wallet = useQuery(
		orpc.accounts.wallet.queryOptions({
			queryKey: ["management", userId, "wallet"],
			enabled: eligible,
			staleTime: 10_000,
			refetchInterval: 30_000,
			retry: false,
		}),
	);
	const history = useQuery(
		orpc.bets.mine.queryOptions({
			input: { page: 1, limit: 10 },
			queryKey: ["bets", userId],
			refetchInterval: 30_000,
			enabled: eligible,
			retry: false,
		}),
	);
	async function refresh(ownerId: string) {
		await Promise.all([
			cache.invalidateQueries({ queryKey: ["management", ownerId, "wallet"] }),
			cache.invalidateQueries({ queryKey: ["bets", ownerId] }),
		]);
	}
	const place = useMutation({
		gcTime: 0,
		retry: false,
		mutationFn: ({ input }: { ownerId: string; input: PlaceBetInput }) =>
			orpc.bets.place.call(input),
		onSuccess: async (_bet, variables) => {
			setSlip((current) =>
				current.userId === variables.ownerId
					? { ...current, selected: [] }
					: current,
			);
			setStatus({
				userId: variables.ownerId,
				text: "Bet placed and saved. Your stake was deducted from your wallet.",
			});
			request.current = null;
			await refresh(variables.ownerId);
			place.reset();
		},
		onError: async (error, variables) => {
			setStatus({
				userId: variables.ownerId,
				text:
					error.message ||
					"Could not confirm the bet. Check recent bets before trying again.",
			});
			await Promise.all([
				refresh(variables.ownerId),
				cache.invalidateQueries({ queryKey: ["flashscore", "odds"] }),
			]);
		},
	});
	const eligibilityMessage = sessionLoading
		? "Checking your account…"
		: !session
			? "Log in with a user account to place a bet."
			: !eligible
				? "Only accounts with the user role can place bets."
				: "";
	function togglePick(
		match: Match,
		outcome: string,
		odd: string,
		market?: Selection["market"],
	) {
		if (
			match.sport !== "Football" &&
			(market?.type !== "HOME_AWAY" || market.scope !== "FULL_TIME")
		) {
			setStatus({
				userId,
				text: "Only full-match winner bets are currently supported for this sport.",
			});
			return;
		}
		if (!eligible || !userId) {
			setStatus({ userId, text: eligibilityMessage });
			return;
		}
		if (
			place.isPending ||
			odd === "—" ||
			isMatchUnavailable(match.status) ||
			!market
		)
			return;
		const picks = selected.some(
			(pick) => pick.match.id === match.id && sameMarket(pick.market, market),
		)
			? selected.filter((pick) => pick.match.id !== match.id)
			: [
					...selected.filter((pick) => pick.match.id !== match.id),
					{ match, outcome, odd, market },
				];
		if (picks.length > 10) {
			setStatus({ userId, text: "Choose at most 10 matches per bet." });
			return;
		}
		setSlip({ userId, selected: picks, stake });
		setStatus({ userId, text: "" });
	}
	function setStake(value: string) {
		if (!place.isPending) setSlip({ userId, selected, stake: value });
	}
	function removePick(matchId: string, outcome: string) {
		if (!place.isPending)
			setSlip({
				userId,
				stake,
				selected: selected.filter(
					(pick) =>
						String(pick.match.id) !== matchId || pick.outcome !== outcome,
				),
			});
	}
	let stakeMillimes = 0;
	let potentialReturnMillimes = 0;
	let totalOdds = 1;
	let stakeError = "";
	try {
		stakeMillimes = parseAmount(stake);
		if (stakeMillimes <= 0) throw new Error("Enter a stake greater than zero.");
		const preview = selected.length
			? calculateBetReturn(
					stakeMillimes,
					selected.map((pick) => pick.odd),
				)
			: { potentialReturnMillimes: 0, totalOdds: 1 };
		potentialReturnMillimes = preview.potentialReturnMillimes;
		totalOdds = preview.totalOdds;
	} catch (error) {
		stakeError = error instanceof Error ? error.message : "Invalid stake.";
	}
	const balanceMillimes = wallet.data?.balanceMillimes ?? 0;
	function placeBet() {
		if (!eligible || !userId) {
			setStatus({ userId, text: eligibilityMessage });
			return;
		}
		if (place.isPending) return;
		const error = !selected.length
			? "Add at least one pick."
			: stakeError ||
				(stakeMillimes > balanceMillimes
					? "Your wallet credits are too low for this stake."
					: "");
		if (error) {
			setStatus({ userId, text: error });
			return;
		}
		const picks = selected.map((pick) => ({
			matchId: String(pick.match.id),
			expectedOdd: pick.odd,
			market: pick.market as NonNullable<Selection["market"]>,
		}));
		const signature = JSON.stringify({ userId, stake, picks });
		if (request.current?.signature !== signature)
			request.current = {
				signature,
				input: { requestId: crypto.randomUUID(), stake, picks },
			};
		place.mutate({ ownerId: userId, input: request.current.input });
	}
	const slipProps = {
		currency: wallet.data?.currency ?? "TND",
		selected,
		stake,
		balanceMillimes,
		bets: history.data?.items ?? [],
		notice:
			notice ||
			wallet.error?.message ||
			history.error?.message ||
			(eligible && selected.length && !wallet.isPending
				? stakeError ||
					(stakeMillimes > balanceMillimes
						? "Your wallet credits are too low for this stake."
						: "")
				: ""),
		totalOdds,
		potentialReturnMillimes,
		eligibilityMessage,
		walletLoading: eligible && wallet.isPending,
		historyLoading: eligible && history.isPending,
		placing: place.isPending,
		canPlace:
			eligible &&
			!place.isPending &&
			!wallet.isPending &&
			!wallet.error &&
			selected.length > 0 &&
			!stakeError &&
			stakeMillimes <= balanceMillimes,
		onStakeChange: setStake,
		onRemove: removePick,
		onPlace: placeBet,
	};
	return { selected, togglePick, slipProps };
}
