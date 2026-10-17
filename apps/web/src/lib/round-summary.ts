import type { CasinoOutcome } from "@gold-bet-clean-money365/casino-core";
export function roundSummary(stake: number, outcome: CasinoOutcome) {
	const returned = Number(
		(BigInt(stake) * BigInt(outcome.multiplierHundredths)) / BigInt(100),
	);
	const net = returned - stake;
	return {
		returned,
		net,
		tone: net > 0 ? "win" : net === 0 ? "push" : "loss",
		title:
			net > 0
				? "You won"
				: returned === 0
					? "No return this round"
					: net === 0
						? "Stake returned"
						: "Partial return",
	};
}
