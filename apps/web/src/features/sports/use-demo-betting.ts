import { useEffect, useMemo, useRef, useState } from "react";
import type { FootballMatchResult } from "@gold-bet-clean-money365/api/football";

import { orpc } from "@/utils/orpc";
import { isMatchUnavailable } from "./utils";
import type { DemoBet, Match, Selection } from "./types";

const STORAGE_KEY = "fieldhouse-demo-bets-v1";

function storedText(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    if (text.includes("__typename") || text.includes("EventOddsItem")) {
      const serializedValue = text.match(
        /["']?value["']?\s*:\s*["']?([^,"'}\]]+)["']?/i,
      )?.[1]?.trim();
      if (serializedValue) return serializedValue;
    }
    return text || null;
  }
  if (value && typeof value === "object" && "value" in value)
    return storedText((value as { value?: unknown }).value);
  return null;
}

/** Migrate slip picks saved before scraper labels were normalized. */
function cleanStoredPick(pick: Selection): Selection {
  if (!pick.market) return pick;
  const selection = storedText(pick.market.selection) ?? "Unknown";
  const handicap = storedText(pick.market.handicap);
  const score = storedText(pick.market.score);
  const label = (score ?? selection)
    .replace(/\bHOME\b/gi, "Home")
    .replace(/\bAWAY\b/gi, "Away")
    .replace(/\bOVER\b/gi, "Over")
    .replace(/\bUNDER\b/gi, "Under")
    .replace(/\bDRAW\b/gi, "Draw")
    .replace(/\bYES\b/gi, "Yes")
    .replace(/\bNO\b/gi, "No");
  const cleanLabel = handicap && !label.includes(handicap)
    ? `${label} ${handicap}`
    : label;
  const segments = pick.outcome.split(" · ");
  const outcome = segments.length > 1
    ? [...segments.slice(0, -1), cleanLabel].join(" · ")
    : cleanLabel;
  return {
    ...pick,
    outcome,
    market: { ...pick.market, selection, handicap, score },
  };
}

function evaluatePick(
  pick: Selection,
  resultData: FootballMatchResult,
): "win" | "loss" | "push" | "unknown" {
  const home = resultData.score?.home;
  const away = resultData.score?.away;
  if (home === undefined || home === null || away === undefined || away === null)
    return "unknown";
  if (pick.market) {
    const { type, selection, handicap, score } = pick.market;
    const kind = type.toUpperCase();
    const period = scopeFor(pick);
    const label = selection.trim().toLowerCase();
    const result = home > away ? "home" : home < away ? "away" : "draw";
    if (kind === "BOTH_TEAMS_TO_SCORE") {
      if (period !== "full_time") return "unknown";
      const yes = home > 0 && away > 0;
      return (label === "yes") === yes ? "win" : "loss";
    }
    if (kind === "DOUBLE_CHANCE") {
      if (period !== "full_time") return "unknown";
      const includesHome = /home|\b1\b/i.test(label);
      const includesDraw = /draw|\bx\b/i.test(label);
      const includesAway = /away|\b2\b/i.test(label);
      const won = (result === "home" && includesHome) ||
        (result === "draw" && includesDraw) ||
        (result === "away" && includesAway);
      return won ? "win" : "loss";
    }
    if (kind === "OVER_UNDER") {
      if (period !== "full_time") return "unknown";
      const line = Number((handicap ?? label).match(/\d+(?:\.\d+)?/)?.[0]);
      const goals = home + away;
      if (label.includes("over")) return goals > line ? "win" : goals < line ? "loss" : "push";
      return goals < line ? "win" : goals > line ? "loss" : "push";
    }
    if (kind === "ASIAN_HANDICAP") {
      if (period !== "full_time") return "unknown";
      const line = Number(handicap);
      const adjusted = label === "home" ? home + line - away : away + line - home;
      return adjusted > 0 ? "win" : adjusted < 0 ? "loss" : "push";
    }
    if (kind === "CORRECT_SCORE") {
      if (period !== "full_time") return "unknown";
      const [expectedHome, expectedAway] = (score ?? label)
        .split(/[-:]/)
        .map(Number);
      return expectedHome === home && expectedAway === away ? "win" : "loss";
    }
    if (kind === "HOME_AWAY" || kind === "HOME_DRAW_AWAY") {
      if (period !== "full_time") return "unknown";
      const normalized =
        label === "1" ? "home" : label === "x" ? "draw" : label === "2" ? "away" : label;
      return normalized === result ? "win" : "loss";
    }
    if (kind.includes("CORNER")) {
      const total = getStatisticTotal(resultData, "corner", scopeFor(pick));
      return total === null ? "unknown" : evaluateTotal(label, handicap, total);
    }
    if (kind.includes("CARD") || /PLAYER.*SENT.?OFF/.test(kind)) {
      if (kind.includes("PLAYER") || /SENT.?OFF/.test(kind)) {
        if (!resultData.incidents) return "unknown";
        if (period !== "full_time") return "unknown";
        // Player markets usually use the player's name as the selection. Some
        // feeds instead use Yes/No and put the player in handicap/score.
        const selectionIsBoolean = ["yes", "no"].includes(label);
        const player = (
          selectionIsBoolean ? handicap ?? score : selection
        )?.trim().toLowerCase();
        if (!player || ["yes", "no", "home", "away"].includes(player))
          return "unknown";
        const wasSentOff = (resultData.incidents ?? []).some(
          (incident) =>
            isRedCardIncident(incident.type, incident.reason) &&
            incident.player?.toLowerCase() === player,
        );
        if (selectionIsBoolean)
          return (label === "yes") === wasSentOff ? "win" : "loss";
        return wasSentOff ? "win" : "loss";
      }
      const isRed = kind.includes("RED");
      const yellowTotal = getStatisticTotal(resultData, "yellow card", period);
      const redTotal = getStatisticTotal(resultData, "red card", period);
      const statTotal = isRed
        ? redTotal
        : kind.includes("YELLOW")
          ? yellowTotal
          : yellowTotal !== null && redTotal !== null
            ? yellowTotal + redTotal
            : yellowTotal ?? redTotal;
      if (statTotal === null && !resultData.incidents) return "unknown";
      const side = label === "home" || label === "away" ? label : null;
      const incidentTotal = (resultData.incidents ?? []).filter((incident) =>
        (!incident.period || incident.period === period) &&
          (isRed
            ? isRedCardIncident(incident.type, incident.reason)
            : kind.includes("YELLOW")
              ? /yellow|booking/i.test(`${incident.type} ${incident.reason}`)
              : /yellow|booking|red|sent.?off|second.?yellow/i.test(`${incident.type} ${incident.reason}`)),
      ).filter((incident) => !side || incident.team === side).length;
      const total = statTotal !== null && !side ? statTotal : incidentTotal;
      if (side && !resultData.incidents) return "unknown";
      return evaluateTotal(label, handicap, total);
    }
    return "unknown";
  }

  const outcome = pick.outcome;
  const label = outcome.split(" · ")[0].trim();
  if (label === "1") return home > away ? "win" : "loss";
  if (label === "X") return home === away ? "win" : "loss";
  if (label === "2") return away > home ? "win" : "loss";

  const line = Number(label.match(/-?\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(line)) return "loss";
  if (label.startsWith("H ")) {
    const adjusted = home + line - away;
    return adjusted > 0 ? "win" : adjusted < 0 ? "loss" : "push";
  }
  if (label.startsWith("A ")) {
    const adjusted = away + line - home;
    return adjusted > 0 ? "win" : adjusted < 0 ? "loss" : "push";
  }

  const goals = home + away;
  if (label.startsWith("O "))
    return goals > line ? "win" : goals < line ? "loss" : "push";
  if (label.startsWith("U "))
    return goals < line ? "win" : goals > line ? "loss" : "push";
  return "loss";
}

function scopeFor(pick: Selection) {
  const scope = pick.market?.scope.toUpperCase() ?? "FULL_TIME";
  return scope.includes("FIRST") ? "first_half" : scope.includes("SECOND") ? "second_half" : "full_time";
}

function getStatisticTotal(
  result: FootballMatchResult,
  keyword: string,
  period: string,
) {
  const item = Object.entries(result.statistics ?? {}).find(
    ([key]) => key.startsWith(`${period}:`) && key.includes(keyword),
  )?.[1];
  if (!item || item.home === null || item.away === null) return null;
  return item.home + item.away;
}

function evaluateTotal(
  label: string,
  handicap: string | null | undefined,
  total: number,
): "win" | "loss" | "push" | "unknown" {
  const line = Number((handicap ?? label).match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(line)) return "unknown";
  if (label.includes("over")) return total > line ? "win" : total < line ? "loss" : "push";
  if (label.includes("under")) return total < line ? "win" : total > line ? "loss" : "push";
  return "unknown";
}

function isRedCardIncident(type: string, reason: string) {
  return /red|sent.?off|second.?yellow/i.test(`${type} ${reason}`);
}

/** Owns local demo balance, slip state, persistence, and result settlement. */
export function useDemoBetting() {
  const [selected, setSelected] = useState<Selection[]>([]);
  const [stake, setStake] = useState("10");
  const [balance, setBalance] = useState(1000);
  const [bets, setBets] = useState<DemoBet[]>([]);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const betsRef = useRef<DemoBet[]>([]);
  const settlementInFlight = useRef(false);
  betsRef.current = bets;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as {
          balance?: number;
          bets?: DemoBet[];
        };
        if (
          typeof state.balance === "number" &&
          Number.isFinite(state.balance) &&
          state.balance >= 0
        )
          setBalance(state.balance);
        if (Array.isArray(state.bets))
          setBets(
            state.bets.map((bet) => ({
              ...bet,
              picks: Array.isArray(bet.picks)
                ? bet.picks.map(cleanStoredPick)
                : [],
            })),
          );
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance, bets }));
  }, [balance, bets, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let stopped = false;

    async function settle() {
      if (stopped || settlementInFlight.current) return;
      const pending = betsRef.current.filter(
        (bet) =>
          bet.status === "Pending" &&
          bet.picks.every((pick) => pick.match.provider === "Flashscore"),
      );
      if (!pending.length) return;
      settlementInFlight.current = true;

      try {
        const ids = [
          ...new Set(
            pending.flatMap((bet) =>
              bet.picks.map((pick) => String(pick.match.id)),
            ),
          ),
        ];
        const results: FootballMatchResult[] = [];
        for (let offset = 0; offset < ids.length; offset += 30) {
          const batch = await orpc.flashscore.results.call({
            ids: ids.slice(offset, offset + 30),
          });
          results.push(...batch.results);
        }
        if (stopped) return;

        const byId = new Map(results.map((result) => [String(result.id), result]));
        let credit = 0;
        const next = betsRef.current.map((bet) => {
          if (bet.status !== "Pending") return bet;
          const outcomes = bet.picks.map((pick) =>
            byId.get(String(pick.match.id)),
          );
          if (outcomes.some((result) => result?.status === "CANCELLED")) {
            credit += bet.stake;
            return { ...bet, status: "Void" as const };
          }
          if (
            outcomes.some(
              (result) =>
                !result || result.status !== "RESULTED" || !result.score,
            )
          )
            return bet;

          const outcomesResult = bet.picks.map((pick, index) =>
            evaluatePick(pick, outcomes[index]!),
          );
          if (outcomesResult.includes("unknown")) return bet;
          if (outcomesResult.includes("loss"))
            return { ...bet, status: "Lost" as const };

          const effectiveOdds = bet.picks.reduce(
            (total, pick, index) =>
              total *
              (outcomesResult[index] === "push" ? 1 : Number(pick.odd)),
            1,
          );
          if (effectiveOdds === 1) {
            credit += bet.stake;
            return { ...bet, status: "Void" as const };
          }

          const payout = bet.stake * effectiveOdds;
          credit += payout;
          return {
            ...bet,
            totalOdds: effectiveOdds,
            potentialReturn: payout,
            status: "Won" as const,
          };
        });

        if (credit > 0) setBalance((current) => current + credit);
        betsRef.current = next;
        setBets(next);
      } catch {
        // Keep unsettled demo picks pending while the results feed is unavailable.
      } finally {
        settlementInFlight.current = false;
      }
    }

    void settle();
    const timer = window.setInterval(settle, 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [hydrated]);

  const totalOdds = useMemo(
    () => selected.reduce((total, item) => total * Number(item.odd), 1),
    [selected],
  );
  const potentialReturn = Number(stake || 0) * totalOdds;

  function togglePick(
    match: Match,
    outcome: string,
    odd: string,
    market?: Selection["market"],
  ) {
    if (odd === "—" || isMatchUnavailable(match.status)) return;
    setSelected((current) => {
      const existing = current.findIndex(
        (item) => item.match.id === match.id && item.outcome === outcome,
      );
      if (existing >= 0 && current[existing].outcome === outcome)
        return current.filter((_, index) => index !== existing);

      // Keep one selection per market/scope for an event, while allowing
      // distinct markets from the same event to form a demo Bet Builder combo.
      const sameMarket = market
        ? current.findIndex(
            (item) =>
              item.match.id === match.id &&
              item.market?.type === market.type &&
              item.market?.scope === market.scope,
          )
        : -1;
      return [
        ...current.filter((_, index) => index !== sameMarket),
        { match, outcome, odd, market },
      ];
    });
    setNotice("");
  }

  function removePick(matchId: string, outcome: string) {
    setSelected((current) =>
      current.filter(
        (item) =>
          String(item.match.id) !== matchId || item.outcome !== outcome,
      ),
    );
  }

  function placeBet() {
    const amount = Number(stake);
    if (!selected.length) return setNotice("Add at least one pick to your demo slip.");
    if (!Number.isFinite(amount) || amount <= 0)
      return setNotice("Enter a valid demo stake.");
    if (amount > balance)
      return setNotice("Your demo balance is too low for that stake.");

    const bet: DemoBet = {
      id: Date.now(),
      picks: selected,
      stake: amount,
      totalOdds,
      potentialReturn,
      placedAt: new Date().toISOString(),
      status: "Pending",
    };
    setBalance((current) => current - amount);
    const next = [bet, ...betsRef.current];
    betsRef.current = next;
    setBets(next);
    setSelected([]);
    setNotice(
      "Demo bet placed. It will settle when Flashscore publishes the final result.",
    );
  }

  return {
    selected,
    stake,
    setStake,
    balance,
    bets,
    notice,
    setNotice,
    totalOdds,
    potentialReturn,
    togglePick,
    removePick,
    placeBet,
  };
}
