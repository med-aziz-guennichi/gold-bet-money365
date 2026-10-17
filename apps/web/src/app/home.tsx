"use client";

import { Button } from "@gold-bet-clean-money365/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gold-bet-clean-money365/ui/components/select";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
	return (
		<Suspense
			fallback={
				<main className="min-h-screen bg-[#080b0a] text-white">
					<SiteHeader />
					<div className="p-8" role="status">
						Loading…
					</div>
				</main>
			}
		>
			<HomeContent />
		</Suspense>
	);
}

function HomeContent() {
	const params = useSearchParams();
	const router = useRouter();
	const requested = params.get("sport") ?? "football";
	const sport = /^[a-z][a-z-]{0,40}$/.test(requested) ? requested : "football";
	function setSport(value: string | null) {
		if (!value) return;
		const next = new URLSearchParams(params.toString());
		next.set("sport", value);
		router.push(`/?${next.toString()}`, { scroll: false });
	}

	const requestedDay = Number(params.get("day") ?? 0);
	const day = [-1, 0, 1, 2].includes(requestedDay) ? requestedDay : 0;
	const eventsFeed = usePricedEvents(sport, day);
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
					<Select
						value={sport}
						onValueChange={setSport}
						items={(
							eventsFeed.sports.data?.sports ?? [{ slug: sport, name: sport }]
						).map((item) => ({ value: item.slug, label: t(item.name) }))}
					>
						<SelectTrigger
							id="sport-filter"
							aria-label={t("Sport")}
							className="h-11 w-full min-w-0 flex-none rounded-xl border-white/10 bg-[#111713] px-4 text-sm text-white sm:w-auto sm:max-w-sm sm:flex-1"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent
							alignItemWithTrigger={false}
							className="max-h-80 rounded-xl border border-white/10 bg-[#111713] text-white"
						>
							{(
								eventsFeed.sports.data?.sports ?? [{ slug: sport, name: sport }]
							).map((item) => (
								<SelectItem
									key={item.slug}
									value={item.slug}
									className="focus:bg-[#c6f36b]/15 focus:text-[#d8ff9d]"
								>
									{t(item.name)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span className="text-white/50 text-xs">
						{t(
							"Upcoming games with odds and recent results · Tunisia time (UTC+1)",
						)}
					</span>
				</div>
				<fieldset
					aria-label={t("Match dates")}
					className="mt-5 flex flex-wrap gap-2"
				>
					{[
						{ value: 0, label: "Today" },
						{ value: 1, label: "Tomorrow" },
						{ value: 2, label: "Day after tomorrow" },
						{ value: -1, label: "Results · last 24 hours" },
					].map((item) => (
						<Button
							key={item.value}
							variant={day === item.value ? "default" : "outline"}
							aria-pressed={day === item.value}
							className={
								day === item.value
									? "border-[#c6f36b] bg-[#c6f36b] text-black hover:bg-[#b5df5b]"
									: "border-white/15 bg-transparent text-white hover:bg-white/10"
							}
							onClick={() => {
								const next = new URLSearchParams(params.toString());
								next.set("day", String(item.value));
								next.delete("view");
								router.push(`/?${next}`, { scroll: false });
							}}
						>
							{t(item.label)}
						</Button>
					))}
				</fieldset>
				<p className="mt-2 text-white/45 text-xs">
					{t(
						"Live status and odds refresh every 15 seconds. Feed delays may occur.",
					)}
				</p>
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
					key={`${sport}:${day}`}
					liveOnly={params.get("view") === "live"}
					onLiveChange={(live) => {
						const next = new URLSearchParams(params.toString());
						if (live) {
							next.set("view", "live");
							next.set("day", "0");
						} else next.delete("view");
						router.push(`/?${next}#matches`, { scroll: false });
					}}
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
