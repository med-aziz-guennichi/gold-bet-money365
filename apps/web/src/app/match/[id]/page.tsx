"use client";

import { currentEventStatus } from "@gold-bet-clean-money365/api/event-status";
import { ArrowLeft, Clock3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BetSlip } from "@/components/sports/bet-slip";
import { MarketOffers } from "@/components/sports/market-offers";
import { SiteHeader } from "@/components/sports/page-chrome";
import { PrimaryOdds } from "@/components/sports/primary-odds";
import { useI18n } from "@/features/i18n/locale-provider";
import { sportsHomeHref } from "@/features/sports/navigation";
import { useBetting } from "@/features/sports/use-betting";
import { useEventClock } from "@/features/sports/use-event-clock";
import { useFlashscoreMatches } from "@/features/sports/use-flashscore-matches";
import { useMatchResult } from "@/features/sports/use-match-result";
import { formatKickoff, isMatchUnavailable } from "@/features/sports/utils";

export default function MatchPage() {
	const { t, locale } = useI18n();
	const params = useParams<{ id: string }>();
	const matchId = decodeURIComponent(params.id);
	const football = useFlashscoreMatches(matchId);
	const betting = useBetting();
	const resultQuery = useMatchResult(matchId);
	const now = useEventClock();
	const statusFresh =
		!resultQuery.isError && resultQuery.dataUpdatedAt > now - 90_000;
	const result = resultQuery.data?.results[0];
	const fixture = football.matches.find((item) => String(item.id) === matchId);
	const match = fixture
		? {
				...fixture,
				status:
					statusFresh && result
						? currentEventStatus(result.status, fixture.time, now)
						: "UNKNOWN",
				score: result?.score ?? fixture.score,
			}
		: undefined;
	const isLive = match?.status === "TRADING_LIVE";

	return (
		<main className="min-h-screen bg-[#080b0a] text-[#f4f5f2]">
			<SiteHeader />
			<div className="mx-auto max-w-[1100px] space-y-6 px-4 pt-8 pb-16 sm:px-8">
				<Link
					href={sportsHomeHref(match?.sport)}
					className="inline-flex items-center gap-2 font-semibold text-sm text-white/55 transition hover:text-white"
				>
					<ArrowLeft size={15} /> {t("Back to matches")}
				</Link>

				{football.matchesQuery.isLoading ? (
					<PanelMessage>{t("Loading match details…")}</PanelMessage>
				) : football.matchesQuery.error ? (
					<PanelMessage>{football.matchesQuery.error.message}</PanelMessage>
				) : !match ? (
					<PanelMessage>
						{t(
							"This match is no longer in the current Flashscore fixture feed. Go back to the match list and open a current fixture.",
						)}
					</PanelMessage>
				) : (
					<>
						<section className="rounded-2xl border border-white/[.08] bg-[#111713] p-5 sm:p-8">
							<div className="flex flex-wrap items-center gap-2 font-semibold text-white/45 text-xs">
								<span>{match.categoryName}</span>
								<span>·</span>
								<span>{match.league}</span>
								<span className="ms-auto inline-flex items-center gap-1.5">
									{isLive ? (
										<span className="inline-flex items-center gap-1.5 text-[#ff867a]">
											<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff867a]" />
											{t("LIVE")} {result?.stage ? ` · ${t(result.stage)}` : ""}
										</span>
									) : (
										<>
											<Clock3 size={13} /> {formatKickoff(match.time, locale)}
										</>
									)}
								</span>
							</div>
							<div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
								<div className="text-right">
									<p className="font-extrabold text-lg sm:text-2xl">
										{match.home}
									</p>
									<p className="mt-1 text-white/40 text-xs">{t("Home team")}</p>
								</div>
								<span className="font-extrabold text-2xl text-white tabular-nums">
									{match.score.home !== null && match.score.away !== null
										? `${match.score.home} – ${match.score.away}`
										: t("vs")}
								</span>
								<div>
									<p className="font-extrabold text-lg sm:text-2xl">
										{match.away}
									</p>
									<p className="mt-1 text-white/40 text-xs">{t("Away")}</p>
								</div>
							</div>
							{isLive && (
								<p
									className="mt-4 text-center text-white/55 text-xs"
									aria-live="polite"
								>
									{result?.latestEventMinute
										? `${t("Latest event")}: ${result.latestEventMinute}′`
										: t("Waiting for match minute from provider.")}
								</p>
							)}
							{match.status === "RESULTED" && (
								<p className="mt-4 text-center text-[#c6f36b] text-xs">
									{t("Match finished")}
								</p>
							)}
							{["UNKNOWN", "AWAITING_RESULTS"].includes(match.status) && (
								<p
									role="status"
									className="mt-4 text-center text-amber-300 text-xs"
								>
									{t(
										"Betting paused: waiting for a verified current match status.",
									)}
								</p>
							)}
							<p className="mt-2 text-center text-white/45 text-xs">
								{t("Match times: Tunisia (UTC+1)")}
							</p>
							{resultQuery.isError && (
								<p className="mt-3 text-center text-amber-300 text-xs">
									{t("Live update unavailable. Showing last reported score.")}
								</p>
							)}
							<div className="mt-7">
								<PrimaryOdds
									match={match}
									selected={betting.selected}
									onPick={betting.togglePick}
									disabled={isMatchUnavailable(match.status)}
								/>
							</div>
						</section>

						{football.oddsError && (
							<PanelMessage>
								{t("Could not refresh additional prices")}: {football.oddsError}
							</PanelMessage>
						)}
						<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
							<section className="space-y-3">
								<div>
									<h1 className="font-extrabold text-xl tracking-tight">
										{t("All offers")}
									</h1>
									<p className="mt-1 text-white/45 text-xs">
										{t("Prices and markets supplied by Flashscore.")}
									</p>
								</div>
								{football.oddsLoading && match.odds.markets.length === 0 ? (
									<PanelMessage>{t("Loading Flashscore offers…")}</PanelMessage>
								) : (
									<MarketOffers
										match={match}
										selected={betting.selected}
										onPick={betting.togglePick}
									/>
								)}
							</section>
							<BetSlip {...betting.slipProps} />
						</div>
					</>
				)}
			</div>
		</main>
	);
}

function PanelMessage({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-2xl border border-white/[.08] bg-[#111014] p-6 text-sm text-white/55">
			{children}
		</div>
	);
}
