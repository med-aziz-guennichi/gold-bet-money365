import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizedWorker, clientAddress, serverPort } from "./deployment";

test("forwarded IPs are trusted only on Vercel and must be a valid address", () => {
	const headers = new Headers({
		"x-forwarded-for": "192.0.2.9",
		"x-vercel-forwarded-for": "192.0.2.8",
	});
	assert.equal(clientAddress(headers, "127.0.0.1", false), "127.0.0.1");
	assert.equal(clientAddress(headers, "127.0.0.1", true), "192.0.2.8");
	headers.set("x-vercel-forwarded-for", "spoofed");
	assert.equal(clientAddress(headers, "127.0.0.1", true), "unknown");
});
test("settlement calls require the complete configured worker credential", () => {
	const secret = "test-worker-secret-".repeat(3);
	assert.equal(
		authorizedWorker(
			new Headers({ authorization: `Bearer ${secret}` }),
			secret,
		),
		true,
	);
	assert.equal(
		authorizedWorker(new Headers({ authorization: "Bearer wrong" }), secret),
		false,
	);
	assert.equal(authorizedWorker(new Headers(), undefined), false);
	assert.equal(
		authorizedWorker(new Headers({ authorization: "Bearer short" }), "short"),
		false,
	);
});
test("hosting ports are validated before opening a listener", () => {
	assert.equal(serverPort(undefined), 3000);
	assert.equal(serverPort("8080"), 8080);
	for (const value of ["0", "65536", "abc", "3.1"])
		assert.throws(() => serverPort(value));
});
