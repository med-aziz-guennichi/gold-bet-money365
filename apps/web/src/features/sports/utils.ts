import type { Match } from "./types";

export function isMatchUnavailable(status: string) {
  return [
    "RESULTED",
    "CLOSED",
    "CANCELLED",
    "AWAITING_RESULTS",
    "POST_TRADING",
    "INTERRUPTED",
  ].includes(status.toUpperCase());
}

export function formatKickoff(value: string, locale = "en") {
  const dateLocale = locale === "ar" ? "ar" : locale === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getRegionMark(key: string) {
  const flags: Record<string, string> = {
    england: "🇬🇧",
    spain: "🇪🇸",
    italy: "🇮🇹",
    germany: "🇩🇪",
    france: "🇫🇷",
    china: "🇨🇳",
    morocco: "🇲🇦",
    usa: "🇺🇸",
    argentina: "🇦🇷",
    brazil: "🇧🇷",
    japan: "🇯🇵",
    peru: "🇵🇪",
    colombia: "🇨🇴",
    paraguay: "🇵🇾",
    uruguay: "🇺🇾",
    venezuela: "🇻🇪",
    international: "🌐",
    "international-clubs": "🌐",
  };
  return flags[key.toLowerCase()] ?? "🌍";
}

export function groupMatchesByLeague(matches: Match[]) {
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const current = grouped.get(match.league) ?? [];
    current.push(match);
    grouped.set(match.league, current);
  }
  return Array.from(grouped, ([league, items]) => ({ league, matches: items }));
}
