import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { betHistoryInput } from "../bet-history";
import { protectedProcedure } from "../index";

const text = z.string().trim().min(1).max(150);
const procedure = protectedProcedure.use(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof ManagementError)
			throw new ORPCError(error.code, { message: error.message });
		throw error;
	}
});

export const betsRouter = {
	reviewQueue: procedure
		.route({ method: "GET" })
		.input(
			z
				.object({ page: z.number().int().min(1).max(10000).default(1) })
				.strict(),
		)
		.handler(({ context, input }) =>
			context.bets.reviewQueue(context.session.user.id, input.page),
		),
	resolveReview: procedure
		.route({ method: "POST" })
		.input(
			z
				.object({
					betId: z.string().regex(/^[a-f0-9]{24}$/i),
					requestId: z.uuid(),
					reason: z.string().trim().min(10).max(500),
					outcomes: z
						.array(z.enum(["won", "lost", "void"]))
						.min(1)
						.max(10),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.bets.resolveReview(context.session.user.id, input),
		),
	refresh: procedure
		.route({ method: "POST" })
		.input(z.object({}).strict())
		.handler(({ context }) =>
			context.bets.refreshResults(context.session.user.id),
		),
	place: procedure
		.route({ method: "POST" })
		.input(
			z
				.object({
					requestId: z.uuid(),
					stake: z.string().max(20),
					picks: z
						.array(
							z
								.object({
									matchId: z.string().regex(/^[A-Za-z0-9]{8}$/),
									expectedOdd: z.string().regex(/^\d{1,4}\.\d{2}$/),
									market: z
										.object({
											type: text,
											scope: text,
											selection: text,
											handicap: z.string().max(150).nullable().optional(),
											score: z.string().max(150).nullable().optional(),
											bookmaker: text.optional(),
										})
										.strict(),
								})
								.strict(),
						)
						.min(1)
						.max(10),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.bets.place(context.session.user.id, input),
		),
	mine: procedure
		.route({ method: "GET" })
		.input(betHistoryInput)
		.handler(({ context, input }) =>
			context.bets.list(context.session.user.id, input),
		),
};
