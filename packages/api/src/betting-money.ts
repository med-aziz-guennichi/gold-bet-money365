import { MAX_WALLET_MILLIMES } from "@gold-bet-clean-money365/auth/money";

/** Round once, down to a millime, using exact integer arithmetic. */
export function calculateBetReturn(stakeMillimes: number, odds: string[]) {
	if (
		!Number.isSafeInteger(stakeMillimes) ||
		stakeMillimes <= 0 ||
		odds.length < 1 ||
		odds.length > 10
	)
		throw new Error("Invalid stake or selection count.");
	let product = 1n;
	let denominator = 1n;
	for (const odd of odds) {
		if (!/^\d{1,4}\.\d{2}$/.test(odd)) throw new Error("Invalid odds.");
		const price = BigInt(odd.replace(".", ""));
		if (price <= 100n || price > 100_000n)
			throw new Error("Odds are outside the accepted range.");
		product *= price;
		denominator *= 100n;
	}
	const payout = (BigInt(stakeMillimes) * product) / denominator;
	if (payout > BigInt(MAX_WALLET_MILLIMES))
		throw new Error(
			"Potential return exceeds the wallet limit. Reduce your stake or selections.",
		);
	return {
		potentialReturnMillimes: Number(payout),
		totalOdds: Number(product) / Number(denominator),
	};
}
