import type { FootballMatch } from "@gold-bet-clean-money365/api/football";

export type Match = FootballMatch;

export type Selection = {
  match: Match;
  outcome: string;
  odd: string;
  market?: {
    type: string;
    scope: string;
    selection: string;
    handicap?: string | null;
    score?: string | null;
  };
};

export type DemoBet = {
  id: number;
  picks: Selection[];
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  placedAt: string;
  status: "Pending" | "Won" | "Lost" | "Void";
};

export type Region = { key: string; name: string };
