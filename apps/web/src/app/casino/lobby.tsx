"use client";
import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import type { GameId } from "@gold-bet-clean-money365/casino-core";
import { Card, Dice } from "@gold-bet-clean-money365/casino-core/ui";
import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/sports/page-chrome";
import "./studio.css";

function Artwork({ game }: { game: GameId }) {
	return (
		<div className={`game-art art-${game}`} aria-hidden="true">
			{["blackjack", "baccarat", "video-poker", "dragon-tiger"].includes(
				game,
			) ? (
				<div className="art-cards">
					<Card value={game === "video-poker" ? "Q♥" : "A♠"} />
					<Card value={game === "baccarat" ? "9♦" : "K♦"} />
					{game === "video-poker" && <Card value="J♥" />}
				</div>
			) : game === "roulette" ? (
				<div className="art-roulette">
					<i />
					<b>0</b>
				</div>
			) : game === "sic-bo" ? (
				<div className="art-dice">
					<Dice value={5} />
					<Dice value={3} />
					<Dice value={6} />
				</div>
			) : game === "mines" ? (
				<div className="art-mines">
					{Array.from({ length: 9 }, (_, i) => (
						<i key={i}>{i === 4 ? "◆" : ""}</i>
					))}
				</div>
			) : game === "crash" ? (
				<svg aria-hidden="true" viewBox="0 0 300 180">
					<path
						d="M20 150Q170 160 270 25"
						fill="none"
						stroke="#f1cc73"
						strokeWidth="5"
					/>
					<path d="m245 35 24-18-8 28-7-9Z" fill="#f1cc73" />
					<text x="65" y="95" fill="#ffecd0" fontSize="40" fontWeight="800">
						2.47×
					</text>
				</svg>
			) : game === "plinko" ? (
				<svg aria-hidden="true" viewBox="0 0 300 180">
					{Array.from({ length: 6 }, (_, r) =>
						Array.from({ length: r + 3 }, (_, c) => (
							<circle
								key={`${r}:${c}`}
								cx={150 + (c - (r + 2) / 2) * 24}
								cy={25 + r * 23}
								r="3"
								fill="#e8d49f"
							/>
						)),
					)}
					<circle cx="162" cy="72" r="8" fill="#dfac4e" />
				</svg>
			) : (
				<div className="art-slots">
					<span>7</span>
					<span>7</span>
					<span>7</span>
				</div>
			)}
		</div>
	);
}
export default function Lobby() {
	const [category, setCategory] = useState("All games");
	const games = casinoGames.filter(
		(g) => category === "All games" || g.category === category,
	);
	return (
		<div className="studio-page lobby-page">
			<SiteHeader />
			<main className="studio-shell">
				<section className="lobby-feature">
					<div>
						<p className="lobby-eyebrow">GOLDBET365 ORIGINALS / VOL. 01</p>
						<h1>
							Your seat.
							<br />
							Your next move.
						</h1>
						<p>
							Ten original games. Distinct tables, real decisions, and a place
							to practice before you play.
						</p>
						<Link href="/casino/blackjack" className="lobby-primary">
							Take a seat at Blackjack <span>↗</span>
						</Link>
						<span className="lobby-feature-note">
							Hit. Stand. Play your hand.
						</span>
					</div>
					<div className="lobby-feature-art">
						<div className="feature-ring" />
						<Card value="A♠" />
						<Card value="K♦" />
						<span className="feature-chip">21</span>
					</div>
				</section>
				<div className="lobby-section-heading">
					<div>
						<p className="lobby-eyebrow">THE ORIGINALS COLLECTION</p>
						<h2>Choose your game.</h2>
					</div>
					<Link href="/casino/history">Your round history →</Link>
				</div>
				<div
					className="lobby-filters"
					aria-label="Game categories"
					role="tablist"
				>
					{["All games", "Cards", "Table", "Arcade", "Strategy", "Dice"].map(
						(c) => (
							<button
								type="button"
								role="tab"
								aria-selected={category === c}
								className={category === c ? "selected" : ""}
								key={c}
								onClick={() => setCategory(c)}
							>
								{c}
							</button>
						),
					)}
				</div>
				<div className="lobby-games">
					{games.map((g, i) => (
						<Link
							className={`lobby-game tile-${g.id}`}
							href={`/casino/${g.id}`}
							key={g.id}
						>
							<Artwork game={g.id} />
							<div className="lobby-game-info">
								<div>
									<small>{g.category} · GOLDBET365</small>
									<h3>{g.name}</h3>
									<p>
										{g.mode === "session"
											? "Play your decisions"
											: "Instant rounds"}{" "}
										· Practice available
									</p>
								</div>
								<span className="lobby-play" aria-hidden="true">
									↗
								</span>
							</div>
							<span className="game-number">
								{String(i + 1).padStart(2, "0")}
							</span>
						</Link>
					))}
				</div>
				<section className="lobby-how">
					<div>
						<span>01</span>
						<h3>Make it your game</h3>
						<p>
							Each game opens in its own room with tailored controls and a
							complete rulebook.
						</p>
					</div>
					<div>
						<span>02</span>
						<h3>Find your rhythm</h3>
						<p>
							Practice with separate demo credits. Switch to wallet mode when
							you choose to.
						</p>
					</div>
					<div>
						<span>03</span>
						<h3>Keep every receipt</h3>
						<p>
							Wallet stakes, results and returns are saved together. Interrupted
							rounds can be resumed.
						</p>
					</div>
				</section>
				<footer className="studio-footer">
					Original animated games by GoldBet365. Play at your pace. Set a budget
					and take breaks.
				</footer>
			</main>
		</div>
	);
}
