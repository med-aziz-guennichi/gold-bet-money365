// TND has 1,000 millimes. Store integer millimes, never floating-point dinars.
export const MAX_WALLET_MILLIMES = 1_000_000_000_000;

export function parseTnd(value: string): number {
	const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,3}))?$/.exec(value.trim());
	if (!match)
		throw new Error("Enter a TND amount with at most 3 decimal places.");
	const amount =
		Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
	if (!Number.isSafeInteger(amount) || amount > MAX_WALLET_MILLIMES)
		throw new Error("Amount is too large.");
	return amount;
}

export function formatTnd(millimes: number) {
	const absolute = Math.abs(millimes);
	return `${millimes < 0 ? "−" : ""}${Math.floor(absolute / 1000).toLocaleString("en-US")}.${String(absolute % 1000).padStart(3, "0")} TND`;
}
