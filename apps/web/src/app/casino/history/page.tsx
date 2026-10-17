"use client";
import { formatTnd } from "@gold-bet-clean-money365/api/access";
import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/sports/page-chrome";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import "../studio.css";
export default function CasinoHistory() {
	const { data: session, isPending } = authClient.useSession();
	const [page, setPage] = useState(1);
	const history = useQuery(
		orpc.casino.history.queryOptions({
			input: { page },
			queryKey: ["casino", session?.user.id, "all-history", page],
			enabled: session?.user.role === "user",
			retry: false,
		}),
	);
	return (
		<div className="studio-page">
			<SiteHeader />
			<main className="studio-shell">
				<div className="studio-breadcrumb">
					<Link href="/casino">← Casino lobby</Link>
				</div>
				<div className="studio-title">
					<div>
						<p>YOUR WALLET ACTIVITY</p>
						<h1>Casino round history</h1>
					</div>
				</div>
				{isPending ? (
					<p>Loading account…</p>
				) : !session ? (
					<p>
						<Link href="/login">Sign in</Link> to see your rounds.
					</p>
				) : session.user.role !== "user" ? (
					<p>Round history is available to user accounts.</p>
				) : (
					<section className="studio-history">
						{history.isPending ? (
							<p>Loading rounds…</p>
						) : history.isError ? (
							<p role="alert">
								History unavailable.{" "}
								<button type="button" onClick={() => history.refetch()}>
									Retry
								</button>
							</p>
						) : !history.data?.items.length ? (
							<p>Your settled rounds will appear here.</p>
						) : (
							history.data.items.map((r) => (
								<details className="history-receipt" key={r.id}>
									<summary>
										<span>
											<b>
												{casinoGames.find((g) => g.id === r.game)?.name ??
													r.game}
											</b>
											<time>{new Date(r.createdAt).toLocaleString()}</time>
										</span>
										<span>Stake {formatTnd(r.stakeMillimes)}</span>
										<strong>Return {formatTnd(r.payoutMillimes)}</strong>
										<small>{r.status}</small>
									</summary>
									<p>
										{r.outcome.detail} · Selection {r.choice}{" "}
										{r.numbers.join(", ")}
									</p>
									<p>
										Round {r.id} · Rules {r.version}
									</p>
								</details>
							))
						)}
						<div className="history-pagination">
							<button
								type="button"
								disabled={page <= 1 || history.isFetching}
								onClick={() => setPage((p) => p - 1)}
							>
								Previous
							</button>
							<span>
								Page {page} · {history.data?.total ?? 0} rounds
							</span>
							<button
								type="button"
								disabled={
									page * 20 >= (history.data?.total ?? 0) || history.isFetching
								}
								onClick={() => setPage((p) => p + 1)}
							>
								Next
							</button>
						</div>
					</section>
				)}
			</main>
		</div>
	);
}
