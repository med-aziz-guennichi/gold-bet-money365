"use client";

import { LocalizedText } from "@gold-bet-clean-money365/i18n";

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
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import UserMenu from "@/components/user-menu";
import { useI18n } from "@/features/i18n/locale-provider";
import type { Match } from "@/features/sports/types";
import { formatKickoff } from "@/features/sports/utils";

export function SiteHeader() {
	return (
		<Suspense>
			<HeaderNavigation />
		</Suspense>
	);
}

function HeaderNavigation() {
	const [menuOpen, setMenuOpen] = useState(false);
	const { t } = useI18n();
	const pathname = usePathname();
	const params = useSearchParams();
	const sport = params.get("sport") ?? "football";
	const sportsHref =
		`/?sport=${encodeURIComponent(sport)}&day=0#matches` as const;
	const liveHref =
		`/?sport=${encodeURIComponent(sport)}&day=0&view=live#matches` as const;
	const navigation = [
		{
			label: t("Sports"),
			href: sportsHref,
			active:
				(pathname === "/" && params.get("view") !== "live") ||
				pathname.startsWith("/match/"),
		},
		{
			label: t("Live"),
			href: liveHref,
			active: pathname === "/" && params.get("view") === "live",
		},
		{
			label: "Casino",
			href: "/casino",
			active: pathname === "/casino" || pathname.startsWith("/casino/"),
		},
		{
			label: t("Responsible play"),
			href: "/responsible-play",
			active: pathname === "/responsible-play",
		},
	] as const;
	return (
		<header className="sticky top-0 z-40 border-white/[.07] border-b bg-[#080b0a]/95 backdrop-blur-xl">
			<div className="mx-auto flex min-h-[72px] max-w-[1440px] flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-8">
				<Brand compact />
				<nav className="hidden items-center gap-8 font-semibold text-[13px] text-white/55 md:flex">
					{navigation.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							aria-current={item.active ? "page" : undefined}
							className={
								item.active ? "text-[#c6f36b]" : "transition hover:text-white"
							}
						>
							<LocalizedText text={item.label} />
						</Link>
					))}
				</nav>
				<div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
					<LanguageSwitcher compact />
					<UserMenu />

					<a
						href={sportsHref}
						className="hidden rounded-xl bg-[#c6f36b] px-4 py-2.5 font-extrabold text-[#11160b] text-xs transition hover:bg-[#d5ff85] xl:block"
					>
						{t("Explore games")}{" "}
						<ArrowRight className="rtl-mirror ml-1 inline" size={14} />
					</a>
					<button
						type="button"
						className="rounded-lg border border-white/10 p-2 md:hidden"
						onClick={() => setMenuOpen((open) => !open)}
						aria-label={t("Toggle menu")}
						aria-expanded={menuOpen}
					>
						{menuOpen ? <X size={18} /> : <Menu size={18} />}
					</button>
				</div>
			</div>
			{menuOpen && (
				<nav className="grid gap-1 border-white/[.07] border-t px-5 py-3 text-sm text-white/65 md:hidden">
					{navigation.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							onClick={() => setMenuOpen(false)}
							aria-current={item.active ? "page" : undefined}
							className={`rounded-lg p-2 ${item.active ? "bg-[#c6f36b]/10 text-[#c6f36b]" : "hover:text-white"}`}
						>
							<LocalizedText text={item.label} />
						</Link>
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
			<div className="pointer-events-none absolute -top-48 -right-20 -z-10 h-[470px] w-[470px] rounded-full border border-[#c6f36b]/10 sm:right-16">
				<div className="absolute inset-10 rounded-full border border-[#c6f36b]/10">
					<div className="absolute inset-10 rounded-full border border-[#c6f36b]/10" />
				</div>
			</div>
			<div className="pointer-events-none absolute -right-8 bottom-[-170px] -z-10 h-[340px] w-[340px] rounded-full bg-[#a9e744]/[.08] blur-[85px]" />
			<div className="max-w-[650px]">
				<div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c6f36b]/20 bg-[#c6f36b]/[.08] px-3 py-1.5 font-bold text-[#c6f36b] text-[10px] uppercase tracking-[.16em]">
					<Sparkles size={12} /> {t("Sports, with a little more soul")}
				</div>
				<h1 className="font-extrabold text-[clamp(2rem,8vw,5rem)] leading-[.99] tracking-[-.07em]">
					{t("The game is")}
					<br />
					<span className="text-[#c6f36b]">{t("better together.")}</span>
				</h1>
				<p className="mt-5 max-w-[460px] text-[14px] text-white/55 leading-6 sm:text-[15px]">
					{t(
						"A cleaner way to follow the moments that matter. Explore matchups, compare the odds, and make every game day yours.",
					)}
				</p>
				<a
					className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#c6f36b] px-5 py-3 font-extrabold text-[#11160b] text-[13px] transition hover:-translate-y-0.5 hover:bg-[#d5ff85]"
					href="/?day=0#matches"
				>
					{t("Browse today's games")}{" "}
					<ArrowRight className="rtl-mirror" size={15} />
				</a>
				<p className="mt-3 text-[10px] text-white/30">
					{t(
						"Browse matches and sign in with your user account to bet with wallet credits.",
					)}
				</p>
			</div>
			<div className="absolute right-10 bottom-7 hidden max-w-[285px] rotate-[-4deg] rounded-2xl border border-white/10 bg-[#171e19]/90 p-4 shadow-2xl backdrop-blur-lg xl:block">
				<div className="flex items-center justify-between font-bold text-[9px] text-white/40 uppercase tracking-[.12em]">
					<span className="flex items-center gap-1.5">
						<span
							className={`h-1.5 w-1.5 rounded-full ${featuredMatch?.status === "TRADING_LIVE" ? "animate-pulse bg-[#f66c61]" : "bg-[#c6f36b]"}`}
						/>
						{featuredMatch?.status === "TRADING_LIVE"
							? t("Live market")
							: t("Sports feed")}
					</span>
					<span>{featuredMatch?.league ?? t("Feed preview")}</span>
				</div>
				<div className="mt-5 flex items-center justify-between gap-3">
					<span className="font-bold text-xs">
						{featuredMatch?.home ?? t("Fixtures")}
					</span>
					<span className="font-black text-[10px] text-white/35 tracking-tight">
						<LocalizedText text={featuredMatch ? "VS" : "&"} />
					</span>
					<span className="font-bold text-xs">
						{featuredMatch?.away ?? t("Live odds")}
					</span>
				</div>
				<div className="mt-4 flex items-center justify-between border-white/[.07] border-t pt-3 text-[10px] text-white/40">
					<span>
						{featuredMatch
							? formatKickoff(featuredMatch.time, locale)
							: t("Flashscore fixtures")}
					</span>
					<ArrowUpRight size={13} />
				</div>
			</div>
		</section>
	);
}

export function HighlightsSection() {
	const { t } = useI18n();
	const features = [
		{
			title: "Live as it happens",
			copy: "Follow the score, feel the momentum, and stay in the moment.",
			icon: CircleDot,
			tone: "text-[#f66c61] bg-[#f66c61]/10",
		},
		{
			title: "Every sport, one place",
			copy: "From the biggest football nights to courtside showdowns.",
			icon: Trophy,
			tone: "text-[#c6f36b] bg-[#c6f36b]/10",
		},
		{
			title: "Made for game day",
			copy: "Clear fixtures, easy picks, and less time finding your way.",
			icon: Clock3,
			tone: "text-[#90a9ff] bg-[#90a9ff]/10",
		},
	] as const;
	return (
		<>
			<section className="mt-10 grid gap-3 sm:grid-cols-3">
				{features.map(({ title, copy, icon: Icon, tone }) => (
					<article
						key={title}
						className="rounded-2xl border border-white/[.08] bg-[#101512] p-5"
					>
						<div
							className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
						>
							<Icon size={17} />
						</div>
						<h3 className="font-bold text-[13px]">{t(title)}</h3>
						<p className="mt-1.5 text-[11px] text-white/40 leading-5">
							{t(copy)}
						</p>
					</article>
				))}
			</section>
			<footer
				className="mt-12 flex flex-col gap-4 border-white/[.08] border-t pt-6 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between"
				id="responsible"
				style={{ scrollMarginTop: 100 }}
			>
				<span className="flex items-center gap-2">
					<ShieldCheck size={14} className="text-[#c6f36b]" />{" "}
					{t("Play for fun. Set limits. Take a break.")}
				</span>
				<span>
					{" "}
					<LocalizedText text="18+ · Flashscore fixtures and odds · Feed may be delayed · Account bet slip" />{" "}
				</span>
				<a
					href="https://www.gambleaware.org/"
					target="_blank"
					rel="noreferrer"
					className="transition hover:text-white/70"
				>
					{t("Need support? Visit GambleAware")}{" "}
					<ArrowUpRight className="ml-0.5 inline" size={11} />
				</a>
			</footer>
		</>
	);
}
