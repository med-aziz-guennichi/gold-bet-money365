"use client";

import { LocalizedText } from "@gold-bet-clean-money365/i18n";

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
	selected,
	onPick,
	slip,
	liveOnly,
	onLiveChange,
}: {
	liveOnly: boolean;
	onLiveChange: (live: boolean) => void;
	matches: Match[];
	regions: Region[];
	loading: boolean;
	error?: string;
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
	const [showAll, setShowAll] = useState(false);
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
		<section className="mt-10 scroll-mt-24" id="matches">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-4">
				<div>
					<div className="mb-2 flex items-center gap-2 font-bold text-[#c6f36b] text-[10px] uppercase tracking-[.18em]">
						<Flame size={13} /> <LocalizedText text="Matchday picks" />{" "}
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
						onLiveChange(false);
						setShowAll(true);
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
				onLiveToggle={() => onLiveChange(!liveOnly)}
			/>

			<div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
				<div className="min-w-0 space-y-3">
					{loading && (
						<div className="rounded-2xl border border-white/[.08] p-8 text-center text-sm text-white/45">
							{t("Checking games and prices…")}
						</div>
					)}
					{error && (
						<div
							role="alert"
							className="rounded-2xl border border-[#f3a65e]/20 bg-[#f3a65e]/[.05] p-5 text-[#f3a65e] text-sm"
						>
							<LocalizedText text={error} />
						</div>
					)}
					<MatchList
						groups={groups}
						showAll={showAll}
						filterKey={`${activeRegion}:${liveOnly ? "live" : "all"}`}
						selected={selected}
						onPick={onPick}
					/>
					{!loading && !error && filtered.length === 0 && (
						<div className="rounded-2xl border border-white/[.08] p-8 text-center text-sm text-white/45">
							{liveOnly
								? t(
										"No live games with active odds are available in the loaded events.",
									)
								: t(
										"No games with active odds are available in the loaded events.",
									)}
						</div>
					)}
				</div>
				<BetSlip {...slip} />
			</div>
		</section>
	);
}
