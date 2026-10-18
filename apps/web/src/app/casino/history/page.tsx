"use client";

import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ContentLoading } from "@/components/loading-screen";
import { SiteHeader } from "@/components/sports/page-chrome";
import { authClient } from "@/lib/auth-client";
import { formatPlayCredits as formatCredits } from "@/lib/play-credits";
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
					<Link href="/casino">
						<LocalizedText text="← Casino lobby" />
					</Link>
				</div>
				<div className="studio-title">
					<div>
						<p>
							<LocalizedText text="YOUR WALLET ACTIVITY" />
						</p>
						<h1>
							<LocalizedText text="Casino round history" />
						</h1>
					</div>
				</div>
				{isPending ? (
					<ContentLoading label="Loading account…" />
				) : !session ? (
					<p>
						<Link href="/login">
							<LocalizedText text="Sign in" />
						</Link>{" "}
						<LocalizedText text="to see your rounds." />{" "}
					</p>
				) : session.user.role !== "user" ? (
					<p>
						<LocalizedText text="Round history is available to user accounts." />
					</p>
				) : (
					<section className="studio-history">
						{history.isPending ? (
							<ContentLoading label="Loading rounds…" />
						) : history.isError ? (
							<p role="alert">
								{" "}
								<LocalizedText text="History unavailable." />{" "}
								<button type="button" onClick={() => history.refetch()}>
									{" "}
									<LocalizedText text="Retry" />{" "}
								</button>
							</p>
						) : !history.data?.items.length ? (
							<p>
								<LocalizedText text="Your settled rounds will appear here." />
							</p>
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
										<span>
											<LocalizedText text="Stake" />{" "}
											{formatCredits(r.stakeMillimes, r.currency ?? "TND")}
										</span>
										<strong>
											<LocalizedText text="Return" />{" "}
											{formatCredits(r.payoutMillimes, r.currency ?? "TND")}
										</strong>
										<small>{r.status}</small>
									</summary>
									<p>
										{r.outcome.detail} <LocalizedText text="· Selection" />{" "}
										{r.choice} {r.numbers.join(", ")}
									</p>
									<p>
										{" "}
										<LocalizedText text="Round" /> {r.id}{" "}
										<LocalizedText text="· Rules" /> {r.version}
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
								{" "}
								<LocalizedText text="Previous" />{" "}
							</button>
							<span>
								{" "}
								<LocalizedText text="Page" /> {page} ·{" "}
								{history.data?.total ?? 0} <LocalizedText text="rounds" />{" "}
							</span>
							<button
								type="button"
								disabled={
									page * 20 >= (history.data?.total ?? 0) || history.isFetching
								}
								onClick={() => setPage((p) => p + 1)}
							>
								{" "}
								<LocalizedText text="Next" />{" "}
							</button>
						</div>
					</section>
				)}
			</main>
		</div>
	);
}
