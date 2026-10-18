"use client";

import { marketRestriction } from "@gold-bet-clean-money365/api/market-availability";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { useI18n } from "@/features/i18n/locale-provider";
import { sameMarket } from "@/features/sports/selection-key";
import type { Match, Selection } from "@/features/sports/types";
import { formatMarketType } from "./market-offers";

export function PrimaryOdds({
	match,
	selected,
	onPick,
	disabled,
}: {
	match: Match;
	selected: Selection[];
	onPick: (
		match: Match,
		outcome: string,
		odd: string,
		market?: Selection["market"],
	) => void;
	disabled: boolean;
}) {
	const { t } = useI18n();
	const preferred = match.sport === "Football" ? "HOME_DRAW_AWAY" : "HOME_AWAY";
	const priced = match.odds.markets.filter((market) =>
		market.selections.some(
			(offer) =>
				offer.active && offer.value !== null && Number(offer.value) > 1,
		),
	);
	const selectable = priced.filter(
		(market) => marketRestriction(match.sport, match.status, market) === null,
	);
	const market =
		selectable.find(
			(market) => market.betType === preferred && market.scope === "FULL_TIME",
		) ??
		selectable[0] ??
		priced.find(
			(market) => market.betType === preferred && market.scope === "FULL_TIME",
		) ??
		priced[0];
	if (!market) return null;
	const offers = [...market.selections]
		.sort((left, right) => {
			const rank = (value: string) =>
				({ home: 0, draw: 1, away: 2 })[value] ?? 3;
			return rank(left.selection) - rank(right.selection);
		})
		.filter(
			(offer) =>
				offer.active && offer.value !== null && Number(offer.value) > 1,
		)
		.slice(0, 3);
	const restriction = marketRestriction(match.sport, match.status, market);
	return (
		<div className="min-w-0">
			<p className="mb-1 truncate text-[9px] text-white/40">
				{t(formatMarketType(market.betType))} ·{" "}
				{market.scope === "FULL_TIME"
					? t("Full match")
					: market.scope.replaceAll("_", " ")}
				{" · "}
				{market.bookmaker}
			</p>
			{restriction && (
				<p className="mb-2 text-amber-200 text-xs">{t(restriction)}</p>
			)}
			<div
				className={`grid gap-1 ${offers.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
			>
				{offers.map((offer, index) => {
					const offerRestriction = marketRestriction(
						match.sport,
						match.status,
						{
							...market,
							selection: offer.selection,
							handicap: offer.handicap,
							score: offer.score,
						},
					);
					const outcome = `${market.betType} · ${market.scope} · ${offer.selection} · ${offer.handicap ?? ""} · ${offer.score ?? ""} · ${market.bookmaker}`;
					const active = selected.some(
						(pick) =>
							pick.match.id === match.id &&
							sameMarket(pick.market, {
								type: market.betType,
								scope: market.scope,
								selection: offer.selection,
								handicap: offer.handicap,
								score: offer.score,
								bookmaker: market.bookmaker,
							}),
					);
					const label =
						offer.selection === "home"
							? "1"
							: offer.selection === "away"
								? "2"
								: offer.selection === "draw"
									? "X"
									: offer.selection;
					return (
						<Button
							variant="outline"
							key={`${offer.selection}:${index}`}
							type="button"
							disabled={disabled || offerRestriction !== null}
							title={offerRestriction ? t(offerRestriction) : undefined}
							aria-label={`${label} odds ${offer.value}`}
							aria-pressed={active}
							onClick={() =>
								onPick(match, outcome, offer.value!, {
									type: market.betType,
									scope: market.scope,
									selection: offer.selection,
									handicap: offer.handicap,
									score: offer.score,
									bookmaker: market.bookmaker,
								})
							}
							className={`h-auto min-h-12 min-w-0 flex-col items-center whitespace-normal rounded-lg border px-1 py-3 disabled:cursor-not-allowed ${active ? "border-[#c6f36b] bg-[#c6f36b] text-[#11160b] ring-2 ring-[#c6f36b]/30 hover:bg-[#d8ff9d] dark:bg-[#c6f36b] dark:hover:bg-[#d8ff9d]" : "border-white/10 bg-white/[.025] hover:bg-white/[.05] hover:text-white"}`}
						>
							<span
								className={`max-w-full truncate text-[10px] ${active ? "text-[#11160b]" : "text-white/60"}`}
							>
								<LocalizedText text={label} />
								{offer.handicap ? ` ${offer.handicap}` : ""}
							</span>
							<strong
								className={`text-sm tabular-nums ${active ? "text-[#11160b]" : "text-[#c6f36b]"}`}
							>
								{offer.value}
							</strong>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
