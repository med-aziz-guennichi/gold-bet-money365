"use client";

import { useState } from "react";
import { MatchCenter } from "@/components/sports/match-center";
import {
	HeroSection,
	HighlightsSection,
	SiteHeader,
} from "@/components/sports/page-chrome";
import { useI18n } from "@/features/i18n/locale-provider";
import { useBetting } from "@/features/sports/use-betting";
import { usePricedEvents } from "@/features/sports/use-priced-events";

/** Route composition: data and betting behavior live in feature hooks. */
export default function Home() {
	const [sport, setSport] = useState("football");
	const eventsFeed = usePricedEvents(sport);
	const { t } = useI18n();
	const betting = useBetting();

	return (
		<main className="min-h-screen bg-[#080b0a] text-[#f4f5f2]">
			<SiteHeader />
			<div
				id="top"
				className="mx-auto max-w-[1440px] px-4 pt-8 pb-16 sm:px-8 sm:pt-10"
			>
				<HeroSection featuredMatch={eventsFeed.featuredMatch} />
				<div className="mt-8 flex min-w-0 flex-wrap items-center gap-3">
					<label htmlFor="sport-filter" className="font-bold text-sm">
						{t("Sport")}
					</label>
					<select
						id="sport-filter"
						value={sport}
						onChange={(event) => setSport(event.target.value)}
						className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#111713] px-4 py-3 text-sm sm:max-w-sm"
					>
						{!eventsFeed.sports.data && (
							<option value="football">{t("Football")}</option>
						)}
						{eventsFeed.sports.data?.sports.map((item) => (
							<option key={item.slug} value={item.slug}>
								{t(item.name)}
							</option>
						))}
					</select>
					<span className="text-white/50 text-xs">
						{t("Only games with active odds are shown.")}
					</span>
				</div>
				{eventsFeed.sports.error && (
					<p role="alert" className="mt-3 text-red-300 text-sm">
						{t("Sports are temporarily unavailable. Please retry.")}
					</p>
				)}
				{eventsFeed.sports.data?.sports.find((item) => item.slug === sport)
					?.format === "leaderboard" && (
					<p role="status" className="mt-3 text-sm text-white/60">
						{t(
							"This sport uses leaderboards. Head-to-head odds are not available from this feed.",
						)}
					</p>
				)}
				{sport !== "football" && (
					<p className="mt-3 text-white/60 text-xs">
						{t(
							"Other sports: full-match winner bets are supported. Other markets are display-only; uncertain or retired results require review.",
						)}
					</p>
				)}
				<MatchCenter
					key={sport}
					matches={eventsFeed.matches}
					regions={eventsFeed.regions}
					loading={eventsFeed.events.isFetching && !eventsFeed.matches.length}
					error={
						eventsFeed.events.error
							? t("Games and prices are temporarily unavailable. Please retry.")
							: undefined
					}
					selected={betting.selected}
					onPick={betting.togglePick}
					slip={betting.slipProps}
				/>
				{eventsFeed.events.hasNextPage && (
					<button
						type="button"
						disabled={eventsFeed.events.isFetching}
						onClick={() => void eventsFeed.events.fetchNextPage()}
						className="mt-5 w-full rounded-xl border border-white/15 px-5 py-3 font-bold text-sm disabled:opacity-50"
					>
						{t(
							eventsFeed.events.isFetching
								? "Checking prices…"
								: "Load more priced games",
						)}
					</button>
				)}
				{eventsFeed.events.isError && (
					<button
						type="button"
						onClick={() => void eventsFeed.events.refetch()}
						className="mt-4 rounded-xl border border-white/15 px-5 py-3 text-sm"
					>
						{t("Retry")}
					</button>
				)}
				<HighlightsSection />
			</div>
		</main>
	);
}
