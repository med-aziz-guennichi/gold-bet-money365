import {
	type Currency,
	formatAmount,
} from "@gold-bet-clean-money365/api/access";
export function formatPlayCredits(units: number, currency?: Currency) {
	if (currency) return formatAmount(units, currency);
	return `${(units / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} play credits`;
}
