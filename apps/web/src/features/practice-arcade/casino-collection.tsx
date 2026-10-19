"use client";

import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import { useI18n } from "@gold-bet-clean-money365/i18n";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import "./casino-collection.css";

const categories = ["All games", "Table", "Arcade", "Cards", "Slots"] as const;
function category(id: string) {
	if (["blackjack", "video-poker", "three-card", "baccarat"].includes(id))
		return "Cards";
	if (["roulette", "dragon-tiger", "sic-bo"].includes(id)) return "Table";
	if (id === "slots") return "Slots";
	return "Arcade";
}

export function CasinoCollection() {
	const { t } = useI18n();
	const [selected, setSelected] = useState<string>("All games");
	const [query, setQuery] = useState("");
	const games = casinoGames.filter(
		(game) =>
			(selected === "All games" || category(game.id) === selected) &&
			`${game.name} ${t(game.name)} ${game.id}`
				.toLocaleLowerCase()
				.includes(query.trim().toLocaleLowerCase()),
	);
	return (
		<main className="casino-collection">
			<section className="collection-hero">
				<div>
					<span className="collection-eyebrow">GOLDBET365 ORIGINALS</span>
					<h1>{t("Your seat at the table.")}</h1>
					<p>
						{t(
							"Twenty distinct games. One play-credit balance. Choose your table and play at your own pace.",
						)}
					</p>
					<Link href="/casino/roulette" className="collection-feature-link">
						{t("Play European Roulette")} <span aria-hidden="true">↗</span>
					</Link>
					<small>{t("Play credits only. No cash value.")}</small>
				</div>
				<div className="collection-hero-image">
					<Image
						src="/casino/roulette.webp"
						alt=""
						fill
						sizes="(max-width: 650px) 100vw, 540px"
						priority
					/>
				</div>
			</section>
			<section className="collection-browser" aria-label={t("Game collection")}>
				<div className="collection-toolbar">
					<h2>
						{t("Game collection")} <span>{casinoGames.length}</span>
					</h2>
					<label className="collection-search">
						<span>{t("Search games")}</span>
						<input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={t("Search games")}
						/>
					</label>
				</div>
				<fieldset
					className="collection-filters"
					aria-label={t("Game categories")}
				>
					{categories.map((item) => (
						<button
							key={item}
							type="button"
							aria-pressed={selected === item}
							onClick={() => setSelected(item)}
						>
							{t(item)}
						</button>
					))}
				</fieldset>
				<p className="collection-count" role="status">
					{games.length} / {casinoGames.length} {t("games")}
				</p>
				<div className="collection-grid">
					{games.map((game) => (
						<Link
							key={game.id}
							href={`/casino/${game.id}`}
							className="collection-game"
						>
							<div className="collection-cover">
								<Image
									src={`/casino/${game.id}.webp`}
									alt=""
									fill
									sizes="(max-width: 650px) 50vw, (max-width: 1000px) 33vw, 280px"
								/>
								<span className="collection-play" aria-hidden="true">
									↗
								</span>
								<span className="collection-cover-label">GOLDBET365</span>
							</div>
							<div className="collection-game-info">
								<h3>{t(game.name)}</h3>
								<span>{t(category(game.id))}</span>
							</div>
						</Link>
					))}
				</div>
				{games.length === 0 && (
					<div className="collection-empty">
						<p>{t("No games match your search.")}</p>
						<button
							type="button"
							onClick={() => {
								setQuery("");
								setSelected("All games");
							}}
						>
							{t("Clear filters")}
						</button>
					</div>
				)}
			</section>
		</main>
	);
}
