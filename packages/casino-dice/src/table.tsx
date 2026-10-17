import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
import { MotionConfig, motion } from "motion/react";
import "@gold-bet-clean-money365/casino-core/arcade.css";
import "./styles.css";
export function Table(p: TableProps) {
	return (
		<MotionConfig reducedMotion="user">
			<div className="new-game new-dice">
				<h2>Neon Dice</h2>
				<p className="subtitle">Roll from 00 to 99. Pick your side.</p>
				<motion.div
					className="new-hero-symbol"
					animate={{ rotate: p.busy ? [0, -8, 8, 0] : 0 }}
					transition={{
						duration: 0.3,
						repeat: p.busy ? Number.POSITIVE_INFINITY : 0,
					}}
				>
					{p.busy ? "··" : (p.outcome?.symbols[0] ?? "00")}
				</motion.div>
				<div className="new-game-choices">
					{["under", "over"].map((c) => (
						<button
							type="button"
							key={c}
							disabled={p.disabled}
							aria-pressed={p.choice === c}
							onClick={() => p.onChoice(c)}
						>
							{c === "under" ? "Under 50" : "50 or over"}
						</button>
					))}
				</div>
				<p className="new-game-status">
					{p.busy
						? "Rolling your result…"
						: "50% chance · 1.96× return on a match"}
				</p>
				<ActionButton disabled={p.disabled} onClick={p.onStart}>
					{p.busy ? "Rolling…" : "Roll dice"}
				</ActionButton>
			</div>
		</MotionConfig>
	);
}
