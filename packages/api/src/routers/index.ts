import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { accountsRouter } from "./accounts";
import { betsRouter } from "./bets";
import { casinoRouter } from "./casino";
import { flashscoreRouter } from "./flashscore";
import { notificationsRouter } from "./notifications";

export const appRouter = {
	casino: casinoRouter,
	notifications: notificationsRouter,
	flashscore: flashscoreRouter,
	accounts: accountsRouter,
	bets: betsRouter,
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
