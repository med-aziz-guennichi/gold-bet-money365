import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();

import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	output: "standalone",
	outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
	outputFileTracingIncludes: { "/*": [".env.schema"] },
};

export default withVarlock(nextConfig);
