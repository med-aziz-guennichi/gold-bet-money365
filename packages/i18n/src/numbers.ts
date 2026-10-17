export function normalizeDigits(value: string) {
	return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) =>
		String(digit.charCodeAt(0) % 16),
	);
}
