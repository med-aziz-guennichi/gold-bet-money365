import type { CoercedEnvSchema } from "./env";
import { deploymentEnv } from "./env-config";

// Serverless functions receive their secrets at runtime. They cannot rely on
// the package manager's CLI shims being present in the function filesystem.
export const ENV: Readonly<CoercedEnvSchema> =
	process.env.VERCEL === "1"
		? deploymentEnv(process.env)
		: await (async () => {
				await import("varlock/auto-load");
				return (await import("./env")).ENV;
			})();
