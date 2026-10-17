"use client";

import { Button } from "@gold-bet-clean-money365/ui/components/button";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { SiteHeader } from "@/components/sports/page-chrome";
import {
	type ArcadeId,
	arcadeGames,
	crashPoint,
	makeMines,
	mineMultiplier,
	pockets,
	randomInt,
} from "./games";
import "./arcade.css";

type Round = {
	active: boolean;
	stake: number;
	multiplier: number;
	mines: number[];
	revealed: number[];
	started: number;
	limit: number;
	steps: number;
	path: number[];
	serial: number;
};
const empty: Round = {
	active: false,
	stake: 0,
	multiplier: 1,
	mines: [],
	revealed: [],
	started: 0,
	limit: 1,
	steps: 0,
	path: [],
	serial: 0,
};
const number = (n: number) =>
	n.toLocaleString("en", { maximumFractionDigits: 2 });

export function ArcadeLobby() {
	return (
		<MotionConfig reducedMotion="user">
			<div className="arcade">
				<SiteHeader />
				<main className="arcade-shell">
					<section className="arcade-hero">
						<span className="arcade-kicker">GOLDBET365 / THE PLAYGROUND</span>
						<h1>
							Small moments.
							<br />
							<em>Big energy.</em>
						</h1>
						<p>
							Four ways to play. Free practice points. Just for the fun of it.
						</p>
						<span className="arcade-pill">
							No purchases · No cash value · No withdrawals
						</span>
					</section>
					<div className="arcade-cards">
						{arcadeGames.map((g, i) => (
							<motion.div
								key={g.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: i * 0.08 }}
							>
								<Link
									className={`arcade-card card-${g.id}`}
									href={`/casino/${g.id}`}
								>
									<span className="arcade-card-icon" aria-hidden="true">
										{g.icon}
									</span>
									<span className="arcade-kicker">0{i + 1} / PRACTICE</span>
									<h2>{g.name}</h2>
									<p>{g.description}</p>
									<b>Let's play ↗</b>
								</Link>
							</motion.div>
						))}
					</div>
					<p className="arcade-note">
						Original GoldBet365 practice games. Outcomes are random; these
						points cannot be bought, transferred, or redeemed.
					</p>
				</main>
			</div>
		</MotionConfig>
	);
}

export function ArcadeRoom({ id }: { id: ArcadeId }) {
	const game = arcadeGames.find((g) => g.id === id)!;
	const [balance, setBalance] = useState(1000);
	const [stake, setStake] = useState("10");
	const [round, setRound] = useState<Round>(empty);
	const current = useRef(round);
	const funds = useRef(balance);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [message, setMessage] = useState("Ready when you are.");
	const [history, setHistory] = useState<{ id: number; multiplier: number }[]>(
		[],
	);
	const reduced = useReducedMotion();
	function update(next: Round) {
		current.current = next;
		setRound(next);
	}
	function credit(amount: number) {
		funds.current = Math.round((funds.current + amount) * 100) / 100;
		setBalance(funds.current);
	}
	function finish(multiplier: number, next = current.current) {
		if (!current.current.active) return;
		update({ ...next, active: false, multiplier });
		credit(next.stake * multiplier);
		setHistory((h) => [{ id: next.serial, multiplier }, ...h].slice(0, 8));
		setMessage(
			multiplier
				? `Collected ${number(next.stake * multiplier)} practice points`
				: "Round over. Take a breather or try again.",
		);
	}
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	const tick = useEffectEvent(() => {
		const r = current.current;
		if (!r.active) return;
		const value = Math.exp((performance.now() - r.started) / 6500);
		if (value >= r.limit) finish(r.limit === 50 ? 50 : 0);
		else update({ ...r, multiplier: value });
	});
	useEffect(() => {
		if (id !== "crash" || !round.active) return;
		const interval = setInterval(tick, 50);
		return () => clearInterval(interval);
	}, [id, round.active]);
	function start() {
		const amount = Number(stake);
		if (current.current.active) return;
		if (
			!Number.isFinite(amount) ||
			amount < 1 ||
			amount > funds.current ||
			amount > 100
		) {
			setMessage("Choose between 1 and 100 points, within your balance.");
			return;
		}
		credit(-amount);
		const path =
			id === "plinko" ? Array.from({ length: 8 }, () => randomInt(2)) : [];
		const next = {
			...empty,
			active: true,
			stake: amount,
			started: performance.now(),
			limit: id === "crash" ? crashPoint() : 1,
			mines: id === "mines" ? makeMines() : [],
			path,
			serial: current.current.serial + 1,
		};
		update(next);
		setMessage(
			id === "mines"
				? "Choose a tile to reveal a gem."
				: id === "dino"
					? "Jump the next obstacle or collect."
					: "Round in motion…",
		);
		if (id === "plinko")
			timer.current = setTimeout(
				() => finish(pockets[path.reduce((a, b) => a + b, 0)]!, next),
				reduced ? 100 : 1800,
			);
	}
	function collect() {
		const r = current.current;
		if (
			!r.active ||
			id === "plinko" ||
			(id === "mines" && !r.revealed.length) ||
			(id === "dino" && !r.steps)
		)
			return;
		if (id === "crash") {
			const value = Math.exp((performance.now() - r.started) / 6500);
			finish(value >= r.limit ? (r.limit === 50 ? 50 : 0) : value, r);
		} else finish(r.multiplier, r);
	}
	function reveal(index: number) {
		const r = current.current;
		if (!r.active || r.revealed.includes(index)) return;
		const next = { ...r, revealed: [...r.revealed, index] };
		if (r.mines.includes(index)) {
			finish(0, next);
			return;
		}
		next.multiplier = mineMultiplier(next.revealed.length);
		update(next);
		if (next.revealed.length === 22) finish(next.multiplier, next);
	}
	function jump() {
		const r = current.current;
		if (!r.active) return;
		if (randomInt(100) >= 80) {
			finish(0);
			return;
		}
		const next = {
			...r,
			steps: r.steps + 1,
			multiplier: Math.round(1.2 ** (r.steps + 1) * 100) / 100,
		};
		update(next);
		if (next.steps === 20) finish(next.multiplier, next);
	}
	const canCollect =
		round.active &&
		id !== "plinko" &&
		(id === "crash" || round.steps > 0 || round.revealed.length > 0);
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
						<span className="arcade-pill">FREE PRACTICE ONLY</span>
					</div>
					<nav className="arcade-tabs" aria-label="Practice games">
						{arcadeGames.map((g) => (
							<Link
								key={g.id}
								aria-current={g.id === id ? "page" : undefined}
								href={`/casino/${g.id}`}
							>
								{g.icon} {g.name}
							</Link>
						))}
					</nav>
					<div className="arcade-console">
						<aside className="arcade-controls">
							<span className="arcade-kicker">YOUR PLAY POINTS</span>
							<strong className="arcade-balance">
								{number(balance)} <small>PTS</small>
							</strong>
							<p>Free points. Zero cash value.</p>
							<label htmlFor="practice-stake">Points per round</label>
							<input
								id="practice-stake"
								type="number"
								min="1"
								max={Math.min(100, balance)}
								step="1"
								value={stake}
								disabled={round.active}
								onChange={(e) => setStake(e.target.value)}
							/>
							<div className="arcade-quick">
								{[5, 10, 25, 50].map((n) => (
									<Button
										key={n}
										disabled={round.active}
										variant="outline"
										onClick={() => setStake(String(n))}
									>
										{n}
									</Button>
								))}
							</div>
							<Button
								className="arcade-primary"
								disabled={round.active}
								onClick={start}
							>
								{id === "plinko" ? "Drop a ball" : "Start round"}
							</Button>
							{id === "dino" && (
								<Button
									className="arcade-primary"
									disabled={!round.active}
									onClick={jump}
								>
									Jump · 80% chance
								</Button>
							)}
							{id !== "plinko" && (
								<Button
									variant="outline"
									className="arcade-collect"
									disabled={!canCollect}
									onClick={collect}
								>
									Collect {number(round.stake * round.multiplier)} points
								</Button>
							)}
							<Button
								variant="ghost"
								disabled={round.active}
								onClick={() => {
									funds.current = 1000;
									setBalance(1000);
									setMessage("Refilled to 1,000 free practice points.");
								}}
							>
								Refill free points ↻
							</Button>
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
												disabled={!round.active || shown}
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
								<div className="arcade-flight">
									<svg viewBox="0 0 600 320" aria-hidden="true">
										<defs>
											<linearGradient id="orbit-line">
												<stop stopColor="#6a48bf" />
												<stop offset="1" stopColor="#d9bcff" />
											</linearGradient>
										</defs>
										<path
											d="M30 290 Q360 290 555 35"
											stroke="url(#orbit-line)"
											strokeWidth="5"
											fill="none"
										/>
										<motion.circle
											r="9"
											fill="#ebd6ff"
											animate={{
												cx: 30 + Math.min(1, (round.multiplier - 1) / 5) * 525,
												cy:
													290 -
													Math.min(1, (round.multiplier - 1) / 5) ** 2 * 255,
											}}
										/>
									</svg>
									<div className="arcade-big-number">
										{round.multiplier.toFixed(2)}
										<small>×</small>
										<span>
											{round.active ? "IN FLIGHT" : "READY FOR LIFTOFF"}
										</span>
									</div>
								</div>
							) : (
								<div className="arcade-dino">
									<div className="arcade-sun" />
									<span className="arcade-mountain">△ △ △</span>
									<motion.div
										key={round.steps}
										className="arcade-runner"
										initial={{ y: 0 }}
										animate={{ y: round.steps ? [0, -75, 0] : 0 }}
										transition={{ duration: 0.55 }}
									>
										🦖
									</motion.div>
									<motion.span
										key={`c${round.steps}`}
										className="arcade-cactus"
										initial={{ x: 150 }}
										animate={{ x: 0 }}
										transition={{ duration: 0.5 }}
									>
										🌵
									</motion.span>
									<div className="arcade-dino-score">
										{round.multiplier.toFixed(2)}×
										<small>{round.steps} successful jumps</small>
									</div>
									<div className="arcade-ground" />
								</div>
							)}
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
					<div className="arcade-status" role="status" aria-live="polite">
						{message}
					</div>
					<section
						className="arcade-history"
						aria-label="Recent round returns"
					>
						{history.map((h) => (
							<span key={h.id} className={h.multiplier > 0 ? "positive" : ""}>
								{h.multiplier.toFixed(2)}×
							</span>
						))}
					</section>
					<details className="arcade-rules">
						<summary>How to play & practice rules</summary>
						<p>{game.rules}</p>
						<p>
							Each visit starts with 1,000 free practice points. Refill whenever
							no round is active. Points are local to this page, have no
							monetary value and cannot be transferred or redeemed. Leaving a
							game ends that practice session.
						</p>
						<p>
							Browser-generated random outcomes are for casual play; this is not
							a certified wagering system.
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
	serial: number;
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
