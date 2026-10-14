import { createAuth } from "@gold-bet-clean-money365/auth";
import { createDb } from "@gold-bet-clean-money365/db";

import { ENV } from "./env.server";

export const db = await createDb(ENV);
export const auth = createAuth(ENV, db);
