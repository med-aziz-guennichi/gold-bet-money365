"use client";
import { marketRestriction } from "@gold-bet-clean-money365/api/market-availability";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { useI18n } from "@/features/i18n/locale-provider";
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
			</p>
			{restriction && (
				<p className="mb-2 text-amber-200 text-xs">{t(restriction)}</p>
			)}
			<div
				className={`grid gap-1 ${offers.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
			>
				{offers.map((offer, index) => {
					const outcome = `${market.betType} · ${market.scope} · ${offer.selection} · ${offer.handicap ?? ""} · ${offer.score ?? ""} · ${market.bookmaker}`;
					const active = selected.some(
						(pick) => pick.match.id === match.id && pick.outcome === outcome,
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
							disabled={disabled || restriction !== null}
							aria-label={`${label} odds ${offer.value}`}
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
							className={`h-auto min-w-0 flex-col items-center whitespace-normal rounded-lg border bg-transparent hover:bg-white/[.05] hover:text-white px-1 py-2 disabled:cursor-not-allowed ${active ? "border-[#c6f36b]/50 bg-[#c6f36b]/10" : "border-white/10 bg-white/[.025]"}`}
						>
							<span className="max-w-full truncate text-[9px] text-white/50">
								{label}
								{offer.handicap ? ` ${offer.handicap}` : ""}
							</span>
							<strong className="text-[#c6f36b] text-xs tabular-nums">
								{offer.value}
							</strong>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
