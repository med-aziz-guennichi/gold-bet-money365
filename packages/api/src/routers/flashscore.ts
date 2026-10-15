import { z } from "zod";

import { publicProcedure } from "../index";

const matchIdsInput = z.object({
  ids: z.array(z.string().regex(/^[A-Za-z0-9]{8}$/)).max(30),
});

/** Public, read-only access to the server's Flashscore-backed football feed. */
export const flashscoreRouter = {
  matches: publicProcedure.handler(({ context }) =>
    context.flashscore.getMatches(),
  ),
  odds: publicProcedure
    .input(matchIdsInput)
    .handler(({ context, input }) => context.flashscore.getOdds(input.ids)),
  results: publicProcedure
    .input(matchIdsInput)
    .handler(({ context, input }) => context.flashscore.getResults(input.ids)),
};
