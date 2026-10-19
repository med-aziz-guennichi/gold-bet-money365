"use client";

import { useI18n } from "@gold-bet-clean-money365/i18n";
import { Card, CardContent } from "@gold-bet-clean-money365/ui/components/card";
import { ArrowLeft, ExternalLink, LoaderCircle, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { safeDemoUrl } from "@/lib/casino-demo";

type Provider = "casino-api-pro" | "vfair";
const catalogues = {
	vfair: [
		["dice", "Dice"],
		["mines", "Mines"],
		["limbo", "Limbo"],
		["plinko", "Plinko"],
		["keno", "Keno"],
	],
	"casino-api-pro": [
		["goal-jet", "Goal Jet"],
		["mines", "Mines"],
		["spin-bottle", "Spin da' Bottle"],
		["magic-ball", "Magic Ball"],
		["dice", "Dice"],
		["lucky-wheel", "Lucky Wheel"],
		["under-over-7", "Under Over 7"],
		["nova-drop", "Nova Drop"],
		["twin-wheels", "Twin Wheels"],
		["prize-drum", "Prize Drum"],
		["gem-rush", "Gem Rush"],
		["chilli-sevens", "Chilli Sevens"],
		["big-top-coins", "Big Top Coins"],
		["prism-sevens", "Prism Sevens"],
	],
} satisfies Record<Provider, string[][]>;

const action =
	"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e9bd62]";

export function ProviderGames({ provider }: { provider: Provider }) {
	const { t } = useI18n();
	const [selected, setSelected] = useState<{
		name: string;
		url: string;
	} | null>(null);
	const [pending, setPending] = useState<string | null>(null);
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(false);
	const [slow, setSlow] = useState(false);
	const request = useRef<AbortController | null>(null);
	const busy = useRef(false);
	useEffect(() => () => request.current?.abort(), []);
	useEffect(() => {
		if (!loading) return;
		const timer = setTimeout(() => setSlow(true), 15000);
		return () => clearTimeout(timer);
	}, [loading]);
	async function launch(id: string, name: string) {
		if (busy.current) return;
		setError(false);
		setSlow(false);
		if (provider === "vfair") {
			setLoading(true);
			setSelected({ name, url: `https://${id}.vfair.games/` });
			return;
		}
		busy.current = true;
		setPending(id);
		const controller = new AbortController();
		request.current = controller;
		const timeout = setTimeout(() => controller.abort(), 12000);
		try {
			const response = await fetch("/api/casino/demo", {
				method: "POST",
				credentials: "omit",
				referrerPolicy: "no-referrer",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ game: id }),
				signal: controller.signal,
			});
			if (!response.ok) throw new Error("Unavailable");
			const data: unknown = await response.json();
			const url = safeDemoUrl(
				typeof data === "object" && data !== null && "launch_url" in data
					? data.launch_url
					: null,
			);
			if (!url) throw new Error("Invalid launch response");
			if (controller.signal.aborted) return;
			setLoading(true);
			setSelected({ name, url });
		} catch {
			if (request.current === controller) setError(true);
		} finally {
			clearTimeout(timeout);
			busy.current = false;
			setPending(null);
		}
	}
	return (
		<main className="arcade-shell space-y-6">
			<div className="space-y-3">
				<span className="arcade-kicker">
					GOLDBET365 / {t("Provider demos")}
				</span>
				<h1 className="font-bold text-3xl sm:text-4xl">
					{provider === "vfair" ? "vFair Games" : "Casino API Pro"}
				</h1>
				<p className="max-w-3xl">
					{t(
						"Free-play provider demos use separate demo balances. They do not spend or add GoldBet365 credits. No purchases, prizes or withdrawals.",
					)}
				</p>
			</div>
			{error && (
				<p
					role="alert"
					className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm"
				>
					{t(
						"The provider could not launch this game. Please try again or use the provider website.",
					)}
				</p>
			)}
			{selected ? (
				<section aria-label={selected.name} className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<button
							type="button"
							className={action}
							onClick={() => {
								setSelected(null);
								setLoading(false);
								setSlow(false);
							}}
						>
							<ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
							{t("Back to games")}
						</button>
						<h2 className="font-bold text-xl">{selected.name}</h2>
						<a
							className={action}
							href={selected.url}
							target="_blank"
							rel="noopener noreferrer"
						>
							{t("Open game in new tab")}
							<ExternalLink aria-hidden="true" className="size-4" />
						</a>
					</div>
					{loading && (
						<p role="status" className="flex items-center gap-2 text-sm">
							<LoaderCircle
								aria-hidden="true"
								className="size-4 animate-spin motion-reduce:animate-none"
							/>
							{t("Loading game…")}
						</p>
					)}
					{slow && (
						<p role="status" className="text-sm">
							{t(
								"Taking longer than expected? Open the game in a new tab. Provider availability may vary.",
							)}
						</p>
					)}
					<iframe
						key={selected.url}
						src={selected.url}
						title={`${selected.name} — ${t("Provider demos")}`}
						className="h-[min(780px,80dvh)] min-h-[520px] w-full rounded-2xl border border-white/15 bg-[#101512]"
						allow="autoplay; fullscreen"
						referrerPolicy="no-referrer"
						sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
						onLoad={() => setLoading(false)}
						onError={() => {
							setLoading(false);
							setSlow(true);
						}}
					/>
				</section>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3 min-[360px]:grid-cols-2">
					{catalogues[provider].map(([id, name], index) => (
						<Card
							key={id}
							className="rounded-2xl border border-white/15 bg-[#111b22] py-0 text-white"
						>
							<CardContent className="flex h-full flex-col gap-4 p-5">
								<span
									aria-hidden="true"
									className="font-mono text-[#e9bd62] text-sm"
								>
									{String(index + 1).padStart(2, "0")} / {t("Demo")}
								</span>
								<h2 className="break-words font-bold text-xl">{name}</h2>
								<button
									type="button"
									disabled={pending !== null}
									className={`${action} mt-auto disabled:cursor-wait disabled:opacity-50`}
									onClick={() => void launch(id, name)}
								>
									{pending === id ? (
										<LoaderCircle
											aria-hidden="true"
											className="size-4 animate-spin motion-reduce:animate-none"
										/>
									) : (
										<Play aria-hidden="true" className="size-4" />
									)}
									{t(pending === id ? "Loading game…" : "Play demo")}
								</button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
			<a
				className={action}
				href={
					provider === "vfair"
						? "https://vfair.games/games/"
						: "https://casinoapipro.com/games"
				}
				target="_blank"
				rel="noopener noreferrer"
			>
				{t("Provider website")}
				<ExternalLink aria-hidden="true" className="size-4" />
			</a>
		</main>
	);
}
