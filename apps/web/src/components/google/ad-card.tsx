"use client";

import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { Card, CardContent } from "@gold-bet-clean-money365/ui/components/card";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { google } from "@/lib/google-config";

/** Manual placement only: never overlays a control, refreshes an ad, or asks for clicks. */
export function HomeAdCard() {
	const element = useRef<HTMLModElement>(null);
	const requested = useRef(false);
	const [visible, setVisible] = useState(false);
	const [ready, setReady] = useState(false);
	const [unfilled, setUnfilled] = useState(false);
	useEffect(() => {
		if (!google.adsEnabled || !element.current) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(element.current);
		const status = new MutationObserver(() => {
			if (element.current?.dataset.adStatus === "unfilled") setUnfilled(true);
		});
		status.observe(element.current, {
			attributes: true,
			attributeFilter: ["data-ad-status"],
		});
		return () => {
			observer.disconnect();
			status.disconnect();
		};
	}, []);
	useEffect(() => {
		if (!ready || !visible || requested.current || !element.current) return;
		const node = element.current;
		const request = () => {
			if (requested.current || node.clientWidth === 0) return;
			requested.current = true;
			try {
				const target = window as Window & { adsbygoogle?: object[] };
				target.adsbygoogle ??= [];
				target.adsbygoogle.push({});
			} catch {
				setUnfilled(true);
			}
		};
		const resize = new ResizeObserver(request);
		resize.observe(node);
		request();
		return () => resize.disconnect();
	}, [ready, visible]);
	if (!google.adsEnabled || unfilled) return null;
	return (
		<section
			className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8"
			aria-label="Advertisement"
		>
			{visible && (
				<Script
					id="goldbet-adsense"
					async
					strategy="afterInteractive"
					src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${google.publisherId}`}
					crossOrigin="anonymous"
					onReady={() => setReady(true)}
					onError={() => setUnfilled(true)}
				/>
			)}
			<Card className="gap-0 rounded-2xl border border-white/10 bg-[#101512] py-0 text-white shadow-none">
				<div className="border-white/10 border-b px-5 py-3 text-[10px] text-white/45 uppercase tracking-[.18em]">
					<LocalizedText text="Advertisement" />
				</div>
				<CardContent className="min-w-0 px-3 py-5 sm:px-6">
					<ins
						ref={element}
						className="adsbygoogle block min-h-[250px] w-full"
						style={{ display: "block" }}
						data-ad-client={google.publisherId}
						data-ad-slot={google.homeSlot}
						data-ad-format="auto"
						data-full-width-responsive="true"
					/>
				</CardContent>
			</Card>
		</section>
	);
}
