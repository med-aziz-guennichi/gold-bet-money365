"use client";

import { HeroSection, HighlightsSection, SiteHeader } from "@/components/sports/page-chrome";
import { MatchCenter } from "@/components/sports/match-center";
import { useDemoBetting } from "@/features/sports/use-demo-betting";
import { useFlashscoreMatches } from "@/features/sports/use-flashscore-matches";

/** Route composition: data and betting behavior live in feature hooks. */
export default function Home() {
  const football = useFlashscoreMatches();
  const betting = useDemoBetting();

  return (
    <main className="min-h-screen bg-[#080b0a] text-[#f4f5f2]">
      <SiteHeader />
      <div id="top" className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-8 sm:pt-10">
        <HeroSection featuredMatch={football.featuredMatch} />
        <MatchCenter
          matches={football.pricedMatches}
          regions={football.regions}
          loading={football.matchesQuery.isLoading}
          error={football.matchesQuery.error?.message}
          oddsLoading={football.oddsLoading}
          oddsError={football.oddsError}
          selected={betting.selected}
          onPick={betting.togglePick}
          slip={{
            selected: betting.selected,
            balance: betting.balance,
            bets: betting.bets,
            stake: betting.stake,
            notice: betting.notice,
            totalOdds: betting.totalOdds,
            potentialReturn: betting.potentialReturn,
            onStakeChange: betting.setStake,
            onRemove: betting.removePick,
            onPlace: betting.placeBet,
          }}
        />
        <HighlightsSection />
      </div>
    </main>
  );
}
