/** Provider sport names map to the same canonical slugs as the sports catalogue. */
export function sportSlug(name?: string) {
	const slug = (name ?? "Football")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z]+/g, "-")
		.replace(/^-|-$/g, "");
	return slug || "football";
}

export function sportsHomeHref(sport?: string, day = "0") {
	const safeDay = ["-1", "0", "1", "2"].includes(day) ? day : "0";
	return `/?sport=${sportSlug(sport)}&day=${safeDay}#matches` as const;
}
