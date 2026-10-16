import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("Vercel entrypoint serves HTTP without a listener and protects the settlement trigger", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async () => {
	loadEnvFile(new URL("../.env", import.meta.url));
	const source = new URL(
		process.env.AUTH_TEST_DATABASE_URL ??
			process.env.DATABASE_URL ??
			"mongodb://127.0.0.1:27017",
	);
	const name = `goldbet_deploy_test_${randomUUID().replaceAll("-", "")}`;
	source.pathname = `/${name}`;
	process.env.DATABASE_URL = source.toString();
	process.env.VERCEL = "1";
	process.env.SETTLEMENT_WORKER_SECRET = randomUUID() + randomUUID();
	process.chdir(fileURLToPath(new URL("../", import.meta.url)));
	const { default: app } = await import("./index");
	const { db } = await import("./services");
	try {
		assert.equal(db.databaseName, name);
		const unauthorized = await app.fetch(
			new Request("https://app.example/internal/settle", { method: "POST" }),
		);
		assert.equal(unauthorized.status, 401);
		const wrong = await app.fetch(
			new Request("https://app.example/internal/settle", {
				method: "POST",
				headers: { authorization: "Bearer wrong" },
			}),
		);
		assert.equal(wrong.status, 401);
		const authorized = await app.fetch(
			new Request("https://app.example/internal/settle", {
				method: "POST",
				headers: {
					authorization: `Bearer ${process.env.SETTLEMENT_WORKER_SECRET}`,
				},
			}),
		);
		assert.equal(authorized.status, 200);
		assert.deepEqual(await authorized.json(), { ok: true });
		const ready = await app.fetch(
			new Request("https://app.example/health/ready"),
		);
		assert.equal(ready.status, 200);
		assert.deepEqual(await ready.json(), { ok: true });
		assert.equal(ready.headers.get("cache-control"), "no-store");
	} finally {
		assert.ok(db.databaseName.startsWith("goldbet_deploy_test_"));
		await db.dropDatabase();
		await db.client.close();
	}
});
