import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
import { MotionConfig, motion } from "motion/react";
import "@gold-bet-clean-money365/casino-core/arcade.css";
import "./styles.css";
export function Table(p: TableProps) {
	return (
		<MotionConfig reducedMotion="user">
			<div className="new-game new-limbo">
				<h2>Limbo Rise</h2>
				<p className="subtitle">Set your target. Watch the reveal.</p>
				<motion.div
					className="new-hero-symbol"
					animate={{ scale: p.busy ? [1, 1.025, 1] : 1 }}
					transition={{
						duration: 0.6,
						repeat: p.busy ? Number.POSITIVE_INFINITY : 0,
					}}
				>
					<div>
						<span className="limbo-target">
							{p.busy ? "REVEALING" : "LANDED MULTIPLIER"}
						</span>
						<div>{p.busy ? "···" : (p.outcome?.symbols[0] ?? "1.00×")}</div>
					</div>
				</motion.div>
				<div className="new-game-choices">
					{["2", "5", "10"].map((c) => (
						<button
							type="button"
							key={c}
							aria-pressed={p.choice === c}
							disabled={p.disabled}
							onClick={() => p.onChoice(c)}
						>
							{c}× target
						</button>
					))}
				</div>
				<p className="new-game-status">
					{p.busy
						? "Finding your multiplier…"
						: `Target ${p.choice}× · ${(97 / Number(p.choice)).toFixed(1)}% success chance`}
				</p>
				<ActionButton disabled={p.disabled} onClick={p.onStart}>
					{p.busy ? "Revealing…" : "Launch multiplier"}
				</ActionButton>
			</div>
		</MotionConfig>
	);
}
