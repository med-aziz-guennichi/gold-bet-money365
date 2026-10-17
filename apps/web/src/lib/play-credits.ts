export function formatPlayCredits(units: number) {
	return `${(units / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} play credits`;
}
