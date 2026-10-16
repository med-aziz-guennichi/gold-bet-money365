import { loadEnvFile } from "node:process";
import {
	initializeLocalReplica,
	validateLocalMongoUrl,
} from "@gold-bet-clean-money365/auth/local-replica";

// Local setup uses the owning app env file without spawning a runtime loader.
loadEnvFile(new URL("../.env", import.meta.url));

try {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl)
		throw new Error("Set DATABASE_URL in apps/server/.env first.");
	validateLocalMongoUrl(databaseUrl);
	if (process.argv.includes("--check-only"))
		console.info("Local database configuration validated.");
	else {
		await initializeLocalReplica(databaseUrl, "goldbet-wallets");
		console.info(
			"Wallet transactions are enabled. Existing accounts and data were preserved.",
		);
	}
} catch (error) {
	console.error(
		error instanceof Error ? error.message : "Replica-set setup failed.",
	);
	process.exitCode = 1;
}
