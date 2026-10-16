import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { bootstrapAdmin } from "@gold-bet-clean-money365/auth/bootstrap";
import type { Database } from "@gold-bet-clean-money365/db";

// Kept outside the HTTP server: there is no public bootstrap endpoint.
let connection: Database | undefined;
try {
	const localFile = fileURLToPath(
		new URL("../.env.admin.local", import.meta.url),
	);
	if (!process.env.INITIAL_ADMIN_PASSWORD && existsSync(localFile))
		loadEnvFile(localFile);
	const { auth, db } = await import("./services");
	connection = db;
	const name = process.env.INITIAL_ADMIN_NAME;
	const phoneNumber = process.env.INITIAL_ADMIN_PHONE;
	const password = process.env.INITIAL_ADMIN_PASSWORD;
	if (!name || !phoneNumber || !password)
		throw new Error(
			"Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_PHONE and INITIAL_ADMIN_PASSWORD privately in the environment or .env.admin.local.",
		);
	const result = await bootstrapAdmin(auth, db, {
		name,
		phoneNumber,
		password,
	});
	console.info(
		result.created
			? "Initial administrator created. Keep your configured credentials private."
			: "Administrator already exists. No password was changed.",
	);
} catch (error) {
	console.error(
		error instanceof Error ? error.message : "Admin bootstrap failed.",
	);
	process.exitCode = 1;
} finally {
	await connection?.client.close();
}
