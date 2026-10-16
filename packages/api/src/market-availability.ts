import type { FootballOddsMarket } from "./football";

export function marketRestriction(
	sport: string,
	status: string,
	market: Pick<FootballOddsMarket, "betType" | "scope" | "hasLiveBetting">,
): string | null {
	if (!["TRADING", "TRADING_LIVE"].includes(status))
		return "Betting is closed or suspended for this event.";
	if (
		sport !== "Football" &&
		(market.betType !== "HOME_AWAY" || market.scope !== "FULL_TIME")
	)
		return "View only: this market does not support bet settlement yet.";
	if (status === "TRADING_LIVE" && !market.hasLiveBetting)
		return "This bookmaker is not accepting live bets on this market.";
	return null;
}
