import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { publicProcedure } from "../index";

const matchIdsInput = z.object({
	ids: z.array(z.string().regex(/^[A-Za-z0-9]{8}$/)).max(30),
});

/** Public, read-only access to the server's Flashscore-backed football feed. */
export const flashscoreRouter = {
	sports: publicProcedure.handler(({ context }) => {
		if (!context.flashscore.getSports)
			throw new ORPCError("SERVICE_UNAVAILABLE");
		return context.flashscore.getSports();
	}),
	browse: publicProcedure
		.input(
			z
				.object({
					sport: z.string().regex(/^[a-z][a-z-]{0,40}$/),
					cursor: z.number().int().min(0).max(50000).default(0),
				})
				.strict(),
		)
		.handler(({ context, input }) => {
			if (!context.flashscore.getPricedMatches)
				throw new ORPCError("SERVICE_UNAVAILABLE");
			return context.flashscore.getPricedMatches(input);
		}),
	matches: publicProcedure
		.input(
			z
				.object({ ids: z.array(z.string().regex(/^[A-Za-z0-9]{8}$/)).max(10) })
				.optional(),
		)
		.handler(({ context, input }) => context.flashscore.getMatches(input)),
	odds: publicProcedure
		.input(matchIdsInput)
		.handler(({ context, input }) => context.flashscore.getOdds(input.ids)),
	results: publicProcedure
		.input(matchIdsInput)
		.handler(({ context, input }) => context.flashscore.getResults(input.ids)),
};
