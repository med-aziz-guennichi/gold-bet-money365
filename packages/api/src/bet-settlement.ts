import type { AcceptedBetPick } from "./betting";
import { calculateBetReturn } from "./betting-money";
import type { FootballMatchResult } from "./football";

export type PickOutcome = "won" | "lost" | "void" | "waiting" | "review";

/** Never infer regulation scores from totals that may include extra time or penalties. */
export function evaluatePick(
	pick: AcceptedBetPick,
	result?: FootballMatchResult,
): PickOutcome {
	if (!result) return "waiting";
	if (["CANCELLED", "POST_TRADING", "INTERRUPTED"].includes(result.status))
		return "review";
	if (result.status !== "RESULTED") return "waiting";
	if (pick.sport && pick.sport !== "Football") {
		if (
			!result.completedNormally ||
			result.sport !== pick.sport ||
			!result.winner ||
			pick.market.type !== "HOME_AWAY" ||
			pick.market.scope !== "FULL_TIME"
		)
			return "review";
		const selection = pick.market.selection.trim().toLowerCase();
		const side = ["home", "1", "1 (home)"].includes(selection)
			? "home"
			: ["away", "2", "2 (away)"].includes(selection)
				? "away"
				: null;
		if (!side || result.winner === "draw") return "review";
		return side === result.winner ? "won" : "lost";
	}
	const score = result.regulationScore;
	if (
		!score ||
		pick.market.scope !== "FULL_TIME" ||
		![score.home, score.away].every(
			(value) => Number.isSafeInteger(value) && value >= 0,
		)
	)
		return "review";
	const selection = pick.market.selection.trim().toLowerCase();
	const winner =
		score.home > score.away
			? "home"
			: score.home < score.away
				? "away"
				: "draw";
	let won: boolean;
	switch (pick.market.type) {
		case "HOME_DRAW_AWAY": {
			const normalized =
				(
					{
						"1": "home",
						"1 (home)": "home",
						x: "draw",
						"2": "away",
						"2 (away)": "away",
					} as Record<string, string>
				)[selection] ?? selection;
			if (!["home", "draw", "away"].includes(normalized)) return "review";
			won = normalized === winner;
			break;
		}
		case "BOTH_TEAMS_TO_SCORE":
			if (!["yes", "no"].includes(selection)) return "review";
			won = (score.home > 0 && score.away > 0) === (selection === "yes");
			break;
		case "CORRECT_SCORE": {
			const expected = (pick.market.score ?? selection).match(
				/^(\d+)\s*[-:]\s*(\d+)$/,
			);
			if (!expected) return "review";
			won =
				score.home === Number(expected[1]) &&
				score.away === Number(expected[2]);
			break;
		}
		case "DOUBLE_CHANCE": {
			const choices: Record<string, string[]> = {
				"1x": ["home", "draw"],
				x2: ["draw", "away"],
				"12": ["home", "away"],
				"home/draw": ["home", "draw"],
				"draw/away": ["draw", "away"],
				"home/away": ["home", "away"],
			};
			const accepted = choices[selection.replaceAll(" ", "")];
			if (!accepted) return "review";
			won = accepted.includes(winner);
			break;
		}
		case "OVER_UNDER": {
			if (!/^(over|under)(?:\s+\d+(?:\.\d+)?)?$/.test(selection))
				return "review";
			const raw = pick.market.handicap ?? selection.match(/\d+(?:\.\d+)?/)?.[0];
			if (!raw || !/^\d+(?:\.[05])?$/.test(raw)) return "review";
			const line = Number(raw);
			const goals = score.home + score.away;
			if (goals === line) return "void";
			won = selection.startsWith("over") ? goals > line : goals < line;
			break;
		}
		default:
			return "review";
	}
	return won ? "won" : "lost";
}

export function settleReturns(
	stake: number,
	picks: AcceptedBetPick[],
	outcomes: PickOutcome[],
) {
	if (
		outcomes.length !== picks.length ||
		outcomes.some((value) => value === "waiting" || value === "review")
	)
		return null;
	if (outcomes.includes("lost"))
		return { status: "Lost" as const, payoutMillimes: 0 };
	const odds = picks
		.filter((_, index) => outcomes[index] === "won")
		.map((pick) => pick.odd);
	return odds.length
		? {
				status: "Won" as const,
				payoutMillimes: calculateBetReturn(stake, odds).potentialReturnMillimes,
			}
		: { status: "Void" as const, payoutMillimes: stake };
}
