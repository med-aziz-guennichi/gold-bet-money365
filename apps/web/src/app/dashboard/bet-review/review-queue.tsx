"use client";
import { formatAmount } from "@gold-bet-clean-money365/api/access";
import { settleReturns } from "@gold-bet-clean-money365/api/bet-settlement";
import type { SavedBet } from "@gold-bet-clean-money365/api/betting";
import { LocalizedText, useI18n } from "@gold-bet-clean-money365/i18n";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { ContentLoading } from "@/components/loading-screen";
import { orpc } from "@/utils/orpc";

type Outcome = "won" | "lost" | "void";
const field =
	"w-full rounded-xl border border-white/20 bg-[#151d17] p-3 text-sm text-white";
export default function ReviewQueue() {
	const [page, setPage] = useState(1);
	const { t, locale } = useI18n();
	const queue = useQuery(
		orpc.bets.reviewQueue.queryOptions({
			input: { page },
			queryKey: ["bet-review", page],
			retry: false,
			refetchInterval: 30000,
		}),
	);
	return (
		<main className="min-h-screen bg-[#080b0a] px-4 py-8 text-white">
			<div className="mx-auto max-w-4xl">
				<Brand />
				<Link href="/dashboard" className="mt-6 block text-[#e9bd62]">
					{t("Back to dashboard")}
				</Link>
				<h1 className="mt-4 font-bold text-3xl">{t("Bet review")}</h1>
				<p className="mt-3 text-sm text-white/60">
					{t(
						"Review disputed results and overdue bets. Confirm each selection from reliable results before resolving. Every decision is audited.",
					)}
				</p>
				<p className="mt-4 text-sm text-white/60">
					{t("Last scheduled settlement")}:{" "}
					{queue.data?.lastCompletedAt
						? new Date(queue.data.lastCompletedAt).toLocaleString(locale)
						: t("Not recorded yet")}
				</p>
				{queue.data?.lastErrorAt && (
					<p role="alert" className="mt-2 text-amber-200">
						{t("The last scheduled settlement failed. Check server logs.")}
					</p>
				)}
				{queue.isPending && <ContentLoading kind="table" label="Loading…" />}
				{queue.error && (
					<div role="alert" className="mt-4">
						<p>{t("Could not load the review queue.")}</p>
						<Button onClick={() => void queue.refetch()}>{t("Retry")}</Button>
					</div>
				)}
				{queue.data?.items.length === 0 && (
					<p className="mt-8 rounded-xl border border-white/10 p-6">
						{t("No bets need review.")}
					</p>
				)}
				<div className="mt-6 space-y-5">
					{queue.data?.items.map((bet) => (
						<ReviewReceipt key={bet.id} bet={bet} />
					))}
				</div>
				<nav
					aria-label={t("Review pages")}
					className="mt-6 flex items-center justify-between gap-3"
				>
					<Button
						variant="outline"
						className="h-10 rounded-xl border-white/20 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white disabled:opacity-40 dark:bg-transparent"
						disabled={page === 1 || queue.isFetching}
						onClick={() => setPage((p) => p - 1)}
					>
						{t("Previous")}
					</Button>
					<span>
						{page} · {queue.data?.total ?? 0} {t("bets")}
					</span>
					<Button
						variant="outline"
						className="h-10 rounded-xl border-white/20 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white disabled:opacity-40 dark:bg-transparent"
						disabled={queue.isFetching || page * 20 >= (queue.data?.total ?? 0)}
						onClick={() => setPage((p) => p + 1)}
					>
						{t("Next")}
					</Button>
				</nav>
			</div>
		</main>
	);
}
function ReviewReceipt({ bet }: { bet: SavedBet & { ownerName: string } }) {
	const { t, locale } = useI18n();
	const cache = useQueryClient();
	const [reason, setReason] = useState("");
	const [outcomes, setOutcomes] = useState<Record<number, Outcome | "">>({});
	const [requestId] = useState(() => crypto.randomUUID());
	const [confirmed, setConfirmed] = useState(false);
	const final = bet.picks
		.map((_, index) => outcomes[index] ?? "")
		.filter((o): o is Outcome => o !== "");
	const preview =
		final.length === bet.picks.length
			? settleReturns(bet.stakeMillimes, bet.picks, final)
			: null;
	const mutation = useMutation({
		mutationFn: () =>
			orpc.bets.resolveReview.call({
				betId: bet.id,
				requestId,
				reason,
				outcomes: final,
			}),
		onSuccess: () => cache.invalidateQueries({ queryKey: ["bet-review"] }),
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (preview && confirmed && !mutation.isPending) mutation.mutate();
			}}
			className="min-w-0 rounded-2xl border border-white/10 bg-[#111713] p-4 sm:p-6"
		>
			<p className="break-all font-mono text-white/60 text-xs">
				{t("Receipt")}: {bet.id}
			</p>
			<p className="mt-2 font-semibold text-sm">
				{t("Account")}: {t(bet.ownerName)}
			</p>
			<p className="mt-2 text-sm">
				{t("Stake")}: {formatAmount(bet.stakeMillimes, bet.currency)} ·{" "}
				{new Date(bet.placedAt).toLocaleString(locale)}
			</p>
			<p className="mt-2 text-amber-200 text-sm">
				{t(
					bet.settlementNote ?? "Result or market needs review before payment.",
				)}
			</p>
			<fieldset
				disabled={mutation.isPending || mutation.isSuccess}
				className="mt-4 space-y-4 disabled:opacity-60"
			>
				{bet.picks.map((pick, index) => (
					<label key={pick.matchId} className="block text-sm">
						<span className="mb-2 block">
							{pick.home} — {pick.away}
							<span className="mt-1 block break-words text-white/50 text-xs">
								{pick.market.type} · {pick.market.scope} ·{" "}
								{pick.market.selection} {pick.market.handicap}{" "}
								{pick.market.score} · {pick.odd}
							</span>
						</span>
						<select
							required
							className={field}
							value={outcomes[index] ?? ""}
							onChange={(event) => {
								const value = event.target.value;
								if (
									value === "won" ||
									value === "lost" ||
									value === "void" ||
									value === ""
								) {
									setConfirmed(false);
									setOutcomes((o) => ({ ...o, [index]: value }));
								}
							}}
						>
							<option value="">{t("Choose verified outcome")}</option>
							<option value="won">{t("Won")}</option>
							<option value="lost">{t("Lost")}</option>
							<option value="void">{t("Void / refund selection")}</option>
						</select>
					</label>
				))}
				<label className="block text-sm">
					{t("Review reason and result source")}
					<textarea
						required
						minLength={10}
						maxLength={500}
						value={reason}
						onChange={(event) => {
							setReason(event.target.value);
							setConfirmed(false);
						}}
						className={`${field} mt-2`}
					/>
				</label>
				{preview && (
					<p role="status" className="rounded-xl bg-white/5 p-3 font-semibold">
						{t(preview.status)} · {t("Credits returned")}:{" "}
						{formatAmount(preview.payoutMillimes, bet.currency)}
					</p>
				)}
				<label className="flex items-start gap-3 text-sm">
					<input
						type="checkbox"
						required
						checked={confirmed}
						onChange={(event) => setConfirmed(event.target.checked)}
						className="mt-1 size-4 shrink-0 accent-[#c6f36b]"
					/>
					{t(
						"I verified every selection and the calculated return. This decision is final.",
					)}
				</label>
				<Button
					type="submit"
					disabled={
						!preview ||
						!confirmed ||
						reason.trim().length < 10 ||
						mutation.isPending
					}
					className="h-11 w-full rounded-xl border border-[#c6f36b] bg-[#c6f36b] px-4 font-bold text-[#11160b] hover:bg-[#d8ff9d] disabled:opacity-50 dark:bg-[#c6f36b] dark:text-[#11160b]"
				>
					{t(mutation.isPending ? "Saving…" : "Resolve bet")}
				</Button>
			</fieldset>
			{mutation.error && (
				<p role="alert" className="mt-3 text-red-300">
					{t(mutation.error.message)}
				</p>
			)}
			{mutation.isSuccess && (
				<p role="status" className="mt-3 text-[#c6f36b]">
					<LocalizedText text="Bet resolved and credits updated." />
				</p>
			)}
		</form>
	);
}
