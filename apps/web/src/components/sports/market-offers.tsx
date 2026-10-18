"use client";

import type { FootballOddsMarket } from "@gold-bet-clean-money365/api/football";
import { marketRestriction } from "@gold-bet-clean-money365/api/market-availability";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useI18n } from "@/features/i18n/locale-provider";
import { sameMarket } from "@/features/sports/selection-key";
import type { Match, Selection } from "@/features/sports/types";

/** Renders all normalized Flashscore offers on a match's dedicated page. */
export function MarketOffers({
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
	const { t } = useI18n();
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
	const [showViewOnly, setShowViewOnly] = useState(true);
	const [bookmaker, setBookmaker] = useState("");
	const bookmakerFilterId = useId();
	const bookmakers = [
		...new Set(match.odds.markets.map((market) => market.bookmaker)),
	].sort();
	const activeBookmaker = bookmakers.includes(bookmaker) ? bookmaker : "";
	const hasViewOnly = match.odds.markets.some(
		(market) => marketRestriction(match.sport, "TRADING", market) !== null,
	);
	const availableMarkets = match.odds.markets.filter((market) =>
		market.selections.some((price) => price.active && price.value !== null),
	);

	if (!availableMarkets.length)
		return (
			<div className="rounded-2xl border border-white/[.08] p-8 text-center text-sm text-white/45">
				{t("No priced offers are currently available for this match.")}
			</div>
		);

	// Keep one accordion per market name. Periods (full time / halves) are
	// shown as sections inside it, instead of repeating the same accordion.
	const groups = new Map<string, Map<string, FootballOddsMarket[]>>();
	for (const market of availableMarkets) {
		if (activeBookmaker && market.bookmaker !== activeBookmaker) continue;
		if (!showViewOnly && marketRestriction(match.sport, "TRADING", market))
			continue;
		const periods = groups.get(market.betType) ?? new Map();
		periods.set(market.scope, [...(periods.get(market.scope) ?? []), market]);
		groups.set(market.betType, periods);
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#111713] p-4">
				<label htmlFor={bookmakerFilterId} className="font-semibold text-sm">
					{t("Bookmakers")} ({bookmakers.length})
				</label>
				<select
					id={bookmakerFilterId}
					value={activeBookmaker}
					onChange={(event) => setBookmaker(event.target.value)}
					className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#111713] px-3 py-2 text-sm"
				>
					<option value="">{t("All bookmakers")}</option>
					{bookmakers.map((name) => (
						<option key={name} value={name}>
							{name}
						</option>
					))}
				</select>
			</div>
			{hasViewOnly && (
				<div className="rounded-xl border border-white/10 bg-[#111713] p-4 text-sm">
					<p className="mb-3 text-white/60">
						{t(
							"All available bookmaker prices are shown. View-only markets cannot be added to a bet.",
						)}
					</p>
					<Button
						type="button"
						variant="outline"
						aria-pressed={showViewOnly}
						onClick={() => setShowViewOnly((value) => !value)}
						className="h-auto whitespace-normal rounded-lg border-white/15 bg-transparent px-3 py-2 text-white"
					>
						{t(
							showViewOnly
								? "Hide view-only markets"
								: "Show view-only markets",
						)}
					</Button>
				</div>
			)}
			{groups.size === 0 && (
				<p role="status" className="p-4 text-sm text-white/60">
					{t(
						"No supported betting markets are available. You can still view the other prices.",
					)}
				</p>
			)}
			{[...groups.entries()].map(([type, periods]) => {
				const markets = [...periods.values()].flat();
				const offerCount = markets.length;
				const selectionCount = markets.reduce(
					(count, market) =>
						count +
						market.selections.filter(
							(price) => price.active && price.value !== null,
						).length,
					0,
				);
				return (
					<details
						key={type}
						open={Boolean(openGroups[type])}
						onToggle={(event) => {
							const open = event.currentTarget.open;
							setOpenGroups((groups) =>
								groups[type] === open ? groups : { ...groups, [type]: open },
							);
						}}
						className="group overflow-hidden rounded-2xl border border-white/[.08] bg-[#111014]"
					>
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden hover:bg-white/[.025] sm:px-5">
							<span>
								<span className="block font-bold text-sm text-white/90">
									{t(formatMarketType(type ?? "Other market"))}
								</span>
								<span className="mt-1 block text-white/45 text-xs">
									{periods.size} {t(periods.size === 1 ? "period" : "periods")}{" "}
									· {offerCount} {t("offers")} · {selectionCount} {t("picks")}
								</span>
							</span>
							<ChevronDown
								size={16}
								className="shrink-0 text-white/45 transition-transform group-open:rotate-180"
							/>
						</summary>
						{openGroups[type] && (
							<div className="space-y-4 border-white/[.07] border-t p-3 sm:p-4">
								{[...periods.entries()].map(([scope, periodMarkets]) => (
									<section key={scope}>
										<h3 className="mb-2 font-bold text-white/55 text-xs uppercase tracking-wide">
											{t(formatScope(scope))}
										</h3>
										<div className="space-y-2">
											{periodMarkets.map((market, marketIndex) => (
												<MarketCard
													key={`${scope}-${market.bookmaker}-${marketIndex}`}
													match={match}
													market={market}
													selected={selected}
													onPick={onPick}
												/>
											))}
										</div>
									</section>
								))}
							</div>
						)}
					</details>
				);
			})}
		</div>
	);
}

function MarketCard({
	match,
	market,
	selected,
	onPick,
}: {
	match: Match;
	market: FootballOddsMarket;
	selected: Selection[];
	onPick: (
		match: Match,
		outcome: string,
		odd: string,
		market?: Selection["market"],
	) => void;
}) {
	const { t } = useI18n();
	const scope = formatScope(market.scope);
	const restriction = marketRestriction(match.sport, match.status, market);
	const restrictionId = useId();
	return (
		<section className="rounded-xl border border-white/[.07] bg-black/10 p-3 sm:p-4">
			<header className="mb-3">
				<p className="font-bold text-white/75 text-xs">{market.bookmaker}</p>
				<p className="mt-1 text-[10px] text-white/40">{t(scope)}</p>
				{restriction && (
					<p id={restrictionId} className="mt-2 text-amber-200 text-xs">
						{t(restriction)}
					</p>
				)}
			</header>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
				{market.selections
					.filter((price) => price.active && price.value !== null)
					.map((price, index) => {
						const odd = price.value ?? "—";
						const label = formatSelection(market, price);
						const outcome = `${formatMarketType(market.betType)} · ${scope} · ${market.bookmaker} · ${label}`;
						const offerRestriction = marketRestriction(
							match.sport,
							match.status,
							{
								...market,
								selection: price.selection,
								handicap: price.handicap,
								score: price.score,
							},
						);
						const allowed = offerRestriction === null;
						const metadata = {
							type: market.betType,
							bookmaker: market.bookmaker,
							scope: market.scope,
							selection: cleanScraperValue(price.selection),
							handicap: price.handicap
								? cleanScraperValue(price.handicap)
								: null,
							score: price.score ? cleanScraperValue(price.score) : null,
						};
						const isSelected = selected.some(
							(pick) =>
								pick.match.id === match.id && sameMarket(pick.market, metadata),
						);
						return (
							<Button
								variant="outline"
								aria-describedby={restriction ? restrictionId : undefined}
								aria-pressed={isSelected}
								key={`${price.selection}-${price.handicap}-${price.score}-${index}`}
								type="button"
								disabled={!allowed}
								title={
									allowed
										? `${t("Add")} ${t(label === "Home" ? "Home outcome" : label)} ${t("to bet slip")}`
										: t(
												offerRestriction ??
													"This offer is display-only or currently unavailable.",
											)
								}
								onClick={() => {
									if (price.value)
										onPick(match, outcome, price.value, metadata);
								}}
								className={`h-auto flex-col items-stretch whitespace-normal rounded-xl border p-3 text-left transition ${
									isSelected
										? "border-[#c6f36b] bg-[#c6f36b] text-[#11160b] ring-2 ring-[#c6f36b]/30 hover:bg-[#d8ff9d] dark:bg-[#c6f36b] dark:hover:bg-[#d8ff9d]"
										: "border-white/[.07] bg-black/10 hover:border-white/20"
								} ${allowed ? "" : "cursor-not-allowed opacity-45"}`}
							>
								<span
									className={`block truncate font-semibold text-xs ${isSelected ? "text-[#11160b]" : "text-white/65"}`}
								>
									{t(label === "Home" ? "Home outcome" : label)}
								</span>
								<span
									className={`mt-1 block font-extrabold text-lg tabular-nums ${isSelected ? "text-[#11160b]" : "text-[#d8ff9d]"}`}
								>
									{odd}
								</span>
								{price.openingValue && (
									<span className="mt-1 block text-[10px] text-white/35">
										{t("Opening")} {price.openingValue}
									</span>
								)}
							</Button>
						);
					})}
			</div>
		</section>
	);
}

export function formatMarketType(type: string) {
	const names: Record<string, string> = {
		HOME_DRAW_AWAY: "Match result",
		HOME_AWAY: "Home / away",
		OVER_UNDER: "Over / under",
		BOTH_TEAMS_TO_SCORE: "Both teams to score",
		DOUBLE_CHANCE: "Double chance",
		ASIAN_HANDICAP: "Asian handicap",
		CORRECT_SCORE: "Correct score",
		HALF_TIME_FULL_TIME: "Half-time / full-time",
		HALF_FULL_TIME: "Half-time / full-time",
		DRAW_NO_BET: "Draw no bet",
		EUROPEAN_HANDICAP: "European handicap",
		CORNERS: "Corners",
		TOTAL_CORNERS: "Total corners",
		RED_CARD: "Red cards",
		RED_CARDS: "Red cards",
		TOTAL_RED_CARDS: "Total red cards",
		YELLOW_CARDS: "Yellow cards",
		TOTAL_CARDS: "Total cards",
		PLAYER_RED_CARD: "Player to receive a red card",
		PLAYER_TO_RECEIVE_RED_CARD: "Player to receive a red card",
		ODD_OR_EVEN: "Odd or even",
		ODD_EVEN: "Odd or even",
		TO_QUALIFY: "To qualify",
		NO_BET: "No bet",
		MATCH_WINNER: "Match winner",
		TOTAL_GOALS: "Total goals",
		FIRST_HALF_RESULT: "First half result",
		SECOND_HALF_RESULT: "Second half result",
	};
	return (
		names[type.toUpperCase()] ??
		type
			.replaceAll("_", " ")
			.toLowerCase()
			.replace(/\b\w/g, (letter) => letter.toUpperCase())
	);
}

function formatScope(scope: string) {
	const names: Record<string, string> = {
		FULL_TIME: "Full time",
		FIRST_HALF: "First half",
		SECOND_HALF: "Second half",
	};
	return names[scope.toUpperCase()] ?? scope.replaceAll("_", " ").toLowerCase();
}

function formatSelection(
	market: FootballOddsMarket,
	price: FootballOddsMarket["selections"][number],
) {
	if (market.betType.toUpperCase() === "CORRECT_SCORE")
		return cleanScraperValue(price.score ?? price.selection);
	const label = normalizeLabel(cleanScraperValue(price.selection));
	const handicap = price.handicap ? cleanScraperValue(price.handicap) : "";
	if (!handicap || label.toLowerCase().includes(handicap.toLowerCase()))
		return label;
	return `${label} ${handicap}`;
}

/** Handles legacy cached strings where the scraper's Python dict was stringified. */
function cleanScraperValue(value: string) {
	if (value.includes("__typename") || value.includes("EventOddsItem")) {
		const serializedValue = value
			.match(/["']?value["']?\s*:\s*["']?([^,"'}\]]+)["']?/i)?.[1]
			?.trim();
		if (serializedValue) return serializedValue;
	}
	return value;
}

function normalizeLabel(value: string) {
	return value
		.replace(/\s+/g, " ")
		.replace(/\bHOME\b/gi, "Home")
		.replace(/\bAWAY\b/gi, "Away")
		.replace(/\bOVER\b/gi, "Over")
		.replace(/\bUNDER\b/gi, "Under")
		.replace(/\bYES\b/gi, "Yes")
		.replace(/\bNO\b/gi, "No")
		.trim();
}
