import type { Context as ApiContext } from "@gold-bet-clean-money365/api/context";
import { activeAccount } from "@gold-bet-clean-money365/auth/storage";
import type { Context as HonoContext } from "hono";
import { accounts, auth, bets, casino, db } from "./services";
import { flashscoreService } from "./services/flashscore";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({
	context,
}: CreateContextOptions): Promise<ApiContext> {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});
	return {
		db,
		accounts,
		bets,
		casino,
		session:
			session && (await activeAccount(db, session.user.id)) ? session : null,
		flashscore: flashscoreService,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
