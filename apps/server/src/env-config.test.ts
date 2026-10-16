import assert from "node:assert/strict";
import { test } from "node:test";
import { deploymentEnv } from "./env-config";

const env = {
	BETTER_AUTH_SECRET: "test-credential-with-at-least-32-characters",
	BETTER_AUTH_URL: "https://example.com",
	CORS_ORIGIN: "https://example.com",
	MONGODB_URI: "mongodb://example.com/test",
};

test("serverless configuration validates runtime secrets and Atlas aliases without a CLI", () => {
	const config = deploymentEnv(env);
	assert.equal(config.DATABASE_URL, env.MONGODB_URI);
	assert.equal(config.NODE_ENV, "production");
	assert.equal(config.SETTLEMENT_WORKER_SECRET, undefined);
	assert.equal(
		deploymentEnv({ ...env, DATABASE_URL: "mongodb://example.com/other" })
			.DATABASE_URL,
		"mongodb://example.com/other",
	);
	assert.throws(
		() =>
			deploymentEnv({ ...env, BETTER_AUTH_SECRET: "private-invalid-value" }),
		(error) => {
			assert.ok(error instanceof Error);
			assert.ok(error.message.includes("BETTER_AUTH_SECRET"));
			assert.ok(!error.message.includes("private-invalid-value"));
			return true;
		},
	);
	assert.throws(() =>
		deploymentEnv({ ...env, FLASHSCORE_API_URL: "localhost" }),
	);
});
