import { BettingService } from "@gold-bet-clean-money365/api/betting-service";
import { CasinoService } from "@gold-bet-clean-money365/api/casino-service";
import { CasinoSessions } from "@gold-bet-clean-money365/api/casino-sessions";
import { createAuth } from "@gold-bet-clean-money365/auth";
import { AccountManagement } from "@gold-bet-clean-money365/auth/management";
import { ensureAuthIndexes } from "@gold-bet-clean-money365/auth/storage";
import { createDb } from "@gold-bet-clean-money365/db";
import { ENV } from "./env.server";
import { flashscoreService } from "./services/flashscore";

export const db = await createDb(ENV);
await ensureAuthIndexes(db);
export const auth = createAuth(ENV, db);

export const accounts = new AccountManagement(auth, db, ENV.BETTER_AUTH_SECRET);
export const casino = new CasinoService(db, ENV.BETTER_AUTH_SECRET);
export const casinoSessions = new CasinoSessions(db, ENV.BETTER_AUTH_SECRET);

export const bets = new BettingService(
	db,
	flashscoreService,
	ENV.BETTER_AUTH_SECRET,
);
