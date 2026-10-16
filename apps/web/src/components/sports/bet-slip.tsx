"use client";

import { formatTnd } from "@gold-bet-clean-money365/api/access";
import type { SavedBet } from "@gold-bet-clean-money365/api/betting";
import { ArrowRight, Plus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/features/i18n/locale-provider";
import type { Selection } from "@/features/sports/types";

export type BetSlipProps = {
	selected: Selection[];
	balanceMillimes: number;
	bets: SavedBet[];
	stake: string;
	notice: string;
	totalOdds: number;
	potentialReturnMillimes: number;
	eligibilityMessage: string;
	walletLoading: boolean;
	historyLoading: boolean;
	placing: boolean;
	canPlace: boolean;
	onStakeChange: (value: string) => void;
	onRemove: (matchId: string, outcome: string) => void;
	onPlace: () => void;
};

/** Displays server wallet credits and persisted bets; never credits or settles money. */
export function BetSlip({
	selected,
	balanceMillimes,
	bets,
	stake,
	notice,
	totalOdds,
	potentialReturnMillimes,
	eligibilityMessage,
	walletLoading,
	historyLoading,
	placing,
	canPlace,
	onStakeChange,
	onRemove,
	onPlace,
}: BetSlipProps) {
	const { t, locale } = useI18n();
	return (
		<aside
			className="sticky top-[88px] rounded-2xl border border-white/[.09] bg-[#101512] p-5"
			id="bet-slip"
			aria-busy={placing}
		>
			<header className="flex items-center justify-between">
				<div>
					<h2 className="font-extrabold text-[15px] tracking-tight">
						{t("Your bet slip")}
					</h2>
					{!eligibilityMessage && (
						<p className="mt-1 text-[11px] text-white/40">
							{t("Wallet credits")}:{" "}
							<span className="font-bold text-[#c6f36b]">
								{walletLoading ? t("Loading…") : formatTnd(balanceMillimes)}
							</span>
						</p>
					)}
				</div>
				<span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/[.07] px-2 font-bold text-[11px]">
					{selected.length}
				</span>
			</header>
			{eligibilityMessage && (
				<p
					role="status"
					className="mt-4 rounded-xl border border-white/10 p-3 text-white/60 text-xs leading-5"
				>
					{t(eligibilityMessage)}{" "}
					<Link href="/login" className="text-[#c6f36b] underline">
						{t("Login")}
					</Link>
				</p>
			)}
			{selected.length ? (
				<>
					<div className="mt-5 space-y-3">
						{selected.map((pick) => (
							<article
								key={`${pick.match.id}-${pick.outcome}`}
								className="relative rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 pe-9"
							>
								<button
									type="button"
									aria-label={t("Remove selection")}
									disabled={placing}
									onClick={() => onRemove(String(pick.match.id), pick.outcome)}
									className="absolute end-3 top-3 text-white/30 hover:text-white disabled:opacity-30"
								>
									<X size={14} />
								</button>
								<p className="font-semibold text-[9px] text-white/35 uppercase tracking-wide">
									{pick.match.home} {t("vs")} {pick.match.away}
								</p>
								<div className="mt-2 flex items-center justify-between gap-2">
									<span className="font-bold text-[11px]">{pick.outcome}</span>
									<span className="rounded-md bg-[#c6f36b]/10 px-2 py-1 font-extrabold text-[#c6f36b] text-[11px]">
										{pick.odd}
									</span>
								</div>
							</article>
						))}
					</div>
					<div className="mt-5">
						<label
							htmlFor="stake"
							className="font-bold text-[10px] text-white/40 uppercase tracking-[.13em]"
						>
							{t("Stake (TND credits)")}
						</label>
						<div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#090d0a] px-3">
							<input
								id="stake"
								type="number"
								min="0.001"
								max="1000000000"
								step="0.001"
								inputMode="decimal"
								value={stake}
								disabled={placing}
								onChange={(event) => onStakeChange(event.target.value)}
								className="w-full bg-transparent py-3 font-bold text-sm outline-none"
							/>
							<span className="font-bold text-white/35 text-xs">TND</span>
						</div>
						<div className="mt-2 flex gap-2">
							{[5, 10, 25].map((amount) => (
								<button
									key={amount}
									type="button"
									disabled={placing}
									onClick={() => onStakeChange(String(amount))}
									className="flex-1 rounded-lg border border-white/[.08] py-1.5 font-bold text-[10px] text-white/45 hover:border-white/20 disabled:opacity-30"
								>
									{amount}
								</button>
							))}
						</div>
					</div>
					<div className="mt-5 space-y-2 border-white/[.08] border-t pt-4 text-[11px]">
						<div className="flex justify-between text-white/45">
							<span>{t("Total odds")}</span>
							<span className="font-bold text-white">
								{totalOdds.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between text-white/45">
							<span>{t("Potential return")}</span>
							<span className="font-extrabold text-[#c6f36b]">
								{formatTnd(potentialReturnMillimes)}
							</span>
						</div>
					</div>
					<p className="mt-2 text-[9px] text-white/35 leading-4">
						{t(
							"One selection per match. Current prices are checked before acceptance.",
						)}
					</p>
					<button
						type="button"
						onClick={onPlace}
						disabled={!canPlace}
						className="mt-5 w-full rounded-xl bg-[#c6f36b] py-3 font-extrabold text-[#11160b] text-xs transition hover:bg-[#d5ff85] disabled:cursor-not-allowed disabled:opacity-40"
					>
						{t(placing ? "Placing bet…" : "Place bet")}{" "}
						<ArrowRight className="rtl-mirror ms-1 inline" size={14} />
					</button>
				</>
			) : (
				!eligibilityMessage && (
					<div className="mt-5 rounded-xl border border-white/[.10] border-dashed px-4 py-7 text-center">
						<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/[.05] text-white/35">
							<Plus size={18} />
						</div>
						<p className="mt-3 font-semibold text-[11px] text-white/65">
							{t("Pick an outcome to get started")}
						</p>
						<p className="mt-1 text-[10px] text-white/35 leading-4">
							{t("Tap any available price to add it here.")}
						</p>
					</div>
				)
			)}
			{notice && (
				<p
					role="status"
					className="mt-3 text-center font-medium text-[#c6f36b] text-[10px]"
				>
					{t(notice)}
				</p>
			)}
			{historyLoading && (
				<p role="status" className="mt-4 text-white/45 text-xs">
					{t("Loading recent bets…")}
				</p>
			)}
			{!eligibilityMessage && (
				<Link
					href="/bets"
					className="mt-5 block font-semibold text-[#c6f36b] text-xs hover:underline"
				>
					{t("View all bets")} →
				</Link>
			)}
			{bets.length > 0 && (
				<section className="mt-5 border-white/[.08] border-t pt-4">
					<h3 className="font-bold text-[10px] text-white/45 uppercase tracking-wide">
						{t("Recent bets")}
					</h3>
					<div className="mt-2 max-h-96 space-y-2 overflow-y-auto">
						{bets.map((bet) => (
							<article key={bet.id} className="rounded-lg bg-white/[.035] p-3">
								<div className="flex justify-between gap-2 text-[10px]">
									<span className="font-bold text-white/75">
										{bet.picks.length}{" "}
										{t(bet.picks.length === 1 ? "pick" : "picks")} ·{" "}
										{formatTnd(bet.stakeMillimes)}
									</span>
									<span className="font-bold text-white/45">
										{t(bet.status)}
									</span>
								</div>
								{bet.picks.map((pick) => {
									const progress = bet.pickResults?.find(
										(result) => result.matchId === pick.matchId,
									);
									return (
										<p
											key={pick.matchId}
											className="mt-2 text-[10px] text-white/50"
										>
											{pick.home} {t("vs")} {pick.away} ·{" "}
											{pick.market.selection} @ {pick.odd}
											{progress?.score && (
												<span className="mt-1 block font-bold text-white/75">
													{progress.score.home} – {progress.score.away} ·{" "}
													{t(
														progress.status === "RESULTED"
															? "Match finished"
															: progress.status === "TRADING_LIVE"
																? "LIVE"
																: "Pending",
													)}
													{progress.latestEventMinute &&
													progress.status === "TRADING_LIVE"
														? ` · ${t("Latest event")}: ${progress.latestEventMinute}′`
														: ""}
												</span>
											)}
										</p>
									);
								})}
								<p className="mt-2 text-[9px] text-white/35">
									{new Date(bet.placedAt).toLocaleString(locale)} ·{" "}
									{bet.totalOdds.toFixed(2)} {t("odds")}
								</p>
								<p className="mt-1 text-[#c6f36b] text-[10px]">
									{t("Potential return")}:{" "}
									{formatTnd(bet.potentialReturnMillimes)}
								</p>
								<p className="mt-2 text-[10px] text-white/65">
									{bet.status === "Pending"
										? t(
												bet.settlementNote ??
													"Paid after all matches finish and final results are confirmed.",
											)
										: bet.status === "Lost"
											? t("Final result: no payout.")
											: `${t("Paid to wallet")}: ${formatTnd(bet.payoutMillimes ?? 0)}`}
									{bet.settledAt && (
										<span className="mt-1 block text-white/40">
											{new Date(bet.settledAt).toLocaleString(locale)}
										</span>
									)}
								</p>
								<p className="mt-1 text-[9px] text-white/25">
									{t("Receipt")}: {bet.id}
								</p>
							</article>
						))}
					</div>
				</section>
			)}
			<div className="mt-5 flex gap-2 rounded-xl bg-white/[.035] p-3">
				<ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#c6f36b]" />
				<p className="text-[9px] text-white/40 leading-4">
					{t(
						"Accepted bets are saved to your account. Stakes are deducted securely from your wallet credits.",
					)}
				</p>
			</div>
		</aside>
	);
}
