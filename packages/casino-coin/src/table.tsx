import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
import { MotionConfig, motion } from "motion/react";
import "@gold-bet-clean-money365/casino-core/arcade.css";
import "./styles.css";
export function Table(p: TableProps) {
	const face = p.outcome?.symbols[0];
	return (
		<MotionConfig reducedMotion="user">
			<div className="new-game new-coin">
				<h2>Golden Coin</h2>
				<p className="subtitle">Two sides. One clean flip.</p>
				<motion.div
					className="new-hero-symbol"
					aria-label={
						p.busy
							? "Flipping"
							: face === "H"
								? "Heads"
								: face === "T"
									? "Tails"
									: "Coin"
					}
					animate={{ rotateY: p.busy ? [0, 360] : 0 }}
					transition={{
						duration: 0.65,
						repeat: p.busy ? Number.POSITIVE_INFINITY : 0,
						ease: "linear",
					}}
				>
					{p.busy ? "G" : (face ?? "G")}
				</motion.div>
				<div className="new-game-choices">
					{["heads", "tails"].map((c) => (
						<button
							type="button"
							key={c}
							disabled={p.disabled}
							aria-pressed={p.choice === c}
							onClick={() => p.onChoice(c)}
						>
							{c === "heads" ? "Heads" : "Tails"}
						</button>
					))}
				</div>
				<p className="new-game-status">
					{p.busy
						? "Flipping your coin…"
						: `Selected: ${p.choice} · Correct choice returns 1.96×`}
				</p>
				<ActionButton onClick={p.onStart} disabled={p.disabled}>
					{p.busy ? "Flipping…" : "Flip coin"}
				</ActionButton>
			</div>
		</MotionConfig>
	);
}
