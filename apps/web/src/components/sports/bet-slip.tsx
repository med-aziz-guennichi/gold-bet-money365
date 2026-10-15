"use client";

import { ArrowRight, Plus, ShieldCheck, X } from "lucide-react";

import { useI18n } from "@/features/i18n/locale-provider";
import type { DemoBet, Selection } from "@/features/sports/types";

export type BetSlipProps = {
  selected: Selection[];
  balance: number;
  bets: DemoBet[];
  stake: string;
  notice: string;
  totalOdds: number;
  potentialReturn: number;
  onStakeChange: (value: string) => void;
  onRemove: (matchId: string, outcome: string) => void;
  onPlace: () => void;
};

/** Shows the local demo slip, stake controls, and recent bet settlements. */
export function BetSlip({
  selected,
  balance,
  bets,
  stake,
  notice,
  totalOdds,
  potentialReturn,
  onStakeChange,
  onRemove,
  onPlace,
}: BetSlipProps) {
  const { t } = useI18n();
  const hasSameGameCombo =
    new Set(selected.map((pick) => String(pick.match.id))).size < selected.length;

  return (
    <aside className="sticky top-[88px] rounded-2xl border border-white/[.09] bg-[#101512] p-5" id="bet-slip">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">{t("Your bet slip")}</h2>
          <p className="mt-1 text-[11px] text-white/40">
            {t("Demo balance:")} <span className="font-bold text-[#c6f36b]">{balance.toFixed(2)} {t("credits")}</span>
          </p>
        </div>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/[.07] px-2 text-[11px] font-bold">
          {selected.length}
        </span>
      </header>

      {selected.length ? (
        <>
          <div className="mt-5 space-y-3">
            {selected.map((pick) => (
              <article key={`${pick.match.id}-${pick.outcome}`} className="relative rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 pe-9">
                <button
                  type="button"
                  aria-label={t("Remove selection")}
                  onClick={() => onRemove(String(pick.match.id), pick.outcome)}
                  className="absolute end-3 top-3 text-white/30 hover:text-white"
                >
                  <X size={14} />
                </button>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/35">
                  {pick.match.home} {t("vs")} {pick.match.away}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold">{pick.outcome}</span>
                  <span className="rounded-md bg-[#c6f36b]/10 px-2 py-1 text-[11px] font-extrabold text-[#c6f36b]">
                    {pick.odd}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5">
            <label htmlFor="stake" className="text-[10px] font-bold uppercase tracking-[.13em] text-white/40">
              {t("Demo stake")}
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#090d0a] px-3">
              <input
                id="stake"
                inputMode="decimal"
                value={stake}
                onChange={(event) => onStakeChange(event.target.value.replace(/[^\d.]/g, ""))}
                className="w-full bg-transparent py-3 text-sm font-bold outline-none"
              />
              <span className="text-xs font-bold text-white/35">{t("DEMO")}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {[5, 10, 25].map((amount) => (
                <button key={amount} type="button" onClick={() => onStakeChange(String(amount))} className="flex-1 rounded-lg border border-white/[.08] py-1.5 text-[10px] font-bold text-white/45 hover:border-white/20">
                  {amount}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-white/[.08] pt-4 text-[11px]">
            <div className="flex justify-between text-white/45">
              <span>{t(hasSameGameCombo ? "Combined demo odds" : "Total odds")}</span>
              <span className="font-bold text-white">{totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white/45">
              <span>{t("Potential return")}</span>
              <span className="font-extrabold text-[#c6f36b]">
                {Number.isFinite(potentialReturn) ? potentialReturn.toFixed(2) : "0.00"} {t("demo credits")}
              </span>
            </div>
          </div>
          {hasSameGameCombo && (
            <p className="mt-2 text-[9px] leading-4 text-white/35">
              {t("Same-match demo estimate multiplies the displayed prices. Real Bet Builder prices may adjust for correlated outcomes.")}
            </p>
          )}

          <button type="button" onClick={onPlace} className="mt-5 w-full rounded-xl bg-[#c6f36b] py-3 text-xs font-extrabold text-[#11160b] transition hover:bg-[#d5ff85]">
            {t("Place demo bet")} <ArrowRight className="ms-1 inline rtl-mirror" size={14} />
          </button>
          {notice && <StatusNotice>{t(notice)}</StatusNotice>}
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/[.10] px-4 py-7 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/[.05] text-white/35">
            <Plus size={18} />
          </div>
          <p className="mt-3 text-[11px] font-semibold text-white/65">{t("Pick an outcome to get started")}</p>
          <p className="mt-1 text-[10px] leading-4 text-white/35">{t("Tap any available price to add it here.")}</p>
        </div>
      )}

      {notice && !selected.length && <StatusNotice>{t(notice)}</StatusNotice>}
      {bets.length > 0 && <RecentBets bets={bets.slice(0, 3)} />}
      <div className="mt-5 flex gap-2 rounded-xl bg-white/[.035] p-3">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#c6f36b]" />
        <p className="text-[9px] leading-4 text-white/40">{t("Demo experience only. No deposits, withdrawals, or real-money betting.")}</p>
      </div>
    </aside>
  );
}

function StatusNotice({ children }: { children: string }) {
  return <p role="status" className="mt-3 text-center text-[10px] font-medium text-[#c6f36b]">{children}</p>;
}

function RecentBets({ bets }: { bets: DemoBet[] }) {
  const { t, locale } = useI18n();

  return (
    <section className="mt-5 border-t border-white/[.08] pt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-white/45">
        {t("Recent demo bets")} <span className="font-normal normal-case">{t("match-result settlement")}</span>
      </h3>
      <div className="mt-2 space-y-2">
        {bets.map((bet) => (
          <article key={bet.id} className="rounded-lg bg-white/[.035] p-3">
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-white/75">
                {bet.picks.length} {t(bet.picks.length === 1 ? "pick" : "picks")} · {bet.stake.toFixed(2)} {t("credits")}
              </span>
              <span className={`font-bold ${bet.status === "Won" ? "text-[#c6f36b]" : bet.status === "Lost" ? "text-[#f66c61]" : "text-white/45"}`}>
                {t(bet.status)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-white/35">
              <span>{new Date(bet.placedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} · {bet.totalOdds.toFixed(2)} {t("odds")}</span>
              <span>
                {bet.status === "Won"
                  ? `${t("Paid")} ${bet.potentialReturn.toFixed(2)}`
                  : bet.status === "Lost"
                    ? t("No return")
                    : bet.status === "Void"
                      ? `${t("Refunded")} ${bet.stake.toFixed(2)}`
                      : `${t("Potential")} ${bet.potentialReturn.toFixed(2)}`}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
