import type { Database } from "@gold-bet-clean-money365/db";
import { APIError, betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, phoneNumber } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { normalizePhone } from "./access";
import { createRateLimiter } from "./rate-limit";
import { activeAccount } from "./storage";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	const secure = new URL(env.BETTER_AUTH_URL).protocol === "https:";
	const crossSite =
		new URL(env.BETTER_AUTH_URL).hostname !== new URL(env.CORS_ORIGIN).hostname;
	return betterAuth({
		database: mongodbAdapter(database),
		trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			minPasswordLength: 12,
			maxPasswordLength: 128,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		session: {
			expiresIn: 60 * 60 * 8,
			updateAge: 60 * 15,
			cookieCache: { enabled: false },
		},
		user: {
			additionalFields: {
				parentId: { type: "string", required: false, input: false },
				fournisseurId: { type: "string", required: false, input: false },
				clientId: { type: "string", required: false, input: false },
			},
		},
		rateLimit: {
			enabled: true,
			window: 60,
			max: 100,
			customStorage: {
				consume: createRateLimiter(database, env.BETTER_AUTH_SECRET),
			},
			customRules: {
				"/sign-in/phone-number": { window: 60, max: 5 },
				"/change-password": { window: 60, max: 5 },
			},
		},
		advanced: {
			useSecureCookies: secure,
			// Only the HTTP adapter may set this header, using the socket peer address.
			ipAddress: { ipAddressHeaders: ["x-auth-client-ip"] },
			defaultCookieAttributes: {
				sameSite: crossSite && secure ? "none" : "lax",
				secure,
				httpOnly: true,
			},
		},
		databaseHooks: {
			session: {
				create: {
					before: async (session) => {
						if (!(await activeAccount(database, session.userId))) {
							throw new APIError("UNAUTHORIZED", {
								message: "Invalid phone number or password.",
							});
						}
					},
				},
			},
		},
		plugins: [
			admin({
				defaultRole: "user",
				adminRoles: ["admin"],
				roles: {
					admin: adminAc,
					fournisseur: userAc,
					client: userAc,
					user: userAc,
				},
			}),
			phoneNumber({
				requireVerification: false,
				phoneNumberValidator: (phone) => {
					try {
						return normalizePhone(phone) === phone;
					} catch {
						return false;
					}
				},
				sendOTP: () => {
					throw new APIError("FORBIDDEN", {
						message: "Phone verification is disabled.",
					});
				},
			}),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
