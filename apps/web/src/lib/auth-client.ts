import type { Auth } from "@gold-bet-clean-money365/api/access";
import {
	adminClient,
	inferAdditionalFields,
	phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function getServerUrl(url: string) {
	const processEnv = typeof process === "undefined" ? undefined : process.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return processEnv.SERVER_URL.endsWith("/")
			? processEnv.SERVER_URL.slice(0, -1)
			: processEnv.SERVER_URL;
	}

	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const authClient = createAuthClient({
	plugins: [phoneNumberClient(), inferAdditionalFields<Auth>(), adminClient()],
	baseURL: `${getServerUrl(process.env.NEXT_PUBLIC_SERVER_URL!)}/api/auth`,
});
