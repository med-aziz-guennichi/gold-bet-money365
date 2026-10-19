/** Public identifiers only. Missing/invalid configuration never sends tracking or ad requests. */
export function googleConfig(values: {
	analyticsId?: string;
	publisherId?: string;
	homeSlot?: string;
	adsEnabled?: string;
}) {
	const analyticsId = /^G-[A-Z0-9]+$/.test(values.analyticsId ?? "")
		? values.analyticsId
		: undefined;
	const publisherId = /^ca-pub-\d{16}$/.test(values.publisherId ?? "")
		? values.publisherId
		: undefined;
	const homeSlot = /^\d{10}$/.test(values.homeSlot ?? "")
		? values.homeSlot
		: undefined;
	return {
		analyticsId,
		publisherId,
		homeSlot,
		adsEnabled:
			values.adsEnabled === "true" && Boolean(publisherId && homeSlot),
	};
}

export const google = googleConfig({
	analyticsId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
	publisherId: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
	homeSlot: process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT,
	adsEnabled: process.env.NEXT_PUBLIC_ADSENSE_ENABLED,
});

/** Never transmit account routes, receipt IDs, search terms, or match identifiers. */
export function measurementPage(path: string): string | null {
	if (
		[
			"/",
			"/about",
			"/support",
			"/privacy",
			"/how-it-works",
			"/responsible-play",
			"/casino",
		].includes(path)
	)
		return path;
	if (/^\/match\/[^/]+$/.test(path)) return "/match/event";
	if (/^\/casino\/(?!history(?:\/|$))[^/]+$/.test(path)) return "/casino/game";
	return null;
}
