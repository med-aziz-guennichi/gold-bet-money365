import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { CASINO_VERSION, casinoGames } from "../casino-catalog";
import { casinoGameSchema, casinoInputSchema } from "../casino-input";
import { sessionGames } from "../casino-sessions";
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
	session: procedure
		.input(z.object({ id: z.string().min(1).max(100) }).strict())
		.handler(({ context, input }) =>
			context.casinoSessions.recover(context.session.user.id, input.id),
		),
	start: procedure
		.route({ method: "POST" })
		.input(
			z
				.object({
					requestId: z.uuid(),
					game: z.enum(sessionGames),
					version: z.string().max(30),
					stake: z.string().max(20),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.casinoSessions.start(context.session.user.id, input),
		),
	active: procedure
		.input(z.object({ game: z.enum(sessionGames) }).strict())
		.handler(({ context, input }) =>
			context.casinoSessions.active(context.session.user.id, input.game),
		),
	action: procedure
		.route({ method: "POST" })
		.input(
			z
				.object({
					id: z.string().max(100),
					requestId: z.uuid(),
					action: z
						.object({
							type: z.enum(["hit", "stand", "reveal", "cashout", "draw"]),
							index: z.number().int().min(0).max(24).optional(),
							holds: z.array(z.number().int().min(0).max(4)).max(5).optional(),
						})
						.strict(),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.casinoSessions.action(context.session.user.id, input),
		),
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
