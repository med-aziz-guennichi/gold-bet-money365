import { parseTnd } from "@gold-bet-clean-money365/auth/money";
import { z } from "zod";

const amount = z
	.string()
	.max(20)
	.refine((value) => {
		try {
			parseTnd(value);
			return true;
		} catch {
			return false;
		}
	}, "Enter a valid TND amount with at most 3 decimal places.");

export const betHistoryInput = z
	.object({
		page: z.number().int().min(1).max(1_000_000).default(1),
		limit: z.number().int().min(1).max(50).default(10),
		status: z.enum(["Pending", "Won", "Lost", "Void"]).optional(),
		query: z.string().trim().max(80).optional(),
		from: z.iso.datetime().optional(),
		to: z.iso.datetime().optional(),
		minStake: amount.optional(),
		maxStake: amount.optional(),
		type: z.enum(["single", "multiple"]).optional(),
		sort: z.enum(["newest", "oldest", "stake", "payout"]).optional(),
	})
	.strict()
	.refine(
		(value) =>
			!value.from ||
			!value.to ||
			Date.parse(value.from) <= Date.parse(value.to),
		{
			message: "Start date must be before end date.",
			path: ["to"],
		},
	)
	.refine(
		(value) => {
			if (value.minStake === undefined || value.maxStake === undefined)
				return true;
			try {
				return parseTnd(value.minStake) <= parseTnd(value.maxStake);
			} catch {
				return false;
			}
		},
		{
			message: "Minimum stake must not exceed maximum stake.",
			path: ["maxStake"],
		},
	);

export type BetHistoryInput = z.infer<typeof betHistoryInput>;
export type BetHistorySummary = {
	total: number;
	stakeMillimes: number;
	payoutMillimes: number;
	settledStakeMillimes: number;
	pending: number;
};
