export const game = {
	id: "crash",
	name: "Orbital Crash",
	icon: "↗",
	category: "Arcade",
	choices: ["play"],
	mode: "session",
	rules:
		"The multiplier climbs from 1×. Cash out before the server's hidden crash point. Point = floor(99,000,000 / (1,000,000 − U)) / 100, with U uniformly drawn from 0–999,999, capped at 100×. Points below 1× crash immediately. At 100× an uncrashed round cashes out automatically. Server processing time decides your cash-out return; a click or animation is not confirmation.",
	rtp: "99% before rounding and network timing",
	action: "Launch round",
} as const;
