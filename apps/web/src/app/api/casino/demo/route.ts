import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { safeDemoUrl } from "@/lib/casino-demo";

const input = z.object({
	game: z.enum([
		"goal-jet",
		"mines",
		"spin-bottle",
		"magic-ball",
		"dice",
		"lucky-wheel",
		"under-over-7",
		"nova-drop",
		"twin-wheels",
		"prize-drum",
		"gem-rush",
		"chilli-sevens",
		"big-top-coins",
		"prism-sevens",
	]),
});
// Best-effort instance protection for a public, play-money-only launcher.
// The provider additionally enforces its own request budget.
const attempts = new Map<string, number>();
export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (!origin || origin !== new URL(request.url).origin)
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	if (Number(request.headers.get("content-length") ?? 0) > 256)
		return NextResponse.json({ error: "Invalid request" }, { status: 413 });
	const now = Date.now();
	for (const [key, expiry] of attempts) if (expiry <= now) attempts.delete(key);
	if (attempts.size >= 1000)
		return NextResponse.json({ error: "Please retry later" }, { status: 429 });
	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
	if ((attempts.get(ip) ?? 0) > now)
		return NextResponse.json(
			{ error: "Please retry later" },
			{ status: 429, headers: { "Retry-After": "3" } },
		);
	attempts.set(ip, now + 3000);
	try {
		const body = await request.text();
		if (body.length > 256)
			return NextResponse.json({ error: "Invalid request" }, { status: 413 });
		let json: unknown;
		try {
			json = JSON.parse(body);
		} catch {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}
		const parsed = input.safeParse(json);
		if (!parsed.success)
			return NextResponse.json({ error: "Invalid game" }, { status: 400 });
		const upstream = await fetch(
			"https://api.casinoapipro.com/v1/public/demo/session",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					game: parsed.data.game,
					visitor_id: randomUUID(),
				}),
				signal: AbortSignal.timeout(10000),
				cache: "no-store",
				redirect: "error",
			},
		);
		if (!upstream.ok) throw new Error("Provider unavailable");
		const result = z
			.object({ launch_url: z.url() })
			.parse(await upstream.json());
		const url = safeDemoUrl(result.launch_url);
		if (!url) throw new Error("Invalid launch URL");
		return NextResponse.json(
			{ launch_url: url },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch {
		return NextResponse.json(
			{ error: "Demo unavailable" },
			{ status: 502, headers: { "Cache-Control": "no-store" } },
		);
	}
}
