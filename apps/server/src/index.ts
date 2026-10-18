import { appRouter } from "@gold-bet-clean-money365/api/routers/index";
import { createAuthHttpHandler } from "@gold-bet-clean-money365/auth/http";
import { createRateLimiter } from "@gold-bet-clean-money365/auth/rate-limit";
import { activeAccount } from "@gold-bet-clean-money365/auth/storage";
import { getConnInfo } from "@hono/node-server/conninfo";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { upgradeWebSocket } from "@vercel/functions";
import { Hono, type Context as HonoContext } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { createContext } from "./context";
import { authorizedWorker, clientAddress, serverPort } from "./deployment";
import { ENV } from "./env.server";
import { auth, bets, db } from "./services";
import { notificationRealtime } from "./services/notification-realtime";
import { runDailySettlement } from "./services/settlement-job";

const app = new Hono();
const onVercel = process.env.VERCEL === "1";
function clientIp(context: HonoContext) {
	return clientAddress(
		context.req.raw.headers,
		onVercel ? "unknown" : (getConnInfo(context).remote.address ?? "unknown"),
		onVercel,
	);
}

// Persisted pending bets recover after a restart. A tick never overlaps itself.
let settling = false;
async function settleBets() {
	if (settling) return;
	settling = true;
	try {
		await bets.settlePending();
	} catch {
		console.error("Bet result refresh unavailable; retrying next cycle.");
	} finally {
		settling = false;
	}
}
if (!onVercel) {
	setInterval(() => {
		void settleBets();
	}, 30_000).unref();
	void settleBets();
}

app.use(secureHeaders());
app.use(bodyLimit({ maxSize: 16 * 1024 }));
// Never log query strings or request bodies: they can contain personal data.
app.use(async (c, next) => {
	await next();
	console.info(`${c.req.method} ${c.req.path} ${c.res.status}`);
});
app.use(
	"/*",
	cors({
		origin: ENV.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

const apiRateLimit = createRateLimiter(db, ENV.BETTER_AUTH_SECRET);
const connectNotifications = notificationRealtime(db);
async function notificationIdentity(headers: Headers, ip: string) {
	if (headers.get("origin") !== new URL(ENV.CORS_ORIGIN).origin) return null;
	if (
		!(await apiRateLimit(`notification-ws-ip:${ip}`, { window: 60, max: 60 }))
			.allowed
	)
		return null;
	const session = await auth.api.getSession({
		headers,
		query: { disableCookieCache: true },
	});
	if (!session) return null;
	const account = await activeAccount(db, session.user.id);
	if (!account) return null;
	const rate = await apiRateLimit(`notification-ws:${account.id}:${ip}`, {
		window: 60,
		max: 20,
	});
	return rate.allowed ? account : null;
}
function attachNotifications(
	socket: import("ws").WebSocket,
	account: NonNullable<Awaited<ReturnType<typeof notificationIdentity>>>,
	headers: Headers,
) {
	connectNotifications(
		socket,
		account,
		async () => {
			const session = await auth.api.getSession({
				headers,
				query: { disableCookieCache: true },
			});
			return (
				session?.user.id === account.id &&
				Boolean(await activeAccount(db, account.id))
			);
		},
		() => bets.refreshResults(account.id),
	);
}
app.get("/api/notifications/ws", async (c) => {
	c.header("Cache-Control", "no-store");
	const account = await notificationIdentity(c.req.raw.headers, clientIp(c));
	if (!account)
		return c.json({ message: "Unauthorized notification connection" }, 401);
	if (c.req.header("upgrade")?.toLowerCase() !== "websocket")
		return c.json({ message: "WebSocket upgrade required" }, 426);
	return upgradeWebSocket(
		(socket) => attachNotifications(socket, account, c.req.raw.headers),
		{ maxPayload: 1024 },
	);
});
const authHttpHandler = await createAuthHttpHandler(auth, db, ENV);
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
	c.header("Cache-Control", "no-store");
	return authHttpHandler(c.req.raw, clientIp(c));
});

app.use("/*", async (c, next) => {
	if (
		c.req.path.startsWith("/rpc/") ||
		c.req.path.startsWith("/api-reference/")
	) {
		c.header("Cache-Control", "no-store");
		if (c.req.path === "/rpc/flashscore/browse") {
			const browseRate = await apiRateLimit(`browse:${clientIp(c)}`, {
				window: 60,
				max: 60,
			});
			if (!browseRate.allowed) {
				c.header("Retry-After", String(browseRate.retryAfter));
				return c.json(
					{ message: "Too many price checks. Please try again shortly." },
					429,
				);
			}
		}
		const rate = await apiRateLimit(`api:${clientIp(c)}`, {
			window: 60,
			max: 300,
		});
		if (!rate.allowed) {
			c.header("Retry-After", String(rate.retryAfter));
			return c.json(
				{ message: "Too many requests. Please try again later." },
				429,
			);
		}
		if (
			c.req.method !== "GET" &&
			c.req.header("origin") !== new URL(ENV.CORS_ORIGIN).origin
		)
			return c.json({ message: "Invalid origin" }, 403);
	}
	await next();
});

// Daemon credentials are independent of user sessions and never reach the browser.
app.post("/internal/settle", async (c) => {
	c.header("Cache-Control", "no-store");
	if (!authorizedWorker(c.req.raw.headers, ENV.SETTLEMENT_WORKER_SECRET))
		return c.json({ message: "Unauthorized" }, 401);
	await bets.settlePending(5);
	return c.json({ ok: true });
});
app.get("/internal/settlement/daily", async (c) => {
	c.header("Cache-Control", "no-store");
	if (!authorizedWorker(c.req.raw.headers, ENV.CRON_SECRET))
		return c.json({ message: "Unauthorized" }, 401);
	return c.json(await runDailySettlement(db, bets));
});
app.get("/health/ready", async (c) => {
	c.header("Cache-Control", "no-store");
	try {
		const hello = await db.command({ hello: 1 }, { timeoutMS: 3000 });
		if (!hello.setName && hello.msg !== "isdbgrid")
			return c.json({ ok: false }, 503);
		return c.json({ ok: true });
	} catch {
		return c.json({ ok: false }, 503);
	}
});

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(
				"API request failed",
				error instanceof Error ? error.name : "UnknownError",
			);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(
				"API request failed",
				error instanceof Error ? error.name : "UnknownError",
			);
		}),
	],
});

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context: context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/api-reference",
		context: context,
	});

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

app.get("/", (c) => {
	return c.text("OK");
});

import { serve } from "@hono/node-server";

if (!onVercel) {
	const server = serve(
		{
			fetch: app.fetch,
			port: serverPort(process.env.PORT),
		},
		(info) => {
			console.log(`Server is running on http://localhost:${info.port}`);
		},
	);
	const { WebSocketServer } = await import("ws");
	const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
	server.on("upgrade", async (request, socket, head) => {
		try {
			if (request.url?.split("?")[0] !== "/api/notifications/ws") {
				socket.destroy();
				return;
			}
			const headers = new Headers();
			for (const [key, value] of Object.entries(request.headers))
				if (typeof value === "string" || Array.isArray(value))
					headers.set(key, Array.isArray(value) ? value.join(",") : value);
			const account = await notificationIdentity(
				headers,
				request.socket.remoteAddress ?? "unknown",
			);
			if (!account) {
				socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
				socket.destroy();
				return;
			}
			wss.handleUpgrade(request, socket, head, (ws) =>
				attachNotifications(ws, account, headers),
			);
		} catch {
			socket.destroy();
		}
	});
}

export default app;
