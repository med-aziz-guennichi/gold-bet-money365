import type { Session } from "@gold-bet-clean-money365/auth";
import type { AccountManagement } from "@gold-bet-clean-money365/auth/management";
import type { Database } from "@gold-bet-clean-money365/db";

import type { BettingService } from "./betting-service";
import type { CasinoService } from "./casino-service";
import type { FlashscoreService } from "./football";

export type Context = {
	session: Session | null;
	db: Database;
	accounts: AccountManagement;
	bets: BettingService;
	casino: CasinoService;
	flashscore: FlashscoreService;
};
