import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/** Only Vercel's platform-controlled header is trusted on its runtime. */
export function clientAddress(
	headers: Headers,
	peer: string,
	onVercel: boolean,
) {
	if (!onVercel) return peer;
	const value = headers.get("x-vercel-forwarded-for")?.trim() ?? "";
	return isIP(value) ? value : "unknown";
}

export function authorizedWorker(headers: Headers, secret: string | undefined) {
	if (!secret || secret.length < 32) return false;
	const provided = headers.get("authorization") ?? "";
	const hash = (value: string) => createHash("sha256").update(value).digest();
	return timingSafeEqual(hash(provided), hash(`Bearer ${secret}`));
}

export function serverPort(value: string | undefined) {
	const port = value === undefined ? 3000 : Number(value);
	if (!Number.isInteger(port) || port < 1 || port > 65535)
		throw new Error("PORT must be between 1 and 65535.");
	return port;
}
