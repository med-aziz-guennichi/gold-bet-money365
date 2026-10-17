"use client";
import { formatTnd } from "@gold-bet-clean-money365/api/access";
import { CASINO_VERSION } from "@gold-bet-clean-money365/api/casino-catalog";
import type { GameId } from "@gold-bet-clean-money365/casino-core";
import Link from "next/link";
import { SiteHeader } from "@/components/sports/page-chrome";
import { tables } from "./tables";
import { useGameRoom } from "./use-game-room";
import "./studio.css";
export default function GameHost({ gameId }: { gameId: GameId }) {
	const {
		game,
		canUseWallet,
		mode,
		switchMode,
		sound,
		setSound,
		busy,
		pending,
		phase,
		props,
		outcome,
		lastNet,
		demoBalance,
		wallet,
		stake,
		setStake,
		error,
		send,
		recoverSaved,
		recent,
		setDemoBalance,
	} = useGameRoom(gameId);
	const Table = tables[gameId];

	return (
		<div className={`studio-page theme-${gameId}`}>
			<SiteHeader />
			<main className="studio-shell">
				<div className="studio-breadcrumb">
					<Link href="/casino">← Casino lobby</Link>
					<span>FIELDHOUSE ORIGINAL / {game.name}</span>
					<button
						type="button"
						onClick={() => setSound((s) => !s)}
						aria-pressed={sound}
					>
						{sound ? "Sound on" : "Sound off"}
					</button>
				</div>
				<div className="studio-title">
					<div>
						<p>{game.category.toUpperCase()} COLLECTION</p>
						<h1>{game.name}</h1>
					</div>
					<div className="studio-mode">
						<button
							type="button"
							className={mode === "practice" ? "selected" : ""}
							disabled={busy || !!pending || phase === "active"}
							onClick={() => switchMode("practice")}
						>
							Practice
						</button>
						<button
							type="button"
							className={mode === "wallet" ? "selected" : ""}
							disabled={
								!canUseWallet || busy || !!pending || phase === "active"
							}
							onClick={() => switchMode("wallet")}
						>
							Wallet credits
						</button>
					</div>
				</div>
				<div className="studio-layout">
					<section
						className={`game-stage stage-${gameId} ${phase === "playing" ? "is-playing" : ""}`}
						aria-label={game.name}
					>
						<Table {...props} />
						<div className="stage-result" aria-live="polite">
							{outcome ? (
								<>
									<strong>{outcome.detail}</strong>
									<span>
										{outcome.multiplierHundredths / 100}× return · Net{" "}
										{formatTnd(lastNet ?? 0)}
									</span>
								</>
							) : phase === "active" ? (
								<>
									<strong>Your round is active</strong>
									<span>
										{mode === "wallet"
											? "Stake saved. Your decisions are validated by the server."
											: "Practice round · no wallet credits used"}
									</span>
								</>
							) : (
								<>
									<strong>
										{phase === "playing"
											? "Round in progress…"
											: "The table is yours."}
									</strong>
									<span>
										{mode === "practice"
											? "Practice uses separate demo credits."
											: "Wallet credits are used when you start a round."}
									</span>
								</>
							)}
						</div>
					</section>
					<aside className="studio-panel">
						<span className="panel-overline">
							{mode === "practice" ? "PRACTICE BALANCE" : "AVAILABLE WALLET"}
						</span>
						<strong className="studio-balance">
							{mode === "practice"
								? formatTnd(demoBalance)
								: wallet.data
									? formatTnd(wallet.data.balanceMillimes)
									: "Loading…"}
						</strong>
						<label htmlFor="studio-stake">Stake · TND</label>
						<input
							id="studio-stake"
							inputMode="decimal"
							autoComplete="off"
							value={stake}
							disabled={busy || !!pending || phase === "active"}
							onChange={(e) => setStake(e.target.value)}
							maxLength={12}
						/>
						<div className="studio-chips">
							{[1, 5, 10, 25].map((n) => (
								<button
									key={n}
									type="button"
									disabled={busy || !!pending || phase === "active"}
									onClick={() => setStake(n.toFixed(3))}
								>
									<span>{n}</span>
								</button>
							))}
						</div>
						<small>Min 0.100 · Max 100.000 TND</small>
						{error && (
							<p className="studio-error" role="alert">
								{error}
							</p>
						)}
						{pending && !busy && (
							<div className="pending-recovery">
								<strong>Saved request needs checking</strong>
								<button type="button" onClick={() => void send(pending)}>
									Retry identical request
								</button>
								<button type="button" onClick={() => void recoverSaved()}>
									Check saved round
								</button>
							</div>
						)}
						{!canUseWallet && (
							<p className="studio-notice">
								Practice is open to everyone. <Link href="/login">Sign in</Link>{" "}
								with a user account to use wallet credits.
							</p>
						)}
						<details className="studio-rules">
							<summary>Game rules & returns</summary>
							<p>{game.rules}</p>
							<p>{game.rtp}</p>
							<small>
								Rules {CASINO_VERSION} · Returns include stake and round down to
								whole millimes.
							</small>
						</details>
						{mode === "practice" && (
							<button
								className="reset-practice"
								type="button"
								disabled={busy || phase === "active"}
								onClick={() => setDemoBalance(1000000)}
							>
								Reset demo balance
							</button>
						)}
					</aside>
				</div>
				<section className="studio-history">
					<h2>
						{mode === "practice"
							? "Your practice session"
							: "Recent wallet rounds"}
					</h2>
					{mode === "practice" ? (
						<p>
							Practice rounds use no real wallet credits and are not stored in
							your account.
						</p>
					) : recent.isError ? (
						<p role="alert">
							Could not load rounds.{" "}
							<button type="button" onClick={() => recent.refetch()}>
								Retry
							</button>
						</p>
					) : recent.data?.items.length ? (
						<div>
							{recent.data.items.slice(0, 8).map((r) => (
								<article key={r.id}>
									<time>{new Date(r.createdAt).toLocaleString()}</time>
									<span>{r.outcome.detail}</span>
									<span>Stake {formatTnd(r.stakeMillimes)}</span>
									<strong className={r.status === "won" ? "positive" : ""}>
										Return {formatTnd(r.payoutMillimes)}
									</strong>
								</article>
							))}
						</div>
					) : (
						<p>Your completed rounds will appear here.</p>
					)}
					<Link href="/casino/history">Your complete round history →</Link>
				</section>
				<footer className="studio-footer">
					Play at your pace. Set a budget and take breaks. Each round is
					independent.
				</footer>
			</main>
		</div>
	);
}
