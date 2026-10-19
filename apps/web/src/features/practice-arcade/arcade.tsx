"use client";

import { useI18n } from "@gold-bet-clean-money365/i18n";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGameRoom } from "@/app/casino/use-game-room";
import { RoundFeedback } from "@/components/casino/round-feedback";
import { SiteHeader } from "@/components/sports/page-chrome";
import { type ArcadeId, arcadeGames, pockets } from "./games";
import "./arcade.css";
import { CasinoCollection } from "./casino-collection";
import { FlightBoard } from "./flight-board";
import { ProviderGames } from "./provider-games";

const number = (n: number) =>
	n.toLocaleString("en", { maximumFractionDigits: 2 });

export function ArcadeLobby() {
	const { t } = useI18n();
	const [provider, setProvider] = useState("originals");
	return (
		<MotionConfig reducedMotion="user">
			<div className="arcade">
				<SiteHeader />
				<nav
					aria-label={t("Game providers")}
					className="mx-auto flex max-w-[1240px] flex-wrap gap-2 px-6 pt-6"
				>
					{[
						["originals", "Originals"],
						["casino-api-pro", "Casino API Pro"],
						["vfair", "vFair Games"],
					].map(([id, label]) => (
						<button
							key={id}
							type="button"
							aria-pressed={provider === id}
							onClick={() => setProvider(id)}
							className={`min-h-11 rounded-xl border px-4 py-2 font-semibold text-sm transition focus-visible:outline-2 focus-visible:outline-[#e9bd62] ${provider === id ? "border-[#e9bd62] bg-[#e9bd62] text-black" : "border-white/20 text-white hover:bg-white/10"}`}
						>
							{t(label)}
						</button>
					))}
				</nav>
				{provider !== "originals" ? (
					<ProviderGames
						key={provider}
						provider={provider === "vfair" ? "vfair" : "casino-api-pro"}
					/>
				) : (
					<CasinoCollection />
				)}
			</div>
		</MotionConfig>
	);
}

export function ArcadeRoom({ id }: { id: ArcadeId }) {
	const { t } = useI18n();
	const game = arcadeGames.find((g) => g.id === id)!;
	const room = useGameRoom(id, true);
	const {
		mode,
		canUseWallet,
		switchMode,
		props,
		busy,
		pending,
		outcome,
		phase,
		session,
		stake,
		setStake,
		wallet,
		demoBalance,
	} = room;
	const [clock, setClock] = useState(0);
	const offset = useRef(0);
	const [animating, setAnimating] = useState(false);
	const reduced = useReducedMotion();
	useEffect(() => {
		if (session) offset.current = Date.now() - session.serverTime;
	}, [session]);
	useEffect(() => {
		if (id !== "crash" || phase !== "active") return;
		const timer = setInterval(() => setClock(Date.now()), 50);
		return () => clearInterval(timer);
	}, [id, phase]);
	useEffect(() => {
		if (id !== "plinko" || !outcome) return;
		setAnimating(true);
		const timer = setTimeout(() => setAnimating(false), reduced ? 100 : 1800);
		return () => clearTimeout(timer);
	}, [id, outcome, reduced]);
	const balance =
		(mode === "wallet" ? (wallet.data?.balanceMillimes ?? 0) : demoBalance) /
		1000;
	const active = phase === "active";
	const locked = room.authLoading || busy || !!pending || animating;
	const view = props.view;
	const multiplier = outcome
		? outcome.multiplierHundredths / 100
		: id === "crash" && active && view?.startedAt
			? Math.min(
					100,
					Math.max(
						1,
						Math.exp(
							Math.max(
								0,
								(clock || Date.now()) - offset.current - view.startedAt,
							) * 0.00013,
						),
					),
				)
			: (view?.multiplierHundredths ?? 100) / 100;
	const round = {
		active,
		stake: (session?.stakeMillimes ?? Number(stake) * 1000) / 1000,
		multiplier,
		mines: view?.mines ?? [],
		revealed: view?.revealed ?? [],
		path: outcome?.path ?? [],
		serial: outcome ? outcome.path?.join("") + String(room.lastNet) : "ready",
	};
	const history =
		room.recent.data?.items.map((r) => ({
			id: r.id,
			multiplier: r.outcome.multiplierHundredths / 100,
		})) ?? [];
	function start() {
		if (!locked) props.onStart();
	}
	function collect() {
		if (!locked) props.onAction({ type: "cashout" });
	}
	function reveal(index: number) {
		if (!locked) props.onAction({ type: "reveal", index });
	}
	const canCollect =
		active &&
		!locked &&
		id !== "plinko" &&
		(id === "crash" || round.revealed.length > 0);
	return (
		<MotionConfig reducedMotion="user">
			<div className={`arcade room-${id}`}>
				<SiteHeader />
				<main className="arcade-shell">
					<div className="arcade-room-heading">
						<div>
							<Link href="/casino">← All games</Link>
							<h1>{game.name}</h1>
							<p>{game.description}</p>
						</div>
						<span className="arcade-pill">PLAY CREDITS · NO CASH VALUE</span>
					</div>
					<nav className="arcade-tabs" aria-label="Practice games">
						{arcadeGames.map((g) => (
							<Link
								key={g.id}
								aria-current={g.id === id ? "page" : undefined}
								href={{ pathname: `/casino/${g.id}` }}
							>
								{g.icon} {g.name}
							</Link>
						))}
					</nav>
					<div className="arcade-console">
						<aside className="arcade-controls">
							<div className="arcade-mode">
								<Button
									disabled={locked || active}
									onClick={() => switchMode("practice")}
									aria-pressed={mode === "practice"}
								>
									Practice
								</Button>
								<Button
									disabled={!canUseWallet || locked || active}
									onClick={() => switchMode("wallet")}
									aria-pressed={mode === "wallet"}
								>
									My play credits
								</Button>
							</div>
							<span className="arcade-kicker">
								{mode === "wallet"
									? "YOUR ACCOUNT CREDITS"
									: "PRACTICE BALANCE"}
							</span>
							<strong className="arcade-balance">
								{mode === "wallet" && wallet.isPending
									? "Loading…"
									: number(balance)}{" "}
								<small>CREDITS</small>
							</strong>
							<p>Play credits only. No cash value.</p>
							<label htmlFor="practice-stake">Credits per round</label>
							<input
								id="practice-stake"
								type="number"
								min="0.1"
								max={Math.min(100, balance)}
								step="0.1"
								value={stake}
								disabled={round.active || locked}
								onChange={(e) => setStake(e.target.value)}
							/>
							<div className="arcade-quick">
								{[5, 10, 25, 50].map((n) => (
									<Button
										key={n}
										disabled={round.active || locked}
										variant="outline"
										onClick={() => setStake(String(n))}
									>
										{n}
									</Button>
								))}
							</div>
							<Button
								className="arcade-primary"
								disabled={round.active || locked || room.restoreError}
								onClick={start}
							>
								{t(
									busy
										? "Checking round…"
										: id === "plinko"
											? "Drop a ball"
											: id === "crash"
												? "Start flight"
												: "Start round",
								)}
							</Button>

							{id !== "plinko" && (
								<Button
									variant="outline"
									className="arcade-collect"
									disabled={!canCollect}
									onClick={collect}
								>
									{t(busy ? "Confirming cash-out…" : "Collect")}{" "}
									{number(round.stake * round.multiplier)} {t("credits")}
								</Button>
							)}
							{mode === "practice" && (
								<Button
									variant="ghost"
									disabled={round.active || locked}
									onClick={() => room.setDemoBalance(1000000)}
								>
									Refill practice credits ↻
								</Button>
							)}
							{!canUseWallet && (
								<p>
									<Link href="/login">Sign in with a user account</Link> to use
									your saved play credits.
								</p>
							)}
							{room.restoreError && (
								<p role="alert">
									Could not check your saved round.{" "}
									<Button onClick={() => void room.retryActive()}>
										Retry connection
									</Button>
								</p>
							)}
							{room.error && <p role="alert">{room.error}</p>}
							{pending && !busy && (
								<div className="arcade-recovery">
									<p>Your previous request needs checking.</p>
									<Button onClick={() => void room.recoverSaved()}>
										Check saved round
									</Button>
									<Button onClick={() => void room.send(pending)}>
										Retry identical request
									</Button>
								</div>
							)}
						</aside>
						<section
							className="arcade-stage"
							aria-label={`${game.name} game board`}
						>
							<span className="arcade-stage-label">
								GOLDBET365 ORIGINAL / {id.toUpperCase()}
							</span>
							{id === "mines" ? (
								<div className="arcade-grid">
									{Array.from({ length: 25 }, (_, i) => {
										const shown =
											round.revealed.includes(i) ||
											(!round.active &&
												round.stake > 0 &&
												round.mines.includes(i));
										return (
											<motion.button
												type="button"
												key={i}
												whileTap={{ scale: 0.91 }}
												className={
													shown
														? round.mines.includes(i)
															? "tile danger"
															: "tile gem"
														: "tile"
												}
												disabled={!round.active || shown || locked}
												aria-label={`Tile ${i + 1}${shown ? (round.mines.includes(i) ? ", mine" : ", gem") : ""}`}
												onClick={() => reveal(i)}
											>
												<motion.span
													animate={{
														scale: shown ? 1 : 0.5,
														rotate: shown ? 0 : 45,
													}}
												>
													{shown ? (round.mines.includes(i) ? "✹" : "◆") : "·"}
												</motion.span>
											</motion.button>
										);
									})}
								</div>
							) : id === "plinko" ? (
								<Plinko
									path={round.path}
									serial={round.serial}
									reduced={!!reduced}
								/>
							) : id === "crash" ? (
								<FlightBoard
									active={active}
									multiplier={multiplier}
									outcome={outcome}
								/>
							) : null}
							<div className="arcade-stage-bottom">
								<span>
									{id === "mines"
										? `${round.revealed.filter((i) => !round.mines.includes(i)).length} gems · 3 mines`
										: "Independent random rounds"}
								</span>
								<strong>{round.multiplier.toFixed(2)}×</strong>
							</div>
						</section>
					</div>
					<RoundFeedback
						outcome={outcome}
						stakeMillimes={room.roundStake}
						busy={locked}
						phase={phase}
						error={room.error}
					/>

					<section className="arcade-history" aria-label="Recent round returns">
						{history.map((h) => (
							<span key={h.id} className={h.multiplier > 0 ? "positive" : ""}>
								{h.multiplier.toFixed(2)}×
							</span>
						))}
					</section>
					<details className="arcade-rules">
						<summary>How to play & practice rules</summary>
						<p>{room.game.rules}</p>
						<p>
							Practice starts with 1,000 separate credits. Refill whenever no
							round is active. Account mode uses your stored non-redeemable play
							credits. Each round and balance change is saved by the server.
							Practice mode uses a separate local balance. No purchases,
							withdrawals, money or prizes are involved.
						</p>
						<p>
							Account rounds use server-generated outcomes. Play credits cannot
							be redeemed.
						</p>
					</details>
				</main>
			</div>
		</MotionConfig>
	);
}

function Plinko({
	path,
	serial,
	reduced,
}: {
	path: number[];
	serial: string;
	reduced: boolean;
}) {
	let column = 0;
	const xs = [
		300,
		...path.map((step, row) => {
			column += step;
			return 300 + (column - (row + 1) / 2) * 48;
		}),
	];
	const ys = [25, ...path.map((_, row) => 65 + row * 34)];
	return (
		<svg
			className="arcade-plinko"
			viewBox="0 0 600 400"
			role="img"
			aria-label="Eight row Plinko board with nine multiplier pockets"
		>
			{Array.from({ length: 8 }, (_, row) =>
				Array.from({ length: row + 3 }, (_, col) => (
					<circle
						key={`${row}-${col}`}
						cx={300 + (col - (row + 2) / 2) * 48}
						cy={65 + row * 34}
						r="4"
						fill="#bac6d3"
					/>
				)),
			)}
			{pockets.map((pay, i) => (
				<g key={i}>
					<rect
						x={84 + i * 48}
						y="345"
						width="44"
						height="32"
						rx="7"
						fill={i === 0 || i === 8 ? "#e46d68" : "#b9924c"}
					/>
					<text
						x={106 + i * 48}
						y="366"
						textAnchor="middle"
						fill="#101718"
						fontWeight="800"
						fontSize="12"
					>
						{pay}×
					</text>
				</g>
			))}
			{path.length > 0 && (
				<motion.circle
					key={serial}
					r="9"
					fill="#ffe18c"
					initial={{ cx: 300, cy: 25 }}
					animate={{ cx: [...xs, 106 + column * 48], cy: [...ys, 337] }}
					transition={{ duration: reduced ? 0 : 1.7, ease: "linear" }}
				/>
			)}
		</svg>
	);
}
