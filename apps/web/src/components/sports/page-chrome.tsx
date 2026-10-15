"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  Clock3,
  Menu,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import { formatKickoff } from "@/features/sports/utils";
import type { Match } from "@/features/sports/types";
import { useI18n } from "@/features/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[.07] bg-[#080b0a]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label={`Fieldhouse · ${t("Home")}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c6f36b] text-[#11160b]">
            <CircleDot size={21} strokeWidth={2.5} />
          </span>
          <span className="text-[19px] font-extrabold tracking-[-.06em]">
            fieldhouse<span className="text-[#c6f36b]">.</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-white/55 md:flex">
          <a className="text-white" href="#matches">{t("Sports")}</a>
          <a className="transition hover:text-white" href="#live">{t("Live")}</a>
          <a className="transition hover:text-white" href="#responsible">{t("Responsible play")}</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher compact />
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/60 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f36b]" /> {t("DEMO MODE")}
          </span>
          <a href="#matches" className="rounded-xl bg-[#c6f36b] px-4 py-2.5 text-xs font-extrabold text-[#11160b] transition hover:bg-[#d5ff85]">
            {t("Explore games")} <ArrowRight className="ml-1 inline rtl-mirror" size={14} />
          </a>
          <button type="button" className="rounded-lg border border-white/10 p-2 md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={t("Toggle menu")} aria-expanded={menuOpen}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="grid gap-1 border-t border-white/[.07] px-5 py-3 text-sm text-white/65 md:hidden">
          {[["Sports", "matches"], ["Live games", "live"], ["Responsible play", "responsible"]].map(([label, id]) => (
            <a key={id} className="rounded-lg p-2" href={`#${id}`} onClick={() => setMenuOpen(false)}>{t(label!)}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function HeroSection({ featuredMatch }: { featuredMatch?: Match }) {
  const { t, locale } = useI18n();
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/[.08] bg-[#111713] px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
      <div className="pointer-events-none absolute -right-20 -top-48 -z-10 h-[470px] w-[470px] rounded-full border border-[#c6f36b]/10 sm:right-16">
        <div className="absolute inset-10 rounded-full border border-[#c6f36b]/10"><div className="absolute inset-10 rounded-full border border-[#c6f36b]/10" /></div>
      </div>
      <div className="pointer-events-none absolute -right-8 bottom-[-170px] -z-10 h-[340px] w-[340px] rounded-full bg-[#a9e744]/[.08] blur-[85px]" />
      <div className="max-w-[650px]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c6f36b]/20 bg-[#c6f36b]/[.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#c6f36b]">
          <Sparkles size={12} /> {t("Sports, with a little more soul")}
        </div>
        <h1 className="text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[.99] tracking-[-.07em]">
          {t("The game is")}<br /><span className="text-[#c6f36b]">{t("better together.")}</span>
        </h1>
        <p className="mt-5 max-w-[460px] text-[14px] leading-6 text-white/55 sm:text-[15px]">
          {t("A cleaner way to follow the moments that matter. Explore matchups, compare the odds, and make every game day yours.")}
        </p>
        <a className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#c6f36b] px-5 py-3 text-[13px] font-extrabold text-[#11160b] transition hover:-translate-y-0.5 hover:bg-[#d5ff85]" href="#matches">
          {t("Browse today's games")} <ArrowRight className="rtl-mirror" size={15} />
        </a>
        <p className="mt-3 text-[10px] text-white/30">{t("Just exploring? You’re in demo mode — no real money involved.")}</p>
      </div>
      <div className="absolute bottom-7 right-10 hidden max-w-[285px] rotate-[-4deg] rounded-2xl border border-white/10 bg-[#171e19]/90 p-4 shadow-2xl backdrop-blur-lg xl:block">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[.12em] text-white/40">
          <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${featuredMatch?.status === "TRADING_LIVE" ? "animate-pulse bg-[#f66c61]" : "bg-[#c6f36b]"}`} />{featuredMatch?.status === "TRADING_LIVE" ? t("Live market") : t("Sports feed")}</span>
          <span>{featuredMatch?.league ?? t("Feed preview")}</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-bold">{featuredMatch?.home ?? t("Fixtures")}</span>
          <span className="text-[10px] font-black tracking-tight text-white/35">{featuredMatch ? "VS" : "&"}</span>
          <span className="text-xs font-bold">{featuredMatch?.away ?? t("Live odds")}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3 text-[10px] text-white/40">
          <span>{featuredMatch ? formatKickoff(featuredMatch.time, locale) : t("Flashscore fixtures")}</span>
          <ArrowUpRight size={13} />
        </div>
      </div>
    </section>
  );
}

export function HighlightsSection() {
  const { t } = useI18n();
  const features = [
    { title: "Live as it happens", copy: "Follow the score, feel the momentum, and stay in the moment.", icon: CircleDot, tone: "text-[#f66c61] bg-[#f66c61]/10" },
    { title: "Every sport, one place", copy: "From the biggest football nights to courtside showdowns.", icon: Trophy, tone: "text-[#c6f36b] bg-[#c6f36b]/10" },
    { title: "Made for game day", copy: "Clear fixtures, easy picks, and less time finding your way.", icon: Clock3, tone: "text-[#90a9ff] bg-[#90a9ff]/10" },
  ];
  return (
    <>
      <section className="mt-10 grid gap-3 sm:grid-cols-3" id="live">
        {features.map(({ title, copy, icon: Icon, tone }) => (
          <article key={title} className="rounded-2xl border border-white/[.08] bg-[#101512] p-5">
            <div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div>
            <h3 className="text-[13px] font-bold">{t(title)}</h3>
            <p className="mt-1.5 text-[11px] leading-5 text-white/40">{t(copy)}</p>
          </article>
        ))}
      </section>
      <footer className="mt-12 flex flex-col gap-4 border-t border-white/[.08] pt-6 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between" id="responsible">
        <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#c6f36b]" /> {t("Play for fun. Set limits. Take a break.")}</span>
        <span>18+ · Flashscore fixtures and odds · Feed may be delayed · Demo bet slip</span>
        <a href="https://www.gambleaware.org/" target="_blank" rel="noreferrer" className="transition hover:text-white/70">
          {t("Need support? Visit GambleAware")} <ArrowUpRight className="ml-0.5 inline" size={11} />
        </a>
      </footer>
    </>
  );
}
