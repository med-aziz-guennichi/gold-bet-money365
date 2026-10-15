import type { FootballOddsMarket } from "@gold-bet-clean-money365/api/football";

/** Markets outside full-time score settlement stay visible but cannot be picked. */
export function canSettleDemoMarket(market: FootballOddsMarket) {
  if (market.scope.toUpperCase() !== "FULL_TIME") return false;
  const type = market.betType.toUpperCase();
  return market.selections.some((selection) => {
    const label = selection.selection.trim().toLowerCase();
    switch (type) {
      case "HOME_DRAW_AWAY":
        return ["home", "1", "draw", "x", "away", "2"].includes(label);
      case "HOME_AWAY":
        return ["home", "1", "away", "2"].includes(label);
      case "DOUBLE_CHANCE":
        return /home|away|draw|\b1\b|\b2\b|\bx\b/i.test(label);
      case "BOTH_TEAMS_TO_SCORE":
        return ["yes", "no"].includes(label);
      case "OVER_UNDER":
        return /over|under/i.test(label) &&
          Number.isFinite(Number((selection.handicap ?? label).match(/\d+(?:\.\d+)?/)?.[0]));
      case "ASIAN_HANDICAP":
        return ["home", "away"].includes(label) &&
          /^\s*[+-]?\d+(?:\.\d+)?\s*$/.test(selection.handicap ?? "");
      case "CORRECT_SCORE":
        return /^\s*\d+\s*[-:]\s*\d+\s*$/.test(selection.score ?? label);
      default:
        return false;
    }
  });
}
