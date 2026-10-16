import { z } from "zod";

const optional = (schema: z.ZodType<string>) =>
	z.preprocess(
		(value) => (value === "" ? undefined : value),
		schema.optional(),
	);
const schema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]),
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	CORS_ORIGIN: z.url(),
	MONGODB_URI: optional(z.string().min(1)),
	DATABASE_URL: z.string().min(1),
	FLASHSCORE_API_URL: optional(z.url()),
	FLASHSCORE_API_KEY: optional(z.string()),
	SETTLEMENT_WORKER_SECRET: optional(z.string().min(32)),
});

export function deploymentEnv(env: NodeJS.ProcessEnv) {
	const result = schema.safeParse({
		...env,
		NODE_ENV: env.NODE_ENV ?? "production",
		DATABASE_URL: env.DATABASE_URL || env.MONGODB_URI,
	});
	if (!result.success) {
		// Report field names only; configuration values must never enter logs.
		throw new Error(
			`Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
		);
	}
	return Object.freeze(result.data);
}
