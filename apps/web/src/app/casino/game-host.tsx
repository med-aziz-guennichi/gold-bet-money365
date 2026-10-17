"use client";

import { formatTnd } from "@gold-bet-clean-money365/api/access";
import { CASINO_VERSION } from "@gold-bet-clean-money365/api/casino-catalog";
import type { GameId } from "@gold-bet-clean-money365/casino-core";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
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
					<Link href="/casino">
						<LocalizedText text="← Casino lobby" />
					</Link>
					<span>
						GOLDBET365 ORIGINAL / <LocalizedText text={game.name} />
					</span>
					<button
						type="button"
						onClick={() => setSound((s) => !s)}
						aria-pressed={sound}
					>
						<LocalizedText text={sound ? "Sound on" : "Sound off"} />
					</button>
				</div>
				<div className="studio-title">
					<div>
						<p>
							<LocalizedText text={game.category} />{" "}
							<LocalizedText text="COLLECTION" />
						</p>
						<h1>
							<LocalizedText text={game.name} />
						</h1>
					</div>
					<div className="studio-mode">
						<button
							type="button"
							className={mode === "practice" ? "selected" : ""}
							disabled={busy || !!pending || phase === "active"}
							onClick={() => switchMode("practice")}
						>
							{" "}
							<LocalizedText text="Practice" />{" "}
						</button>
						<button
							type="button"
							className={mode === "wallet" ? "selected" : ""}
							disabled={
								!canUseWallet || busy || !!pending || phase === "active"
							}
							onClick={() => switchMode("wallet")}
						>
							{" "}
							<LocalizedText text="Wallet credits" />{" "}
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
									<strong>
										<LocalizedText text={outcome.detail} />
									</strong>
									<span>
										{outcome.multiplierHundredths / 100}
										<LocalizedText text="× return · Net" />{" "}
										{formatTnd(lastNet ?? 0)}
									</span>
								</>
							) : phase === "active" ? (
								<>
									<strong>
										<LocalizedText text="Your round is active" />
									</strong>
									<span>
										<LocalizedText
											text={
												mode === "wallet"
													? "Stake saved. Your decisions are validated by the server."
													: "Practice round · no wallet credits used"
											}
										/>
									</span>
								</>
							) : (
								<>
									<strong>
										<LocalizedText
											text={
												phase === "playing"
													? "Round in progress…"
													: "The table is yours."
											}
										/>
									</strong>
									<span>
										<LocalizedText
											text={
												mode === "practice"
													? "Practice uses separate demo credits."
													: "Wallet credits are used when you start a round."
											}
										/>
									</span>
								</>
							)}
						</div>
					</section>
					<aside className="studio-panel">
						<span className="panel-overline">
							<LocalizedText
								text={
									mode === "practice" ? "PRACTICE BALANCE" : "AVAILABLE WALLET"
								}
							/>
						</span>
						<strong className="studio-balance">
							{mode === "practice"
								? formatTnd(demoBalance)
								: wallet.data
									? formatTnd(wallet.data.balanceMillimes)
									: "Loading…"}
						</strong>
						<label htmlFor="studio-stake">
							<LocalizedText text="Stake · TND" />
						</label>
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
						<small>
							<LocalizedText text="Min 0.100 · Max 100.000 TND" />
						</small>
						{error && (
							<p className="studio-error" role="alert">
								<LocalizedText text={error} />
							</p>
						)}
						{pending && !busy && (
							<div className="pending-recovery">
								<strong>
									<LocalizedText text="Saved request needs checking" />
								</strong>
								<button type="button" onClick={() => void send(pending)}>
									{" "}
									<LocalizedText text="Retry identical request" />{" "}
								</button>
								<button type="button" onClick={() => void recoverSaved()}>
									{" "}
									<LocalizedText text="Check saved round" />{" "}
								</button>
							</div>
						)}
						{!canUseWallet && (
							<p className="studio-notice">
								{" "}
								<LocalizedText text="Practice is open to everyone." />{" "}
								<Link href="/login">
									<LocalizedText text="Sign in" />
								</Link>{" "}
								<LocalizedText text="with a user account to use wallet credits." />{" "}
							</p>
						)}
						<details className="studio-rules">
							<summary>
								<LocalizedText text="Game rules & returns" />
							</summary>
							<p>
								<LocalizedText text={game.rules} />
							</p>
							<p>
								<LocalizedText text={game.rtp} />
							</p>
							<small>
								{" "}
								<LocalizedText text="Rules" /> {CASINO_VERSION}{" "}
								<LocalizedText text="· Returns include stake and round down to whole millimes." />{" "}
							</small>
						</details>
						{mode === "practice" && (
							<button
								className="reset-practice"
								type="button"
								disabled={busy || phase === "active"}
								onClick={() => setDemoBalance(1000000)}
							>
								{" "}
								<LocalizedText text="Reset demo balance" />{" "}
							</button>
						)}
					</aside>
				</div>
				<section className="studio-history">
					<h2>
						<LocalizedText
							text={
								mode === "practice"
									? "Your practice session"
									: "Recent wallet rounds"
							}
						/>
					</h2>
					{mode === "practice" ? (
						<p>
							{" "}
							<LocalizedText text="Practice rounds use no real wallet credits and are not stored in your account." />{" "}
						</p>
					) : recent.isError ? (
						<p role="alert">
							{" "}
							<LocalizedText text="Could not load rounds." />{" "}
							<button type="button" onClick={() => recent.refetch()}>
								{" "}
								<LocalizedText text="Retry" />{" "}
							</button>
						</p>
					) : recent.data?.items.length ? (
						<div>
							{recent.data.items.slice(0, 8).map((r) => (
								<article key={r.id}>
									<time>{new Date(r.createdAt).toLocaleString()}</time>
									<span>{r.outcome.detail}</span>
									<span>
										<LocalizedText text="Stake" /> {formatTnd(r.stakeMillimes)}
									</span>
									<strong className={r.status === "won" ? "positive" : ""}>
										{" "}
										<LocalizedText text="Return" />{" "}
										{formatTnd(r.payoutMillimes)}
									</strong>
								</article>
							))}
						</div>
					) : (
						<p>
							<LocalizedText text="Your completed rounds will appear here." />
						</p>
					)}
					<Link href="/casino/history">
						<LocalizedText text="Your complete round history →" />
					</Link>
				</section>
				<footer className="studio-footer">
					{" "}
					<LocalizedText text="Play at your pace. Set a budget and take breaks. Each round is independent." />{" "}
				</footer>
			</main>
		</div>
	);
}
