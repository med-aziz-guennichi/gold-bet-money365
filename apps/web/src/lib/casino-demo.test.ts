import assert from "node:assert/strict";
import { test } from "node:test";
import { safeDemoUrl } from "./casino-demo";

test("accepts only HTTPS launches on the provider game host", () => {
	assert.equal(
		safeDemoUrl("https://games.casinoapipro.com/play?token=example"),
		"https://games.casinoapipro.com/play?token=example",
	);
	for (const value of [
		null,
		{},
		"/play",
		"javascript:alert(1)",
		"http://games.casinoapipro.com/play",
		"https://games.casinoapipro.com.attacker.test/play",
		"https://attacker.test/play",
		"https://user:password@games.casinoapipro.com/play",
		"https://games.casinoapipro.com:8443/play",
	])
		assert.equal(safeDemoUrl(value), null);
});
