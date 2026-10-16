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

export function sportsHomeHref(sport?: string) {
	return `/?sport=${sportSlug(sport)}#matches` as const;
}
