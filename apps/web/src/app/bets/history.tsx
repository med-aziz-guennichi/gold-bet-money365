"use client";

import { formatTnd, parseTnd } from "@gold-bet-clean-money365/api/access";
import type { BetHistoryInput } from "@gold-bet-clean-money365/api/bet-history";
import type { SavedBet } from "@gold-bet-clean-money365/api/betting";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Search,
	SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ContentLoading } from "@/components/loading-screen";
import { SiteHeader } from "@/components/sports/page-chrome";
import { useI18n } from "@/features/i18n/locale-provider";
import { orpc } from "@/utils/orpc";

type Filters = {
	query: string;
	status: string;
	from: string;
	to: string;
	minStake: string;
	maxStake: string;
	type: string;
	sort: string;
	limit: string;
};
const defaults: Filters = {
	query: "",
	status: "",
	from: "",
	to: "",
	minStake: "",
	maxStake: "",
	type: "",
	sort: "newest",
	limit: "20",
};
const control =
	"w-full rounded-xl border border-white/10 bg-[#090e0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c6f36b]/60";
const button =
	"inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40";

export default function BetHistory({ userId }: { userId: string }) {
	const cache = useQueryClient();
	const { t, locale } = useI18n();
	const [draft, setDraft] = useState(defaults);
	const [input, setInput] = useState<BetHistoryInput>({
		page: 1,
		limit: 20,
		sort: "newest",
	});
	const [validation, setValidation] = useState("");
	const history = useQuery(
		orpc.bets.mine.queryOptions({
			input,
			queryKey: ["bets", userId, "history", input],
			retry: false,
			staleTime: 10_000,
			refetchInterval: 30_000,
		}),
	);
	const total = history.data?.total ?? 0;
	const refresh = useMutation({
		mutationFn: () => orpc.bets.refresh.call({}),
		onSuccess: async () => {
			await Promise.all([
				cache.invalidateQueries({ queryKey: ["bets", userId] }),
				cache.invalidateQueries({ queryKey: ["management", userId, "wallet"] }),
			]);
		},
	});
	const pages = Math.max(1, Math.ceil(total / input.limit));
	const summary = history.data?.summary;
	const activeFilters = Boolean(
		input.query ||
			input.status ||
			input.from ||
			input.to ||
			input.minStake !== undefined ||
			input.maxStake !== undefined ||
			input.type,
	);
	function change(field: keyof Filters, value: string) {
		setDraft((current) => ({ ...current, [field]: value }));
	}
	function apply(next: Filters) {
		try {
			if (next.from && next.to && next.from > next.to)
				throw new Error("Start date must be before end date.");
			if (
				next.minStake &&
				next.maxStake &&
				parseTnd(next.minStake) > parseTnd(next.maxStake)
			)
				throw new Error("Minimum stake must not exceed maximum stake.");
			for (const value of [next.minStake, next.maxStake])
				if (value) parseTnd(value);
			setInput({
				page: 1,
				limit: Number(next.limit),
				sort: next.sort as BetHistoryInput["sort"],
				query: next.query.trim() || undefined,
				status: (next.status || undefined) as BetHistoryInput["status"],
				type: (next.type || undefined) as BetHistoryInput["type"],
				minStake: next.minStake || undefined,
				maxStake: next.maxStake || undefined,
				from: next.from
					? new Date(`${next.from}T00:00:00`).toISOString()
					: undefined,
				to: next.to
					? new Date(`${next.to}T23:59:59.999`).toISOString()
					: undefined,
			});
			setValidation("");
		} catch (error) {
			setValidation(
				error instanceof Error ? error.message : "Invalid filters.",
			);
		}
	}
	function reset() {
		setDraft(defaults);
		setInput({ page: 1, limit: 20, sort: "newest" });
		setValidation("");
	}
	return (
		<main className="min-h-screen bg-[#080b0a] text-[#f4f5f2]">
			<SiteHeader />
			<div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"
				>
					<ArrowLeft size={15} />
					{t("Back to matches")}
				</Link>
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-semibold text-[#c6f36b] text-xs uppercase tracking-widest">
							{t("My account")}
						</p>
						<h1 className="mt-2 font-extrabold text-3xl tracking-tight">
							{t("Bet history")}
						</h1>
						<p className="mt-2 text-sm text-white/45">
							{t(
								"Every bet, every result, every payment. Only your bets are shown.",
							)}
						</p>
					</div>
					<button
						type="button"
						disabled={history.isFetching || refresh.isPending}
						onClick={() => refresh.mutate()}
						className={button}
					>
						<RefreshCw
							size={15}
							className={
								history.isFetching || refresh.isPending ? "animate-spin" : ""
							}
						/>
						{t(refresh.isPending ? "Checking results…" : "Refresh results")}
					</button>
				</div>
				{refresh.isError && (
					<p role="alert" className="text-red-300 text-sm">
						{refresh.error.message}
					</p>
				)}
				<section
					aria-label={t("Advanced filters")}
					className="rounded-2xl border border-white/[.08] bg-[#111713] p-5"
				>
					<h2 className="mb-4 flex items-center gap-2 font-bold text-sm">
						<SlidersHorizontal size={16} />
						{t("Advanced filters")}
					</h2>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							apply(draft);
						}}
					>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<label className="space-y-2 text-white/55 text-xs sm:col-span-2">
								<span>{t("Search teams, league or receipt")}</span>
								<div className="relative">
									<Search
										size={16}
										className="pointer-events-none absolute start-3 top-3.5 text-white/35"
									/>
									<input
										className={`${control} ps-9`}
										value={draft.query}
										onChange={(event) => change("query", event.target.value)}
										maxLength={80}
										placeholder={t("Team, league or full receipt ID")}
									/>
								</div>
							</label>
							<label className="space-y-2 text-white/55 text-xs">
								<span>{t("Status")}</span>
								<select
									className={control}
									value={draft.status}
									onChange={(event) => change("status", event.target.value)}
								>
									<option value="">{t("All statuses")}</option>
									{["Pending", "Won", "Lost", "Void"].map((status) => (
										<option key={status} value={status}>
											{t(status)}
										</option>
									))}
								</select>
							</label>
							<label className="space-y-2 text-white/55 text-xs">
								<span>{t("Bet type")}</span>
								<select
									className={control}
									value={draft.type}
									onChange={(event) => change("type", event.target.value)}
								>
									<option value="">{t("All bet types")}</option>
									<option value="single">{t("Single")}</option>
									<option value="multiple">{t("Multiple")}</option>
								</select>
							</label>
							<label className="space-y-2 text-white/55 text-xs">
								<span>{t("Placed from")}</span>
								<input
									type="date"
									className={`${control} [color-scheme:dark]`}
									value={draft.from}
									onChange={(event) => change("from", event.target.value)}
								/>
							</label>
							<label className="space-y-2 text-white/55 text-xs">
								<span>{t("Placed until")}</span>
								<input
									type="date"
									className={`${control} [color-scheme:dark]`}
									value={draft.to}
									onChange={(event) => change("to", event.target.value)}
								/>
							</label>
							{(["minStake", "maxStake"] as const).map((field) => (
								<label key={field} className="space-y-2 text-white/55 text-xs">
									<span>
										{t(
											field === "minStake"
												? "Minimum stake (TND)"
												: "Maximum stake (TND)",
										)}
									</span>
									<input
										type="number"
										min="0"
										step="0.001"
										max="1000000000"
										inputMode="decimal"
										className={control}
										value={draft[field]}
										onChange={(event) => change(field, event.target.value)}
									/>
								</label>
							))}
							<label className="space-y-2 text-white/55 text-xs">
								<span>{t("Sort by")}</span>
								<select
									className={control}
									value={draft.sort}
									onChange={(event) => change("sort", event.target.value)}
								>
									{[
										["newest", "Newest first"],
										["oldest", "Oldest first"],
										["stake", "Highest stake"],
										["payout", "Highest payout"],
									].map(([value, label]) => (
										<option key={value} value={value}>
											{t(label ?? "")}
										</option>
									))}
								</select>
							</label>
							<label className="space-y-2 text-white/55 text-xs">
								<span>{t("Bets per page")}</span>
								<select
									className={control}
									value={draft.limit}
									onChange={(event) => change("limit", event.target.value)}
								>
									{[10, 20, 50].map((limit) => (
										<option key={limit} value={limit}>
											{limit}
										</option>
									))}
								</select>
							</label>
							<div className="flex items-end gap-2 sm:col-span-2">
								<button
									type="submit"
									className={`${button} border-transparent bg-[#c6f36b] text-[#11160b] hover:bg-[#d5ff85]`}
								>
									{t("Apply filters")}
								</button>
								<button type="button" onClick={reset} className={button}>
									{t("Reset")}
								</button>
							</div>
						</div>
						<p className="mt-3 text-white/35 text-xs">
							{t(
								"Dates use your local timezone. Totals cover all matching bets.",
							)}
						</p>
						{validation && (
							<p role="alert" className="mt-3 text-red-300 text-sm">
								{t(validation)}
							</p>
						)}
					</form>
				</section>
				<section
					className="grid grid-cols-2 gap-3 lg:grid-cols-4"
					aria-label={t("Filtered totals")}
				>
					{[
						[
							"Matching bets",
							summary
								? `${summary.total} · ${summary.pending} ${t("Pending")}`
								: "—",
						],
						["Total staked", summary ? formatTnd(summary.stakeMillimes) : "—"],
						["Total paid", summary ? formatTnd(summary.payoutMillimes) : "—"],
						[
							"Settled net return",
							summary
								? formatTnd(
										summary.payoutMillimes - summary.settledStakeMillimes,
									)
								: "—",
						],
					].map(([label, value]) => (
						<div
							key={label}
							className="rounded-xl border border-white/[.07] bg-[#111713] p-4"
						>
							<p className="text-white/45 text-xs">{t(label ?? "")}</p>
							<p className="mt-2 font-bold text-sm tabular-nums sm:text-lg">
								{value}
							</p>
						</div>
					))}
				</section>
				{history.isError && (
					<div
						role="alert"
						className="rounded-xl border border-red-400/20 p-5 text-red-200 text-sm"
					>
						{t("Could not load bet history.")} {history.error.message}
						<button
							type="button"
							className="ms-3 underline"
							onClick={() => void history.refetch()}
						>
							{t("Retry")}
						</button>
					</div>
				)}
				{history.isPending ? (
					<ContentLoading label="Loading bet history…" />
				) : (
					history.data && (
						<>
							<div className="flex flex-wrap justify-between gap-2 text-white/45 text-xs">
								<p>
									{t("Showing")}{" "}
									{total ? (input.page - 1) * input.limit + 1 : 0}–
									{Math.min(input.page * input.limit, total)} {t("of")} {total}
									{activeFilters ? ` · ${t("Filters applied")}` : ""}
								</p>
								<p>{t("Settled net return excludes pending stakes.")}</p>
							</div>
							{!history.data.items.length ? (
								<div className="rounded-2xl border border-white/15 border-dashed px-5 py-14 text-center">
									<h2 className="font-bold">
										{t(
											activeFilters
												? "No bets match these filters."
												: "No bets yet.",
										)}
									</h2>
									<p className="mt-2 text-sm text-white/45">
										{t(
											activeFilters
												? "Try changing your filters or reset to see all bets."
												: "Your accepted bets will appear here.",
										)}
									</p>
									{activeFilters && (
										<button
											type="button"
											onClick={reset}
											className={`${button} mt-5`}
										>
											{t("Reset filters")}
										</button>
									)}
								</div>
							) : (
								<div className="space-y-4">
									{history.data.items.map((bet) => (
										<BetCard key={bet.id} bet={bet} />
									))}
								</div>
							)}
							<nav
								aria-label={t("Bet history pages")}
								className="flex flex-wrap items-center justify-between gap-3 border-white/10 border-t pt-5"
							>
								<button
									type="button"
									disabled={input.page <= 1 || history.isFetching}
									className={button}
									onClick={() =>
										setInput((current) => ({
											...current,
											page: current.page - 1,
										}))
									}
								>
									<ChevronLeft size={16} />
									{t("Previous")}
								</button>
								<span className="text-sm text-white/55">
									{t("Page")} {input.page} / {pages}
								</span>
								<button
									type="button"
									disabled={input.page >= pages || history.isFetching}
									className={button}
									onClick={() =>
										setInput((current) => ({
											...current,
											page: current.page + 1,
										}))
									}
								>
									{t("Next")}
									<ChevronRight size={16} />
								</button>
							</nav>
							<p className="text-white/30 text-xs">
								{t("Last updated")}:{" "}
								{new Date(history.dataUpdatedAt).toLocaleString(locale)}
							</p>
						</>
					)
				)}
			</div>
		</main>
	);
}

function BetCard({ bet }: { bet: SavedBet }) {
	const { t, locale } = useI18n();
	const colors = {
		Pending: "bg-amber-300/10 text-amber-200",
		Won: "bg-[#c6f36b]/10 text-[#c6f36b]",
		Lost: "bg-red-300/10 text-red-300",
		Void: "bg-blue-300/10 text-blue-200",
	};
	return (
		<article className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#111713]">
			<div className="flex flex-wrap items-center justify-between gap-3 border-white/[.06] border-b px-5 py-4">
				<div>
					<p className="font-bold text-sm">
						{t(bet.picks.length === 1 ? "Single" : "Multiple")} ·{" "}
						{bet.picks.length} {t(bet.picks.length === 1 ? "pick" : "picks")}
					</p>
					<p className="mt-1 text-white/40 text-xs">
						{new Date(bet.placedAt).toLocaleString(locale)}
					</p>
				</div>
				<span
					className={`rounded-full px-3 py-1 font-bold text-xs ${colors[bet.status]}`}
				>
					{t(bet.status)}
				</span>
			</div>
			<div className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
				<div className="space-y-4">
					{bet.picks.map((pick) => {
						const result = bet.pickResults?.find(
							(item) => item.matchId === pick.matchId,
						);
						return (
							<div
								key={pick.matchId}
								className="border-[#c6f36b]/20 border-s-2 ps-4"
							>
								<p className="text-white/40 text-xs">{pick.league}</p>
								<p className="mt-1 font-bold text-sm">
									{pick.home}{" "}
									<span className="font-normal text-white/35">{t("vs")}</span>{" "}
									{pick.away}
								</p>
								<p className="mt-1 text-sm text-white/70">
									{pick.market.selection}{" "}
									{pick.market.handicap ?? pick.market.score ?? ""}{" "}
									<span className="ms-2 font-bold text-[#c6f36b]">
										@ {pick.odd}
									</span>
								</p>
								<p className="mt-1 text-white/40 text-xs">
									{new Date(pick.kickoff).toLocaleString(locale)}
								</p>
								{result?.score && (
									<p className="mt-1 font-semibold text-white/70 text-xs">
										{result.score.home} – {result.score.away} ·{" "}
										{t(
											result.status === "RESULTED"
												? "Match finished"
												: result.status === "TRADING_LIVE"
													? "LIVE"
													: "Pending",
										)}
										{result.status === "TRADING_LIVE" &&
										result.latestEventMinute
											? ` · ${t("Latest event")}: ${result.latestEventMinute}′`
											: ""}
									</p>
								)}
							</div>
						);
					})}
				</div>
				<div className="rounded-xl bg-black/20 p-4 text-sm">
					<dl className="space-y-3">
						{[
							["Stake", formatTnd(bet.stakeMillimes)],
							["Total odds", bet.totalOdds.toFixed(2)],
							[
								bet.status === "Pending"
									? "Potential return"
									: "Paid to wallet",
								formatTnd(
									bet.status === "Pending"
										? bet.potentialReturnMillimes
										: (bet.payoutMillimes ?? 0),
								),
							],
						].map(([label, value]) => (
							<div key={label} className="flex justify-between gap-3">
								<dt className="text-white/40">{t(label ?? "")}</dt>
								<dd className="font-bold tabular-nums">{value}</dd>
							</div>
						))}
					</dl>
					<p className="mt-4 text-white/50 text-xs leading-5">
						{t(
							bet.status === "Pending"
								? (bet.settlementNote ??
										"Paid after all matches finish and final results are confirmed.")
								: bet.status === "Lost"
									? "Final result: no payout."
									: "Final results confirmed.",
						)}
					</p>
					{bet.settledAt && (
						<p className="mt-2 text-white/40 text-xs">
							{t("Settled at")}:{" "}
							{new Date(bet.settledAt).toLocaleString(locale)}
						</p>
					)}
				</div>
			</div>
			<details className="border-white/[.06] border-t px-5 py-3 text-xs">
				<summary className="cursor-pointer font-semibold text-white/50">
					{t("Receipt and market details")}
				</summary>
				<p className="mt-3 break-all text-white/40">
					{t("Receipt")}: {bet.id}
				</p>
				<div className="mt-3 space-y-2">
					{bet.picks.map((pick) => (
						<p key={pick.matchId} className="break-words text-white/45">
							{pick.home} / {pick.away} ·{" "}
							{pick.market.type.replaceAll("_", " ")} ·{" "}
							{pick.market.scope.replaceAll("_", " ")} · {pick.market.bookmaker}
						</p>
					))}
				</div>
			</details>
		</article>
	);
}
