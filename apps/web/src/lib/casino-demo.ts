export function safeDemoUrl(value: unknown): string | null {
	if (typeof value !== "string") return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" &&
			url.hostname === "games.casinoapipro.com" &&
			!url.username &&
			!url.password &&
			!url.port
			? url.href
			: null;
	} catch {
		return null;
	}
}
