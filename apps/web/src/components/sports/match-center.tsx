"use client";

import { ArrowRight, Flame, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/features/i18n/locale-provider";
import type { Match, Region, Selection } from "@/features/sports/types";
import { groupMatchesByLeague } from "@/features/sports/utils";
import { BetSlip, type BetSlipProps } from "./bet-slip";
import { MatchFilters } from "./match-filters";
import { MatchList } from "./match-list";

export function MatchCenter({
	matches,
	regions,
	loading,
	error,
	oddsLoading,
	oddsError,
	onVisibleMatchIdsChange,
	selected,
	onPick,
	slip,
}: {
	matches: Match[];
	regions: Region[];
	loading: boolean;
	error?: string;
	oddsLoading: boolean;
	oddsError: string;
	onVisibleMatchIdsChange: (ids: string[]) => void;
	selected: Selection[];
	onPick: (
		match: Match,
		outcome: string,
		odd: string,
		market?: Selection["market"],
	) => void;
	slip: BetSlipProps;
}) {
	const { t } = useI18n();
	const [region, setRegion] = useState("");
	const [liveOnly, setLiveOnly] = useState(false);
	const activeRegion = regions.some((item) => item.key === region)
		? region
		: "";
	const filtered = useMemo(
		() =>
			matches.filter(
				(match) =>
					(!activeRegion || match.categoryKey === activeRegion) &&
					(!liveOnly || match.status === "TRADING_LIVE"),
			),
		[activeRegion, liveOnly, matches],
	);
	const groups = useMemo(() => groupMatchesByLeague(filtered), [filtered]);

	return (
		<section className="mt-10" id="matches">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-4">
				<div>
					<div className="mb-2 flex items-center gap-2 font-bold text-[#c6f36b] text-[10px] uppercase tracking-[.18em]">
						<Flame size={13} /> Matchday picks
					</div>
					<h2 className="font-extrabold text-2xl tracking-[-.05em] sm:text-[28px]">
						{t("Find your game")}
					</h2>
				</div>
				<button
					type="button"
					className="flex items-center gap-2 font-semibold text-white/45 text-xs transition hover:text-white"
					onClick={() => {
						setRegion("");
						setLiveOnly(false);
					}}
				>
					<Search size={14} /> {t("View all fixtures")} <ArrowRight size={13} />
				</button>
			</div>

			<MatchFilters
				regions={regions}
				activeRegion={activeRegion}
				liveOnly={liveOnly}
				onRegionChange={setRegion}
				onLiveToggle={() => setLiveOnly((value) => !value)}
			/>

			<div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
				<div className="min-w-0 space-y-3">
					{matches.length > 0 && (oddsLoading || oddsError) && (
						<div
							role="status"
							className="rounded-xl border border-[#f3a65e]/20 bg-[#f3a65e]/[.05] px-4 py-3 text-[#f3c18e] text-xs"
						>
							{oddsError
								? `${t("Flashscore price lookup stopped")}: ${oddsError}`
								: `${t("Checking Flashscore prices")} — ${matches.filter((match) => match.odds.result.every((odd) => odd !== "—")).length} ${t("games with odds are shown so far")}.`}
						</div>
					)}
					{loading && (
						<div className="rounded-2xl border border-white/[.08] p-8 text-center text-sm text-white/45">
							{t("Loading soccer matches…")}
						</div>
					)}
					{error && (
						<div
							role="alert"
							className="rounded-2xl border border-[#f3a65e]/20 bg-[#f3a65e]/[.05] p-5 text-[#f3a65e] text-sm"
						>
							{error}
							<p className="mt-2 text-white/45 text-xs">
								{t(
									"Check that the local Flashscore scraper is running and that",
								)}
								<code className="mx-1">FLASHSCORE_API_URL</code> and its
								optional
								<code className="mx-1">FLASHSCORE_API_KEY</code> are set in
								<code className="mx-1">apps/server/.env</code>.
							</p>
						</div>
					)}
					<MatchList
						groups={groups}
						onVisibleMatchIdsChange={onVisibleMatchIdsChange}
						filterKey={`${activeRegion}:${liveOnly ? "live" : "all"}`}
						selected={selected}
						onPick={onPick}
					/>
					{!loading && !error && filtered.length === 0 && (
						<div className="rounded-2xl border border-white/[.08] p-8 text-center text-sm text-white/45">
							{oddsLoading
								? t("Loading games with Flashscore 1X2 odds…")
								: liveOnly
									? t(
											"No live soccer games with Flashscore 1X2 odds are available right now.",
										)
									: t(
											"No soccer games with Flashscore 1X2 odds are available right now.",
										)}
						</div>
					)}
				</div>
				<BetSlip {...slip} />
			</div>
		</section>
	);
}
