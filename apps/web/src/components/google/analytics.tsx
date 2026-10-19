"use client";

import { useI18n } from "@gold-bet-clean-money365/i18n";
import { Card, CardContent } from "@gold-bet-clean-money365/ui/components/card";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { google, measurementPage } from "@/lib/google-config";
import { SITE_URL } from "@/lib/seo";

type GoogleWindow = Window & {
	dataLayer?: unknown[];
	gtag?: (...args: unknown[]) => void;
};
const preferenceKey = "goldbet.analytics-consent.v1";
const actionClass =
	"min-h-11 rounded-xl border border-white/20 px-4 py-2 font-semibold text-sm text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e9bd62]";

export function GoogleAnalytics() {
	const pathname = usePathname();
	const page = measurementPage(pathname);
	const { t } = useI18n();
	const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);
	const [loadedPreference, setLoadedPreference] = useState(false);
	const [open, setOpen] = useState(false);
	const [ready, setReady] = useState(false);
	const lastPage = useRef<string | null>(null);
	useEffect(() => {
		try {
			const saved = localStorage.getItem(preferenceKey);
			if (saved === "accepted" || saved === "rejected") setConsent(saved);
		} catch {
			/* Storage can be unavailable; default to no tracking. */
		}
		setLoadedPreference(true);
	}, []);
	const allowed = Boolean(google.analyticsId && page && consent === "accepted");
	useEffect(() => {
		const id = google.analyticsId;
		if (!id) return;
		Reflect.set(window, `ga-disable-${id}`, !allowed);
		if (!allowed) {
			lastPage.current = null;
			(window as GoogleWindow).gtag?.("consent", "update", {
				analytics_storage: "denied",
			});
			return;
		}
		const target = window as GoogleWindow;
		target.dataLayer ??= [];
		target.gtag ??= function () {
			// biome-ignore lint/complexity/noArguments: gtag consumes the documented Arguments queue, not an array event.
			target.dataLayer?.push(arguments);
		};
		target.gtag("consent", "default", {
			analytics_storage: "denied",
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
		});
		target.gtag("consent", "update", { analytics_storage: "granted" });
	}, [allowed]);
	useEffect(() => {
		if (!allowed || !ready || !page || lastPage.current === pathname) return;
		lastPage.current = pathname;
		const tag = (window as GoogleWindow).gtag;
		tag?.("config", google.analyticsId, {
			send_page_view: false,
			page_location: `${SITE_URL}${page}`,
			page_referrer: "",
			page_title: `GoldBet365 ${page}`,
			allow_google_signals: false,
			allow_ad_personalization_signals: false,
		});
		tag?.("event", "page_view", {
			page_location: `${SITE_URL}${page}`,
			page_referrer: "",
			page_title: `GoldBet365 ${page}`,
		});
	}, [allowed, ready, page, pathname]);
	function choose(value: "accepted" | "rejected") {
		setConsent(value);
		setOpen(false);
		try {
			localStorage.setItem(preferenceKey, value);
		} catch {
			/* Session-only preference. */
		}
		if (value === "rejected") {
			// Remove this site's first-party GA cookies on withdrawal.
			for (const cookie of document.cookie.split(";")) {
				const name = cookie.split("=")[0]?.trim();
				if (name === "_ga" || name?.startsWith("_ga_")) {
					for (const domain of [
						"",
						`; Domain=${location.hostname}`,
						"; Domain=.goldbet365.xyz",
					]) {
						// biome-ignore lint/suspicious/noDocumentCookie: Cross-browser fallback removes only first-party GA cookies.
						document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
					}
				}
			}
		}
	}
	if (!google.analyticsId || !page) return null;
	return (
		<>
			{allowed && (
				<Script
					id="goldbet-ga"
					src={`https://www.googletagmanager.com/gtag/js?id=${google.analyticsId}`}
					strategy="afterInteractive"
					onReady={() => {
						(window as GoogleWindow).gtag?.("js", new Date());
						setReady(true);
					}}
				/>
			)}
			<div className="mx-auto max-w-[1440px] px-4 py-3 text-end sm:px-8">
				<button
					type="button"
					className="min-h-11 text-sm text-white/60 underline underline-offset-4 hover:text-white"
					onClick={() => setOpen(true)}
				>
					{t("Analytics preferences")}
				</button>
			</div>
			{loadedPreference && (open || consent === null) && (
				<Card
					role="region"
					aria-label={t("Analytics preferences")}
					className="fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#111713] py-0 text-white shadow-2xl sm:inset-x-auto sm:start-6 sm:top-auto sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:w-[440px] sm:max-w-[calc(100vw-3rem)]"
				>
					<CardContent className="space-y-3 p-5">
						<h2 className="flex items-center gap-2 font-bold text-base">
							<ShieldCheck
								aria-hidden="true"
								className="size-5 shrink-0 text-[#e9bd62]"
							/>
							{t("Your privacy, your choice")}
						</h2>
						<p className="text-sm text-white/65 leading-6">
							{t(
								"Optional Google Analytics helps us understand visits to public pages. It stays off unless you accept. Your account, wallet, bets and login pages are not measured.",
							)}
						</p>
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								className={actionClass}
								onClick={() => choose("rejected")}
							>
								{t("Reject analytics")}
							</button>
							<button
								type="button"
								className={actionClass}
								onClick={() => choose("accepted")}
							>
								{t("Accept analytics")}
							</button>
							<Link
								className="col-span-2 inline-flex min-h-11 items-center justify-center text-center text-sm text-white/65 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e9bd62]"
								href="/privacy"
							>
								{t("Privacy information")}
							</Link>
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}
