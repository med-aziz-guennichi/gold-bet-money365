import type { FootballOddsMarket } from "./football";

export function marketRestriction(
	sport: string,
	status: string,
	market: Pick<FootballOddsMarket, "betType" | "scope" | "hasLiveBetting"> & {
		selection?: string;
		handicap?: string | null;
		score?: string | null;
	},
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
	if (
		sport === "Football" &&
		(market.scope !== "FULL_TIME" ||
			![
				"HOME_DRAW_AWAY",
				"BOTH_TEAMS_TO_SCORE",
				"CORRECT_SCORE",
				"DOUBLE_CHANCE",
				"OVER_UNDER",
			].includes(market.betType))
	)
		return "View only: this market does not support bet settlement yet.";
	if (sport === "Football" && market.selection !== undefined) {
		const selection = market.selection.trim().toLowerCase();
		const line = market.handicap ?? selection.match(/\d+(?:\.\d+)?/)?.[0];
		const valid =
			market.betType === "HOME_DRAW_AWAY"
				? [
						"home",
						"away",
						"draw",
						"1",
						"2",
						"x",
						"1 (home)",
						"2 (away)",
					].includes(selection)
				: market.betType === "BOTH_TEAMS_TO_SCORE"
					? ["yes", "no"].includes(selection)
					: market.betType === "DOUBLE_CHANCE"
						? [
								"1x",
								"x2",
								"12",
								"home/draw",
								"draw/away",
								"home/away",
							].includes(selection.replaceAll(" ", ""))
						: market.betType === "CORRECT_SCORE"
							? /^(\d+)\s*[-:]\s*(\d+)$/.test(market.score ?? selection)
							: /^(over|under)(?:\s+\d+(?:\.\d+)?)?$/.test(selection) &&
								/^\d+(?:\.[05])?$/.test(line ?? "");
		if (!valid)
			return "View only: this market does not support bet settlement yet.";
	}

	return null;
}
