"use client";

import type { FootballOddsMarket } from "@gold-bet-clean-money365/api/football";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/features/i18n/locale-provider";
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
	const availableMarkets = match.odds.markets.filter(
		(market) =>
			!isUnavailable(match.status) &&
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
		const periods = groups.get(market.betType) ?? new Map();
		periods.set(market.scope, [...(periods.get(market.scope) ?? []), market]);
		groups.set(market.betType, periods);
	}

	return (
		<div className="space-y-3">
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
	return (
		<section className="rounded-xl border border-white/[.07] bg-black/10 p-3 sm:p-4">
			<header className="mb-3">
				<p className="font-bold text-white/75 text-xs">{market.bookmaker}</p>
				<p className="mt-1 text-[10px] text-white/40">{t(scope)}</p>
			</header>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
				{market.selections
					.filter((price) => price.active && price.value !== null)
					.map((price, index) => {
						const odd = price.value ?? "—";
						const label = formatSelection(market, price);
						const outcome = `${formatMarketType(market.betType)} · ${scope} · ${market.bookmaker} · ${label}`;
						const isSelected = selected.some(
							(pick) => pick.match.id === match.id && pick.outcome === outcome,
						);
						const allowed =
							!isUnavailable(match.status) &&
							(match.sport === "Football" ||
								(market.betType === "HOME_AWAY" &&
									market.scope === "FULL_TIME"));
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
						return (
							<button
								key={`${price.selection}-${price.handicap}-${price.score}-${index}`}
								type="button"
								disabled={!allowed}
								title={
									allowed
										? `${t("Add")} ${t(label === "Home" ? "Home outcome" : label)} ${t("to bet slip")}`
										: t("This offer is display-only or currently unavailable.")
								}
								onClick={() => {
									if (price.value)
										onPick(match, outcome, price.value, metadata);
								}}
								className={`rounded-xl border p-3 text-left transition ${
									isSelected
										? "border-[#c6f36b]/50 bg-[#c6f36b]/10"
										: "border-white/[.07] bg-black/10 hover:border-white/20"
								} ${allowed ? "" : "cursor-not-allowed opacity-45"}`}
							>
								<span className="block truncate font-semibold text-white/65 text-xs">
									{t(label === "Home" ? "Home outcome" : label)}
								</span>
								<span className="mt-1 block font-extrabold text-[#d8ff9d] text-lg tabular-nums">
									{odd}
								</span>
								{price.openingValue && (
									<span className="mt-1 block text-[10px] text-white/35">
										{t("Opening")} {price.openingValue}
									</span>
								)}
							</button>
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
