import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { CASINO_VERSION, casinoGames } from "../casino-catalog";
import { casinoGameSchema, casinoInputSchema } from "../casino-input";
import { protectedProcedure, publicProcedure } from "../index";

const game = casinoGameSchema;
const procedure = protectedProcedure.use(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof ManagementError)
			throw new ORPCError(error.code, { message: error.message });
		throw error;
	}
});
export const casinoRouter = {
	catalog: publicProcedure.handler(() => ({
		version: CASINO_VERSION,
		games: casinoGames,
	})),
	play: procedure
		.route({ method: "POST" })
		.input(casinoInputSchema)
		.handler(({ context, input }) =>
			context.casino.play(context.session.user.id, input),
		),
	history: procedure
		.input(
			z
				.object({
					page: z.number().int().min(1).max(10000).default(1),
					game: game.optional(),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.casino.history(context.session.user.id, input),
		),
	recover: procedure
		.input(z.object({ requestId: z.uuid() }).strict())
		.handler(({ context, input }) =>
			context.casino.recover(context.session.user.id, input.requestId),
		),
};
