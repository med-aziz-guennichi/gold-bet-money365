import type { Context as ApiContext } from "@gold-bet-clean-money365/api/context";
import type { Context as HonoContext } from "hono";

import { auth, db } from "./services";
import { flashscoreService } from "./services/flashscore";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    db,
    session,
    flashscore: flashscoreService,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
