import { randomBytes } from "node:crypto";
import type { Database } from "@gold-bet-clean-money365/db";
import { normalizePhone } from "./access";
import type { Auth, AuthConfig } from "./index";
import { createRateLimiter } from "./rate-limit";
import { activeAccount, userCollection } from "./storage";

export async function createAuthHttpHandler(
	auth: Auth,
	db: Database,
	env: AuthConfig,
) {
	const consume = createRateLimiter(db, env.BETTER_AUTH_SECRET);
	const passwordContext = await auth.$context;
	const dummyPasswordHash = await passwordContext.password.hash(
		randomBytes(32).toString("hex"),
	);
	const publicAuthPaths = new Set([
		"/get-session",
		"/sign-in/phone-number",
		"/sign-out",
		"/change-password",
		"/list-sessions",
		"/revoke-session",
		"/revoke-other-sessions",
	]);

	return async (request: Request, ip: string): Promise<Response> => {
		const json = (body: unknown, status = 200, retryAfter?: number | null) =>
			Response.json(body, {
				status,
				headers: {
					"Cache-Control": "no-store",
					...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
				},
			});
		const path = new URL(request.url).pathname.slice("/api/auth".length);
		// Admin plugin APIs are server-only. No signup, email login, OTP, or impersonation routes.
		if (!publicAuthPaths.has(path)) return json({ message: "Not found" }, 404);
		const headers = new Headers(request.headers);
		// Ignore client-supplied forwarded headers, including our own internal header.
		headers.set("x-auth-client-ip", ip);
		if (path === "/sign-in/phone-number" && request.method === "POST") {
			if (request.headers.get("origin") !== new URL(env.CORS_ORIGIN).origin)
				return json({ message: "Invalid origin" }, 403);
			const networkLimit = await consume(`login-ip:${ip}`, {
				window: 60,
				max: 10,
			});
			if (!networkLimit.allowed) {
				return json(
					{ message: "Too many sign-in attempts. Please try again later." },
					429,
					networkLimit.retryAfter,
				);
			}
			let body: unknown;
			try {
				body = await request.clone().json();
			} catch {
				return json({ message: "Invalid request" }, 400);
			}
			if (
				!body ||
				typeof body !== "object" ||
				!("phoneNumber" in body) ||
				!("password" in body) ||
				typeof body.phoneNumber !== "string" ||
				typeof body.password !== "string" ||
				body.password.length > 128
			)
				return json({ message: "Invalid phone number or password." }, 400);
			let phone: string;
			try {
				phone = normalizePhone(body.phoneNumber);
			} catch {
				return json({ message: "Invalid phone number or password." }, 401);
			}
			const phoneLimit = await consume(`login-phone:${phone}`, {
				window: 300,
				max: 10,
			});
			if (!phoneLimit.allowed) {
				return json(
					{ message: "Too many sign-in attempts. Please try again later." },
					429,
					phoneLimit.retryAfter,
				);
			}
			if (
				!(await userCollection(db).findOne(
					{ phoneNumber: phone },
					{ projection: { _id: 1 } },
				))
			) {
				// Match the expensive password check for unknown accounts to reduce enumeration.
				await passwordContext.password.verify({
					hash: dummyPasswordHash,
					password: body.password,
				});
				return json({ message: "Invalid phone number or password." }, 401);
			}
			const response = await auth.handler(
				new Request(request.url, {
					method: "POST",
					headers,
					body: JSON.stringify({
						phoneNumber: phone,
						password: body.password,
						rememberMe: false,
					}),
				}),
			);
			if (response.status === 401 || response.status === 403)
				return json({ message: "Invalid phone number or password." }, 401);
			return response;
		}
		if (path !== "/sign-out") {
			const session = await auth.api.getSession({ headers });
			if (session && !(await activeAccount(db, session.user.id))) {
				if (path === "/get-session") return json(null);
				return json({ message: "Please sign in again." }, 401);
			}
		}
		return auth.handler(new Request(request, { headers }));
	};
}
