import type { Selection } from "./types";

/** Market identity stays stable across different labels and price updates. */
export function sameMarket(
	left: Selection["market"],
	right: Selection["market"],
) {
	if (!left || !right) return false;
	const normalize = (value: unknown) => String(value ?? "").trim();
	return (
		["type", "scope", "selection", "handicap", "score", "bookmaker"] as const
	).every((key) => normalize(left[key]) === normalize(right[key]));
}
