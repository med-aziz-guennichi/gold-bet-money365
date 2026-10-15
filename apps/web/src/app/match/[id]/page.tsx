"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";

import { BetSlip } from "@/components/sports/bet-slip";
import { MarketOffers } from "@/components/sports/market-offers";
import { SiteHeader } from "@/components/sports/page-chrome";
import { useDemoBetting } from "@/features/sports/use-demo-betting";
import { useFlashscoreMatches } from "@/features/sports/use-flashscore-matches";
import { formatKickoff } from "@/features/sports/utils";
import { useI18n } from "@/features/i18n/locale-provider";

export default function MatchPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const matchId = decodeURIComponent(params.id);
  const football = useFlashscoreMatches(matchId);
  const betting = useDemoBetting();
  const match = football.matches.find(
    (item) => String(item.id) === matchId,
  );
  const isLive = match?.status === "TRADING_LIVE";

  return (
    <main className="min-h-screen bg-[#080b0a] text-[#f4f5f2]">
      <SiteHeader />
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 pb-16 pt-8 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white"
        >
          <ArrowLeft size={15} /> {t("Back to matches")}
        </Link>

        {football.matchesQuery.isLoading ? (
          <PanelMessage>{t("Loading match details…")}</PanelMessage>
        ) : football.matchesQuery.error ? (
          <PanelMessage>{football.matchesQuery.error.message}</PanelMessage>
        ) : !match ? (
          <PanelMessage>
            {t("This match is no longer in the current Flashscore fixture feed. Go back to the match list and open a current fixture.")}
          </PanelMessage>
        ) : (
          <>
            <section className="rounded-2xl border border-white/[.08] bg-[#111713] p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/45">
                <span>{match.categoryName}</span>
                <span>·</span>
                <span>{match.league}</span>
                <span className="ms-auto inline-flex items-center gap-1.5">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 text-[#ff867a]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff867a]" />
                      {t("LIVE")}
                    </span>
                  ) : (
                    <>
                      <Clock3 size={13} /> {formatKickoff(match.time, locale)}
                    </>
                  )}
                </span>
              </div>
              <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                <div className="text-right">
                  <p className="text-lg font-extrabold sm:text-2xl">{match.home}</p>
                  <p className="mt-1 text-xs text-white/40">{t("Home team")}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/30">{t("vs")}</span>
                <div>
                  <p className="text-lg font-extrabold sm:text-2xl">{match.away}</p>
                  <p className="mt-1 text-xs text-white/40">{t("Away")}</p>
                </div>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-2">
                {match.odds.result.map((odd, index) => {
                  const label = ["1", "X", "2"][index]!;
                  const outcome = `${label} · ${match.league}`;
                  const selected = betting.selected.some(
                    (pick) => pick.match.id === match.id && pick.outcome === outcome,
                  );
                  const disabled = odd === "—" || [
                    "RESULTED", "CLOSED", "CANCELLED", "POST_TRADING", "INTERRUPTED",
                  ].includes(match.status.toUpperCase());
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        betting.togglePick(match, outcome, odd, {
                          type: "HOME_DRAW_AWAY",
                          scope: "FULL_TIME",
                          selection: label === "1" ? "home" : label === "X" ? "draw" : "away",
                        })
                      }
                      className={`rounded-xl border p-3 text-center transition ${selected ? "border-[#c6f36b]/50 bg-[#c6f36b]/10" : "border-white/[.08] bg-black/10 hover:border-white/20"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <span className="block text-xs text-white/45">{label}</span>
                      <span className="mt-1 block font-extrabold tabular-nums text-[#d8ff9d]">{odd}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {football.oddsError && (
              <PanelMessage>{t("Could not refresh additional prices")}: {football.oddsError}</PanelMessage>
            )}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="space-y-3">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight">{t("All offers")}</h1>
                  <p className="mt-1 text-xs text-white/45">
                    {t("Prices and markets supplied by the local Flashscore feed.")}
                  </p>
                </div>
                {football.oddsLoading && match.odds.markets.length === 0 ? (
                  <PanelMessage>{t("Loading Flashscore offers…")}</PanelMessage>
                ) : (
                  <MarketOffers
                    match={match}
                    selected={betting.selected}
                    onPick={betting.togglePick}
                  />
                )}
              </section>
              <BetSlip
                selected={betting.selected}
                balance={betting.balance}
                bets={betting.bets}
                stake={betting.stake}
                notice={betting.notice}
                totalOdds={betting.totalOdds}
                potentialReturn={betting.potentialReturn}
                onStakeChange={betting.setStake}
                onRemove={betting.removePick}
                onPlace={betting.placeBet}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PanelMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-[#111014] p-6 text-sm text-white/55">
      {children}
    </div>
  );
}
