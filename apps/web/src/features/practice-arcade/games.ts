export const arcadeGames = [
	{
		id: "crash",
		name: "Orbit Crash",
		icon: "↗",
		color: "#a78bfa",
		description: "Ride the curve. Choose your moment.",
		rules:
			"The multiplier grows until a random crash. Collect before it stops. Each round is independent.",
	},
	{
		id: "plinko",
		name: "Golden Plinko",
		icon: "◉",
		color: "#f4c96b",
		description: "One drop. A whole world of possibilities.",
		rules:
			"A ball takes eight independent left or right steps. Its final pocket determines your practice point return.",
	},
	{
		id: "mines",
		name: "Gem Garden",
		icon: "◆",
		color: "#53e0bd",
		description: "Find the gems. Leave the danger behind.",
		rules:
			"Three mines are hidden among 25 tiles. Reveal gems to grow your multiplier; collect at any time after finding a gem.",
	},
	{
		id: "dino",
		name: "Dino Dash",
		icon: "🦖",
		color: "#fb9475",
		description: "A little courage. One more jump.",
		rules:
			"Choose Jump to attempt the next obstacle, with an independent 80% success chance. Each success multiplies the return by 1.2. Collect before a collision.",
	},
] as const;
export type ArcadeId = (typeof arcadeGames)[number]["id"];
export const pockets = [12, 4, 1.5, 0.5, 0.3, 0.5, 1.5, 4, 12];
export function randomInt(max: number) {
	if (!Number.isInteger(max) || max < 1 || max > 4294967296)
		throw new Error("Invalid random range");
	const cutoff = Math.floor(4294967296 / max) * max;
	const value = new Uint32Array(1);
	do {
		crypto.getRandomValues(value);
	} while (value[0]! >= cutoff);
	return value[0]! % max;
}
export function makeMines(random = randomInt) {
	const cells = Array.from({ length: 25 }, (_, i) => i);
	for (let i = 24; i > 0; i--) {
		const j = random(i + 1);
		[cells[i], cells[j]] = [cells[j]!, cells[i]!];
	}
	return cells.slice(0, 3);
}
export function mineMultiplier(count: number) {
	let multiplier = 0.97;
	for (let i = 0; i < count; i++) multiplier *= (25 - i) / (22 - i);
	return Math.floor(multiplier * 100) / 100;
}
export function crashPoint(random = randomInt) {
	return Math.min(
		50,
		Math.max(1, Math.floor(97000000 / (1000000 - random(1000000))) / 100),
	);
}
