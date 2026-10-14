import type { Session } from "@gold-bet-clean-money365/auth";
import type { Database } from "@gold-bet-clean-money365/db";

export type Context = {
  session: Session | null;
  db: Database;
};
