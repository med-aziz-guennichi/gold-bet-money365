import assert from "node:assert/strict";
import { test } from "node:test";
import { googleConfig, measurementPage } from "./google-config";

test("missing or malformed identifiers never activate advertising", () => {
	assert.equal(googleConfig({ adsEnabled: "true" }).adsEnabled, false);
	assert.equal(
		googleConfig({
			analyticsId: "<script>",
			publisherId: "ca-pub-x",
			homeSlot: "123",
		}).analyticsId,
		undefined,
	);
	const values = {
		publisherId: "ca-pub-1234567890123456",
		homeSlot: "1234567890",
	};
	assert.equal(googleConfig(values).adsEnabled, false);
	assert.equal(
		googleConfig({ ...values, adsEnabled: "true" }).adsEnabled,
		true,
	);
});

test("measurement excludes private pages and strips resource identifiers", () => {
	for (const path of [
		"/dashboard",
		"/dashboard/bet-review",
		"/account",
		"/bets",
		"/casino/history",
		"/login",
		"/api/auth/get-session",
		"/?search=private",
		"/unknown",
	])
		assert.equal(measurementPage(path), null);
	assert.equal(measurementPage("/match/secret-id"), "/match/event");
	assert.equal(measurementPage("/casino/blackjack"), "/casino/game");
	assert.equal(measurementPage("/support"), "/support");
});
