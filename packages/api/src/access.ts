export type { Auth } from "@gold-bet-clean-money365/auth";
export {
	canUseDashboard,
	normalizePhone,
	type Role,
	roles,
} from "@gold-bet-clean-money365/auth/access";
export type { AccountSummary } from "@gold-bet-clean-money365/auth/management";

export {
	type Currency,
	currencies,
	currencyOf,
	formatAmount,
	formatTnd,
	parseAmount,
	parseTnd,
} from "@gold-bet-clean-money365/auth/money";
