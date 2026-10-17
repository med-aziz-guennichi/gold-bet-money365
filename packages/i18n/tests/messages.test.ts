import assert from "node:assert/strict";
import test from "node:test";
import additional from "../src/additional.json";
import { translate } from "../src/messages";
import { normalizeDigits } from "../src/numbers";

test("login and errors translate in Arabic and French", () => {
	for (const locale of ["fr", "ar"] as const)
		for (const text of [
			"Welcome back",
			"Phone number",
			"Password",
			"Signing in…",
			"Invalid phone number or password.",
			"Enter only your 8-digit phone number.",
		]) {
			assert.notEqual(translate(locale, text), text);
			if (locale === "ar")
				assert.match(translate(locale, text), /[\u0600-\u06ff]/);
		}
});
test("UI dictionary coverage matches and preserves unknown names", () => {
	assert.deepEqual(
		Object.keys(additional.fr).sort(),
		Object.keys(additional.ar).sort(),
	);
	for (const locale of ["fr", "ar"] as const)
		for (const [text, translated] of Object.entries(additional[locale])) {
			assert.ok(translated.trim());
			assert.equal(translate(locale, text), translated);
		}
	assert.equal(translate("ar", "Mohamed Aziz"), "Mohamed Aziz");
	assert.equal(translate("en", "Welcome back"), "Welcome back");
});
test("Arabic and Persian digits normalize without changing ASCII", () => {
	assert.equal(normalizeDigits("٩٢١٥٦٠٣٠"), "92156030");
	assert.equal(normalizeDigits("۹۲۱۵۶۰۳۰"), "92156030");
	assert.equal(normalizeDigits("+216 92156030"), "+216 92156030");
	assert.equal(normalizeDigits("٩2۱560٣0"), "92156030");
});
