import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		"/",
		"/casino",
		"/about",
		"/how-it-works",
		"/responsible-play",
		"/support",
		"/privacy",
		...casinoGames.map((g) => `/casino/${g.id}`),
	].map((path) => ({ url: `${SITE_URL}${path === "/" ? "/" : path}` }));
}
