import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDb } from "@gold-bet-clean-money365/db";
import { WebSocket, WebSocketServer } from "ws";
import { notificationRealtime } from "./notification-realtime";

test("committed notifications cross WebSockets only to their recipient", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
	timeout: 15000,
}, async () => {
	const connection = await createDb({
		DATABASE_URL:
			process.env.AUTH_TEST_DATABASE_URL ??
			"mongodb://127.0.0.1:27017/?replicaSet=goldbet-wallets",
	});
	const db = connection.client.db(
		`goldbet_socket_test_${randomUUID().replaceAll("-", "")}`,
	);
	const server = createServer();
	const wss = new WebSocketServer({ server });
	const connect = notificationRealtime(db);
	wss.on("connection", (socket, request) =>
		connect(
			socket,
			{ id: request.url === "/one" ? "one" : "two", role: "admin" },
			async () => true,
			async () => {},
		),
	);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	assert.ok(address && typeof address !== "string");
	const first = new WebSocket(`ws://127.0.0.1:${address.port}/one`);
	const second = new WebSocket(`ws://127.0.0.1:${address.port}/two`);
	const seenOne: string[] = [];
	const seenTwo: string[] = [];
	first.on("message", (data) => seenOne.push(String(data)));
	second.on("message", (data) => seenTwo.push(String(data)));
	try {
		await Promise.all([once(first, "open"), once(second, "open")]);
		// The ready frame after the MongoDB cursor opens closes the watch/snapshot gap.
		const waitFor = async (predicate: () => boolean) => {
			for (let i = 0; i < 100 && !predicate(); i++)
				await new Promise((resolve) => setTimeout(resolve, 50));
			assert.ok(predicate());
		};
		await waitFor(() => seenOne.filter((x) => x.includes("ready")).length >= 2);
		const session = db.client.startSession();
		try {
			await session.withTransaction(async () => {
				await db
					.collection("notification")
					.insertOne({ userId: "one", title: "private test" }, { session });
			});
		} finally {
			await session.endSession();
		}
		await waitFor(() =>
			seenOne.some((x) => x.includes("notifications.changed")),
		);
		assert.equal(
			seenTwo.some((x) => x.includes("notifications.changed")),
			false,
		);
		assert.equal(
			seenOne.some((x) => x.includes("private test")),
			false,
		);
		first.send("unauthorized publish");
		await once(first, "close");
		assert.equal(first.readyState, WebSocket.CLOSED);
	} finally {
		first.terminate();
		second.terminate();
		for (const socket of wss.clients) socket.terminate();
		await new Promise<void>((resolve) => wss.close(() => resolve()));
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await db.dropDatabase();
		await connection.client.close();
	}
});
