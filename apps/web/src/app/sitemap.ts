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
		...arcadeGames.map((game) => `/casino/${game.id}`),
	].map((path) => ({ url: `${SITE_URL}${path === "/" ? "/" : path}` }));
}
