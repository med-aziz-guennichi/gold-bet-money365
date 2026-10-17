"use client";

import { formatTnd, parseTnd } from "@gold-bet-clean-money365/api/access";
import {
	CASINO_VERSION,
	type CasinoGameId,
	type CasinoInput,
	type CasinoRound,
	casinoGames,
} from "@gold-bet-clean-money365/api/casino-catalog";
import { casinoInputSchema } from "@gold-bet-clean-money365/api/casino-input";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/sports/page-chrome";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import "./casino.css";
import { GameBoard } from "./game-board";

const colors = [
	"#b9df76",
	"#e9c58c",
	"#e49b84",
	"#9ebde3",
	"#ddb3e4",
	"#9ddcc5",
	"#d2abf1",
	"#e8c875",
	"#b8d1e6",
	"#a9d4a0",
];
const pendingKey = (id: string) => `fieldhouse.casino.pending.${id}`;

export default function Casino() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const userId = session?.user.id;
	const canPlay = session?.user.role === "user";
	const cache = useQueryClient();
	const [selected, setSelected] = useState<CasinoGameId>("roulette");
	const [choice, setChoice] = useState("red");
	const [numbers, setNumbers] = useState<number[]>([]);
	const [stake, setStake] = useState("1.000");
	const [result, setResult] = useState<CasinoRound | null>(null);
	const [pending, setPending] = useState<CasinoInput | null>(null);
	const [busy, setBusy] = useState(false);
	const lock = useRef(false);
	const [error, setError] = useState("");
	const [page, setPage] = useState(1);
	const [historyGame, setHistoryGame] = useState<CasinoGameId | undefined>();
	const game = casinoGames.find((g) => g.id === selected)!;
	const wallet = useQuery(
		orpc.accounts.wallet.queryOptions({
			queryKey: ["management", userId, "wallet"],
			enabled: !!canPlay,
			retry: false,
			staleTime: 10_000,
		}),
	);
	const history = useQuery(
		orpc.casino.history.queryOptions({
			input: { page, game: historyGame },
			queryKey: ["casino", userId, "history", page, historyGame],
			enabled: !!canPlay,
			retry: false,
			staleTime: 10_000,
		}),
	);

	useEffect(() => {
		setResult(null);
		setPending(null);
		setError("");
		if (!userId) return;
		try {
			const saved = sessionStorage.getItem(pendingKey(userId));
			if (saved) {
				const input = casinoInputSchema.parse(JSON.parse(saved));
				setPending(input);
				setSelected(input.game);
				setChoice(input.choice);
				setNumbers(input.numbers);
				setStake(input.stake);
			}
		} catch {
			setError(
				"Saved round could not be read. Check your history before playing.",
			);
		}
	}, [userId]);

	function chooseGame(id: CasinoGameId) {
		if (busy || pending) return;
		const next = casinoGames.find((g) => g.id === id)!;
		setSelected(id);
		setChoice(next.choices[0]);
		setNumbers([]);
		setResult(null);
		setError("");
	}
	async function submit(retry?: CasinoInput) {
		if (!userId || !canPlay || lock.current) return;
		setError("");
		let input = retry;
		if (!input) {
			try {
				const value = parseTnd(stake);
				if (value < 100 || value > 100000) throw new Error();
				if (wallet.data && value > wallet.data.balanceMillimes) {
					setError("Your credits are too low for this stake.");
					return;
				}
			} catch {
				setError("Enter a stake from 0.100 to 100.000 TND.");
				return;
			}
			if (selected === "keno" && numbers.length !== 3) {
				setError("Choose exactly three numbers.");
				return;
			}
			input = {
				requestId: crypto.randomUUID(),
				game: selected,
				version: CASINO_VERSION,
				choice,
				stake,
				numbers:
					selected === "keno" ||
					(selected === "roulette" && choice === "number")
						? numbers
						: [],
			};
			if (
				selected === "roulette" &&
				choice === "number" &&
				numbers.length !== 1
			) {
				setError("Choose a roulette number.");
				return;
			}
		}
		lock.current = true;
		setBusy(true);
		setPending(input);
		setResult(null);
		try {
			// Persist BEFORE sending; a reload can retry the identical idempotent request.
			sessionStorage.setItem(pendingKey(userId), JSON.stringify(input));
			const round = await orpc.casino.play.call(input);
			await new Promise((resolve) => setTimeout(resolve, 900));
			setResult(round);
			setPending(null);
			sessionStorage.removeItem(pendingKey(userId));
			await Promise.all([
				cache.invalidateQueries({ queryKey: ["casino", userId] }),
				cache.invalidateQueries({ queryKey: ["management", userId, "wallet"] }),
			]);
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "Connection interrupted. Recover this round before starting another.",
			);
		} finally {
			setBusy(false);
			lock.current = false;
		}
	}
	async function recover() {
		if (!pending || lock.current) return;
		lock.current = true;
		setBusy(true);
		setError("");
		try {
			const round = await orpc.casino.recover.call({
				requestId: pending.requestId,
			});
			if (round) setResult(round);
			setPending(null);
			if (userId) sessionStorage.removeItem(pendingKey(userId));
			await cache.invalidateQueries({ queryKey: ["casino", userId] });
			await cache.invalidateQueries({
				queryKey: ["management", userId, "wallet"],
			});
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "Could not check this round. Please retry.",
			);
		} finally {
			setBusy(false);
			lock.current = false;
		}
	}

	return (
		<div className="casino-page min-h-screen bg-[#080b0a] text-white">
			<SiteHeader />
			<main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
				<section className="casino-hero">
					<div>
						<p className="casino-eyebrow">FIELDHOUSE / CASINO</p>
						<h1>Find your table.</h1>
						<p>Ten games. Clear rules. Every round in your history.</p>
						<span className="casino-tag">
							Animated games · instant settlement
						</span>
					</div>
					<div className="casino-hero-art" aria-hidden="true">
						<span>♠</span>
						<span>♦</span>
						<span>♣</span>
					</div>
				</section>
				<div className="casino-topline">
					<span>
						THE COLLECTION <b>10 games</b>
					</span>
					{canPlay && (
						<span>
							Your credits{" "}
							<strong>
								{wallet.data
									? formatTnd(wallet.data.balanceMillimes)
									: "Loading…"}
							</strong>
						</span>
					)}
				</div>
				<div className="casino-collection">
					{casinoGames.map((g, i) => (
						<button
							type="button"
							key={g.id}
							disabled={busy || !!pending}
							onClick={() => chooseGame(g.id)}
							className={`casino-tile ${selected === g.id ? "selected" : ""}`}
							style={{ "--game-color": colors[i] } as React.CSSProperties}
							aria-pressed={selected === g.id}
						>
							<span className="casino-tile-icon" aria-hidden="true">
								{g.icon}
							</span>
							<small>{g.category}</small>
							<strong>{g.name}</strong>
						</button>
					))}
				</div>
				<section className="casino-table-layout" aria-label={game.name}>
					<div className="casino-table">
						<div className="casino-table-title">
							<div>
								<p className="casino-eyebrow">
									{game.category} / TABLE{" "}
									{String(casinoGames.indexOf(game) + 1).padStart(2, "0")}
								</p>
								<h2>{game.name}</h2>
							</div>
							<span className="casino-tag">RNG game</span>
						</div>
						<GameBoard
							game={selected}
							busy={busy}
							result={result}
							numbers={numbers}
							choose={(n) => {
								if (busy || pending) return;
								setNumbers((old) =>
									selected === "keno"
										? old.includes(n)
											? old.filter((x) => x !== n)
											: old.length < 3
												? [...old, n]
												: old
										: [n],
								);
							}}
							numberChoice={choice === "number"}
						/>
						<div
							className="casino-result"
							aria-live="polite"
							aria-atomic="true"
						>
							{busy ? (
								<>
									<strong>Playing your round…</strong>
									<span>Saving the result and wallet together.</span>
								</>
							) : result ? (
								<>
									<strong
										className={
											result.payoutMillimes > result.stakeMillimes
												? "positive"
												: ""
										}
									>
										{result.status === "won"
											? "You won"
											: result.status === "push"
												? "Stake returned"
												: result.payoutMillimes > 0
													? "Partial return"
													: "No win this round"}{" "}
										· {formatTnd(result.payoutMillimes)}
									</strong>
									<span>
										{result.outcome.detail} · Net{" "}
										{formatTnd(result.payoutMillimes - result.stakeMillimes)}
									</span>
								</>
							) : (
								<>
									<strong>
										{selected === "keno"
											? "Choose 3 numbers to begin"
											: "Your next round starts here"}
									</strong>
									<span>
										All displayed payouts include your original stake.
									</span>
								</>
							)}
						</div>
					</div>
					<aside className="casino-controls">
						<h3>Make your play</h3>
						<fieldset disabled={busy || !!pending} className="casino-fieldset">
							<legend className="sr-only">Round settings</legend>
							{game.choices.length > 1 && (
								<div className="casino-choices">
									{game.choices.map((c) => (
										<button
											type="button"
											key={c}
											aria-pressed={choice === c}
											className={choice === c ? "active" : ""}
											onClick={() => {
												setChoice(c);
												setNumbers([]);
												setResult(null);
											}}
										>
											{c}
										</button>
									))}
								</div>
							)}
							<label className="casino-label" htmlFor="casino-stake">
								Stake (TND)
							</label>
							<input
								id="casino-stake"
								inputMode="decimal"
								value={stake}
								onChange={(e) => setStake(e.target.value)}
								maxLength={12}
								autoComplete="off"
								className="casino-input"
							/>
							<p className="casino-help">0.100–100.000 TND per round</p>
							<div className="casino-quick">
								{[1, 5, 10, 25].map((n) => (
									<button
										type="button"
										key={n}
										onClick={() => setStake(n.toFixed(3))}
									>
										{n} TND
									</button>
								))}
							</div>
						</fieldset>
						{error && (
							<p role="alert" className="casino-error">
								{error}
							</p>
						)}
						{pending && !busy ? (
							<div className="casino-recovery">
								<p>A round needs checking before you play again.</p>
								<Button onClick={() => submit(pending)}>
									Retry saved round
								</Button>
								<Button variant="outline" onClick={recover}>
									Check saved result
								</Button>
							</div>
						) : (
							<Button
								className="casino-play"
								disabled={!canPlay || busy || !!pending || sessionLoading}
								onClick={() => submit()}
							>
								{busy ? "Playing…" : game.action}
							</Button>
						)}
						{!session && !sessionLoading && (
							<p className="casino-help">
								<Link href="/login">Sign in</Link> with your user account to
								play.
							</p>
						)}
						{session && !canPlay && (
							<p className="casino-help">
								You can explore every table. Playing is available to user
								accounts.
							</p>
						)}
						<details open className="casino-rules">
							<summary>Rules & payouts</summary>
							<p>{game.rules}</p>
							<p>
								<b>Theoretical return: {game.rtp}</b>
							</p>
							<p>
								Returns round down to the nearest millime. Each round is
								independent. The animation reveals a server-generated result.
							</p>
							<small>Rules version {CASINO_VERSION}</small>
						</details>
					</aside>
				</section>
				{canPlay && (
					<section className="casino-history">
						<div className="casino-topline">
							<h2>Your rounds</h2>
							<label>
								Game{" "}
								<select
									value={historyGame ?? ""}
									onChange={(e) => {
										setHistoryGame(
											(e.target.value || undefined) as CasinoGameId | undefined,
										);
										setPage(1);
									}}
									className="casino-input"
								>
									<option value="">All games</option>
									{casinoGames.map((g) => (
										<option value={g.id} key={g.id}>
											{g.name}
										</option>
									))}
								</select>
							</label>
						</div>
						{history.isPending ? (
							<p>Loading rounds…</p>
						) : history.isError ? (
							<p role="alert">
								Could not load your history.{" "}
								<button type="button" onClick={() => history.refetch()}>
									Retry
								</button>
							</p>
						) : !history.data?.items.length ? (
							<p>Your settled rounds will appear here.</p>
						) : (
							<div className="casino-history-list">
								{history.data.items.map((r) => (
									<details key={r.id} className="casino-history-row">
										<summary>
											<span>
												<b>{casinoGames.find((g) => g.id === r.game)?.name}</b>
												<small>{new Date(r.createdAt).toLocaleString()}</small>
											</span>
											<span>
												Stake <b>{formatTnd(r.stakeMillimes)}</b>
											</span>
											<span>
												Return{" "}
												<b className={r.status === "won" ? "positive" : ""}>
													{formatTnd(r.payoutMillimes)}
												</b>
											</span>
											<span className="casino-tag">{r.status}</span>
										</summary>
										<p>
											{r.outcome.detail} · Selection: {r.choice}{" "}
											{r.numbers.join(", ")}
										</p>
										<p>
											Round: <span className="casino-round-id">{r.id}</span> ·
											Rules {r.version}
										</p>
									</details>
								))}
							</div>
						)}
						<div className="casino-pagination">
							<Button
								variant="outline"
								disabled={page === 1 || history.isFetching}
								onClick={() => setPage((p) => p - 1)}
							>
								Previous
							</Button>
							<span>
								Page {page} · {history.data?.total ?? 0} rounds
							</span>
							<Button
								variant="outline"
								disabled={
									history.isFetching || page * 20 >= (history.data?.total ?? 0)
								}
								onClick={() => setPage((p) => p + 1)}
							>
								Next
							</Button>
						</div>
					</section>
				)}
				<footer className="casino-footer">
					Play at your pace. No autoplay. Set a budget and take breaks.
					<br />
					These are animated RNG games; no human dealer livestream.
				</footer>
			</main>
		</div>
	);
}
