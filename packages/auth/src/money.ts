// All non-redeemable denominations use 1,000 integer credit units. No FX conversion.
export const currencies = ["TND", "USD", "EUR"] as const;
export type Currency = (typeof currencies)[number];
export function currencyOf(value?: Currency | null): Currency {
	return value ?? "TND";
}
export const MAX_WALLET_MILLIMES = 1_000_000_000_000;

export function parseAmount(value: string): number {
	const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,3}))?$/.exec(value.trim());
	if (!match) throw new Error("Enter an amount with at most 3 decimal places.");
	const amount =
		Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
	if (!Number.isSafeInteger(amount) || amount > MAX_WALLET_MILLIMES)
		throw new Error("Amount is too large.");
	return amount;
}

export function formatAmount(millimes: number, currency: Currency = "TND") {
	const absolute = Math.abs(millimes);
	return `${millimes < 0 ? "−" : ""}${Math.floor(absolute / 1000).toLocaleString("en-US")}.${String(absolute % 1000).padStart(3, "0")} ${currency}`;
}

// Compatibility for historical callers and stored millime field names.
export const parseTnd = parseAmount;
export const formatTnd = formatAmount;
