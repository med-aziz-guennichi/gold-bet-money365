import { setTimeout as delay } from "node:timers/promises";

const origin = new URL(process.env.BETTER_AUTH_URL ?? "");
const secret = process.env.SETTLEMENT_WORKER_SECRET ?? "";
if (origin.protocol !== "https:" || secret.length < 32) {
	throw new Error(
		"Set an HTTPS BETTER_AUTH_URL and a SETTLEMENT_WORKER_SECRET of at least 32 characters.",
	);
}
const shutdown = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"])
	process.on(signal, () => shutdown.abort());

// No overlapping requests. An interrupted or retried call cannot pay a bet twice.
while (!shutdown.signal.aborted) {
	try {
		const response = await fetch(new URL("/internal/settle", origin), {
			method: "POST",
			redirect: "error",
			headers: { authorization: `Bearer ${secret}` },
			signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(280_000)]),
		});
		if (!response.ok) console.error("Settlement tick failed", response.status);
		else console.info("Settlement tick completed");
		await response.body?.cancel();
	} catch {
		if (!shutdown.signal.aborted)
			console.error("Settlement service unavailable; retrying.");
	}
	try {
		await delay(30_000, undefined, { signal: shutdown.signal });
	} catch {
		/* Graceful shutdown also interrupts the idle wait. */
	}
}
