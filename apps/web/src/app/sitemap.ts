import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import type { MetadataRoute } from "next";
import { arcadeGames } from "@/features/practice-arcade/games";
import { SITE_URL } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		"/",
		"/casino",
		"/about",
		"/how-it-works",
		"/responsible-play",
		...casinoGames.filter((g) => g.id !== "dino").map((g) => `/casino/${g.id}`),
		...arcadeGames.map((game) => `/casino/arcade/${game.id}`),
	].map((path) => ({ url: `${SITE_URL}${path === "/" ? "/" : path}` }));
}
