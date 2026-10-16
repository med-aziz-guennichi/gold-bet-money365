import type { AccountIdentity } from "@gold-bet-clean-money365/auth/access";
import type { NotificationDocument } from "@gold-bet-clean-money365/auth/notifications";
import type { Database } from "@gold-bet-clean-money365/db";
import type { WebSocket } from "ws";

/** MongoDB commits are the shared event bus across Vercel instances. */
export function notificationRealtime(db: Database) {
	const clients = new Map<WebSocket, string>();
	const lastRefresh = new Map<string, number>();
	let stream:
		| ReturnType<
				ReturnType<typeof db.collection<NotificationDocument>>["watch"]
		  >
		| undefined;
	function ensureStream() {
		if (stream) return;
		const current = db
			.collection<NotificationDocument>("notification")
			.watch([{ $match: { operationType: "insert" } }], {
				maxAwaitTimeMS: 1000,
			});
		stream = current;
		// Close the initial snapshot/watch race after MongoDB establishes its cursor.
		current.once("resumeTokenChanged", () => {
			for (const socket of clients.keys())
				if (socket.readyState === 1)
					socket.send('{"type":"notifications.ready"}');
		});
		current.on("change", (change) => {
			if (change.operationType !== "insert") return;
			for (const [socket, userId] of clients)
				if (userId === change.fullDocument.userId && socket.readyState === 1)
					socket.send('{"type":"notifications.changed"}');
		});
		current.on("error", () => {
			if (stream === current) stream = undefined;
			void current.close().catch(() => {});
			for (const socket of clients.keys())
				socket.close(1011, "Notification stream reconnecting");
		});
	}
	return function connect(
		socket: WebSocket,
		account: AccountIdentity,
		validate: () => Promise<boolean>,
		refreshResults: () => Promise<unknown>,
	) {
		if ([...clients.values()].filter((id) => id === account.id).length >= 3) {
			socket.close(1008, "Too many notification connections");
			return;
		}
		clients.set(socket, account.id);
		ensureStream();
		socket.send('{"type":"notifications.ready"}');
		let busy = false;
		let closed = false;
		const check = async () => {
			if (closed || busy) return;
			busy = true;
			try {
				if (!(await validate())) {
					socket.close(1008, "Session ended");
					return;
				}
				if (
					account.role === "user" &&
					(lastRefresh.get(account.id) ?? 0) < Date.now() - 29_000
				) {
					lastRefresh.set(account.id, Date.now());
					await refreshResults().catch(() => {});
				}
				if (socket.readyState === 1) socket.ping();
			} catch {
				socket.close(1011, "Notification connection needs to reconnect");
			} finally {
				busy = false;
			}
		};
		void check();
		const heartbeat = setInterval(() => void check(), 30_000);
		const deadline = setTimeout(
			() => socket.close(1000, "Refresh notification connection"),
			240_000,
		);
		const cleanup = () => {
			if (closed) return;
			closed = true;
			clearInterval(heartbeat);
			clearTimeout(deadline);
			clients.delete(socket);
			if (![...clients.values()].includes(account.id))
				lastRefresh.delete(account.id);
			if (!clients.size && stream) {
				const current = stream;
				stream = undefined;
				void current.close().catch(() => {});
			}
		};
		socket.on("close", cleanup);
		socket.on("error", cleanup);
		// This is a receive-only channel: clients cannot create notifications or join rooms.
		socket.on("message", () => socket.close(1008, "Receive-only connection"));
	};
}
