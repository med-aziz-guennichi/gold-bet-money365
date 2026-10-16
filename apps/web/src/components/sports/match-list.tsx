"use client";

import type { FootballMatch as Match } from "@gold-bet-clean-money365/api/football";
import { ChevronDown, ChevronLeft, ChevronRight, Globe2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/features/i18n/locale-provider";
import { sportSlug } from "@/features/sports/navigation";
import type { Selection } from "@/features/sports/types";
import { formatKickoff } from "@/features/sports/utils";
import { PrimaryOdds } from "./primary-odds";

export type MatchGroup = { league: string; matches: Match[] };
const GROUPS_PER_PAGE = 6;

function isUnavailable(status: string) {
	return [
		"RESULTED",
		"CLOSED",
		"CANCELLED",
		"AWAITING_RESULTS",
		"POST_TRADING",
		"INTERRUPTED",
	].includes(status.toUpperCase());
}

function getPageNumbers(current: number, total: number) {
	return [...new Set([1, current - 1, current, current + 1, total])]
		.filter((page) => page >= 1 && page <= total)
		.sort((left, right) => left - right);
}

/** Paginate by competition so a league's fixtures stay together. */
export function MatchList({
	groups,
	filterKey,
	selected,
	onPick,
}: {
	groups: MatchGroup[];
	filterKey: string;
	selected: Selection[];
	onPick: (
		match: Match,
		outcome: string,
		odd: string,
		market?: Selection["market"],
	) => void;
}) {
	const { t } = useI18n();
	const [pageState, setPageState] = useState({ filterKey, page: 1 });
	const listTop = useRef<HTMLDivElement>(null);
	const currentPage = pageState.filterKey === filterKey ? pageState.page : 1;
	const totalPages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE));
	const visibleGroups = useMemo(
		() =>
			groups.slice(
				(currentPage - 1) * GROUPS_PER_PAGE,
				currentPage * GROUPS_PER_PAGE,
			),
		[currentPage, groups],
	);
	const pageNumbers = getPageNumbers(currentPage, totalPages);
	const firstGroup = groups.length
		? (currentPage - 1) * GROUPS_PER_PAGE + 1
		: 0;
	const lastGroup = Math.min(currentPage * GROUPS_PER_PAGE, groups.length);

	useEffect(() => {
		setPageState({ filterKey, page: 1 });
	}, [filterKey]);

	function goToPage(page: number) {
		const nextPage = Math.min(Math.max(page, 1), totalPages);
		setPageState({ filterKey, page: nextPage });
		requestAnimationFrame(() => {
			const reduceMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			listTop.current?.scrollIntoView({
				behavior: reduceMotion ? "auto" : "smooth",
				block: "start",
			});
		});
	}

	if (!groups.length) return null;

	return (
		<div ref={listTop} className="scroll-mt-24 space-y-3">
			<div className="flex items-center justify-between px-1 text-[10px] text-white/40">
				<span>
					{t("Competitions")} {firstGroup}–{lastGroup} {t("of")} {groups.length}
				</span>
				<span>
					{groups.reduce((count, group) => count + group.matches.length, 0)}{" "}
					{t("games")}
				</span>
			</div>

			{visibleGroups.map((group) => (
				<CompetitionGroup
					key={group.league}
					league={group.league}
					matches={group.matches}
					selected={selected}
					onPick={onPick}
				/>
			))}

			{totalPages > 1 && (
				<nav
					aria-label={t("Match list pages")}
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-[#101411] px-3 py-3 sm:px-4"
				>
					<button
						type="button"
						onClick={() => goToPage(currentPage - 1)}
						disabled={currentPage === 1}
						className="inline-flex items-center gap-1 rounded-lg border border-white/[.08] px-3 py-2 font-semibold text-[11px] text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
					>
						<ChevronLeft size={14} /> {t("Previous")}
					</button>
					<fieldset
						className="flex items-center gap-1"
						aria-label={`${t("Page")} ${currentPage} ${t("of")} ${totalPages}`}
					>
						{pageNumbers.map((page, index) => (
							<span key={page} className="contents">
								{index > 0 && page - pageNumbers[index - 1]! > 1 && (
									<span
										className="px-1 text-white/30 text-xs"
										aria-hidden="true"
									>
										…
									</span>
								)}
								<button
									type="button"
									aria-current={page === currentPage ? "page" : undefined}
									aria-label={`${t("Go to page")} ${page}`}
									onClick={() => goToPage(page)}
									className={`h-8 min-w-8 rounded-lg px-2 font-bold text-[11px] transition ${
										page === currentPage
											? "bg-[#c6f36b] text-[#11160b]"
											: "text-white/55 hover:bg-white/[.07] hover:text-white"
									}`}
								>
									{page}
								</button>
							</span>
						))}
					</fieldset>
					<button
						type="button"
						onClick={() => goToPage(currentPage + 1)}
						disabled={currentPage === totalPages}
						className="inline-flex items-center gap-1 rounded-lg border border-white/[.08] px-3 py-2 font-semibold text-[11px] text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
					>
						{t("Next")} <ChevronRight size={14} />
					</button>
				</nav>
			)}
		</div>
	);
}

function CompetitionGroup({
	league,
	matches,
	selected,
	onPick,
}: {
	league: string;
	matches: Match[];
	selected: Selection[];
	onPick: (match: Match, outcome: string, odd: string) => void;
}) {
	const { t } = useI18n();
	const [collapsed, setCollapsed] = useState(false);

	return (
		<section className="overflow-hidden rounded-xl border border-white/[.07] bg-[#111014]">
			<button
				type="button"
				onClick={() => setCollapsed((value) => !value)}
				aria-expanded={!collapsed}
				className="flex w-full items-center justify-between bg-white/[.025] px-4 py-3 text-left transition hover:bg-white/[.05]"
			>
				<span className="flex items-center gap-2 font-bold text-[12px] text-white/80">
					<Globe2 size={14} className="text-white/40" />
					{league}
					<span className="rounded-full bg-white/[.06] px-2 py-0.5 font-semibold text-[9px] text-white/40">
						{matches.length}
					</span>
				</span>
				<ChevronDown
					size={15}
					className={`text-white/45 transition-transform ${collapsed ? "-rotate-90" : ""}`}
				/>
			</button>
			{!collapsed && (
				<div className="min-w-0">
					<div className="min-w-0">
						<div className="hidden items-end border-white/[.06] border-b px-3 py-2 text-center font-semibold text-[9px] text-white/35 sm:grid sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,.6fr)] sm:px-4">
							<span className="text-start">{t("Match")}</span>
							<span>{t("Odds")}</span>
							<span>{t("All markets")}</span>
						</div>
						<div className="divide-y divide-white/[.05]">
							{matches.map((match) => (
								<MatchRow
									key={match.id}
									match={match}
									selected={selected.filter(
										(item) => item.match.id === match.id,
									)}
									onPick={onPick}
								/>
							))}
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

function MatchRow({
	match,
	selected,
	onPick,
}: {
	match: Match;
	selected: Selection[];
	onPick: (
		match: Match,
		outcome: string,
		odd: string,
		market?: Selection["market"],
	) => void;
}) {
	const { t, locale } = useI18n();
	const isLive = match.status === "TRADING_LIVE";
	const disabled = isUnavailable(match.status);

	return (
		<div className="grid min-w-0 grid-cols-1 items-center gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,.6fr)] sm:gap-2 sm:px-4">
			<div className="min-w-0">
				<div className="flex items-center gap-2 font-bold text-[10px] text-white/80">
					<span className="truncate">{match.home}</span>
					<span className="shrink-0 text-white/30">{t("vs")}</span>
					<span className="truncate">{match.away}</span>
				</div>
				<div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-white/35">
					{isLive ? (
						<span className="flex items-center gap-1 font-bold text-[#f66c61]">
							<span className="h-1 w-1 animate-pulse rounded-full bg-[#f66c61]" />
							{t("LIVE")}
						</span>
					) : (
						<span>{formatKickoff(match.time, locale)}</span>
					)}
					<span>·</span>
					<span className="truncate">
						{match.homeMark} / {match.awayMark}
					</span>
					{match.odds.resultSource && (
						<span className="shrink-0 rounded bg-[#c6f36b]/10 px-1.5 py-0.5 font-bold text-[#c6f36b]">
							{match.odds.resultSource.toUpperCase()}
						</span>
					)}
				</div>
			</div>
			<PrimaryOdds
				match={match}
				selected={selected}
				onPick={onPick}
				disabled={disabled}
			/>
			<Link
				href={`/match/${encodeURIComponent(String(match.id))}?sport=${sportSlug(match.sport)}`}
				className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[.07] bg-white/[.025] px-2 py-2 font-bold text-[10px] text-white/65 transition hover:border-[#c6f36b]/30 hover:text-[#d8ff9d]"
				aria-label={`${t("View all offers for")} ${match.home} ${t("vs")} ${match.away}`}
			>
				{t("View offers")}{" "}
				<span className="text-[#c6f36b]">{match.odds.markets.length}</span>
			</Link>
		</div>
	);
}
