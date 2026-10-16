"use client";

import { formatTnd } from "@gold-bet-clean-money365/api/access";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "@/utils/orpc";

export function WalletPanel({
	actorId,
	accountId,
	accountName,
}: {
	actorId: string;
	accountId?: string;
	accountName?: string;
}) {
	const [historyOpen, setHistoryOpen] = useState(false);
	const [page, setPage] = useState(1);
	const wallet = useQuery(
		orpc.accounts.wallet.queryOptions({
			queryKey: ["management", actorId, "wallet"],
			retry: false,
		}),
	);
	const input = { accountId, page, limit: 10 };
	const history = useQuery(
		orpc.accounts.walletHistory.queryOptions({
			input,
			queryKey: ["management", actorId, "wallet-history", input],
			enabled: historyOpen,
			retry: false,
		}),
	);
	return (
		<section className="mt-6 rounded-2xl border border-[#c6f36b]/20 bg-[#111713] p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-white/45 text-xs uppercase tracking-wider">
						{wallet.data?.canAllocate
							? "Admin funding"
							: "Your available wallet"}
					</p>
					<p className="mt-2 font-bold text-[#c6f36b] text-xl">
						{wallet.data
							? wallet.data.canAllocate
								? "Allocate TND to fournisseurs"
								: formatTnd(wallet.data.balanceMillimes)
							: "Loading wallet…"}
					</p>
				</div>
				<button
					type="button"
					className="rounded-lg border border-white/15 px-4 py-2 text-sm"
					onClick={() => setHistoryOpen((value) => !value)}
					aria-expanded={historyOpen}
				>
					{historyOpen
						? "Hide history"
						: `View ${accountName ? `${accountName}'s` : "wallet"} history`}
				</button>
			</div>
			{wallet.data?.canAllocate && !wallet.data.transfersEnabled && (
				<p role="status" className="mt-4 text-amber-200 text-sm">
					Wallet transfers need a one-time local database setup. Run
					scripts/enable-wallet-transactions.ps1 in PowerShell as Administrator.
					Existing accounts and data are preserved.
				</p>
			)}
			{wallet.error && (
				<p role="alert" className="mt-3 text-red-300 text-sm">
					{wallet.error.message}
				</p>
			)}
			{historyOpen && (
				<div className="mt-5 overflow-x-auto">
					<p className="mb-3 text-sm text-white/50">
						{accountName
							? `Transfers for ${accountName}`
							: wallet.data?.canAllocate
								? "All network transfers"
								: "Transfers into and out of your wallet"}
					</p>
					{history.error && (
						<p role="alert" className="text-red-300 text-sm">
							{history.error.message}
						</p>
					)}
					<table className="w-full text-left text-sm">
						<thead className="border-white/10 border-b text-white/40 text-xs">
							<tr>
								{["Date", "From", "To", "Amount"].map((label) => (
									<th key={label} className="py-3 pe-4 font-medium">
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{history.data?.items.map((item) => (
								<tr key={item.id} className="border-white/5 border-b">
									<td className="whitespace-nowrap py-3 pe-4 text-white/50">
										{new Date(item.createdAt).toLocaleString()}
									</td>
									<td className="py-3 pe-4">{item.sourceName}</td>
									<td className="py-3 pe-4">{item.targetName}</td>
									<td className="whitespace-nowrap py-3 text-[#c6f36b]">
										{formatTnd(item.amountMillimes)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{history.isPending ? (
						<p className="py-4 text-sm text-white/50">Loading transactions…</p>
					) : (
						!history.data?.items.length && (
							<p className="py-4 text-sm text-white/50">No transactions yet.</p>
						)
					)}
					<div className="mt-3 flex items-center justify-between text-xs">
						<button
							type="button"
							disabled={page <= 1 || history.isFetching}
							onClick={() => setPage((value) => value - 1)}
							className="disabled:opacity-30"
						>
							Previous
						</button>
						<span>Page {page}</span>
						<button
							type="button"
							disabled={
								page * 10 >= (history.data?.total ?? 0) || history.isFetching
							}
							onClick={() => setPage((value) => value + 1)}
							className="disabled:opacity-30"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</section>
	);
}
