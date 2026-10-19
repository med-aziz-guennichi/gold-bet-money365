import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "./route";

function request(body: string, ip: string, origin = "https://example.test") {
	return new Request("https://example.test/api/casino/demo", {
		method: "POST",
		headers: { origin, "x-forwarded-for": ip },
		body,
	});
}
test("rejects foreign origins and malformed or unknown game input", async () => {
	assert.equal(
		(await POST(request('{"game":"mines"}', "origin", "https://other.test")))
			.status,
		403,
	);
	assert.equal((await POST(request("invalid", "malformed"))).status, 400);
	assert.equal(
		(await POST(request('{"game":"unknown"}', "unknown"))).status,
		400,
	);
});
test("launches only validated provider URLs, without caching or forwarding identities", async () => {
	const original = globalThis.fetch;
	try {
		globalThis.fetch = async (_url, options) => {
			const body = JSON.parse(String(options?.body));
			assert.equal(body.game, "mines");
			assert.match(body.visitor_id, /^[a-f0-9-]{36}$/);
			assert.deepEqual(Object.keys(body).sort(), ["game", "visitor_id"]);
			return Response.json({
				launch_url: "https://games.casinoapipro.com/play?token=test",
			});
		};
		const response = await POST(request('{"game":"mines"}', "valid"));
		assert.equal(response.status, 200);
		assert.equal(response.headers.get("cache-control"), "no-store");
		assert.equal(
			(await POST(request('{"game":"mines"}', "valid"))).status,
			429,
		);
		globalThis.fetch = async () =>
			Response.json({ launch_url: "https://attacker.test/" });
		assert.equal(
			(await POST(request('{"game":"mines"}', "unsafe"))).status,
			502,
		);
	} finally {
		globalThis.fetch = original;
	}
});
