import mongoose from "mongoose";

import type { DatabaseConfig } from "./config";

export async function createDb(env: DatabaseConfig) {
	await mongoose.connect(env.DATABASE_URL, {
		maxPoolSize: 10,
		serverSelectionTimeoutMS: 10_000,
	});
	return mongoose.connection.getClient().db();
}

export type Database = Awaited<ReturnType<typeof createDb>>;
