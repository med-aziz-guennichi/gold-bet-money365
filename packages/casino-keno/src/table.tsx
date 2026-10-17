import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
import { MotionConfig, motion } from "motion/react";
import "@gold-bet-clean-money365/casino-core/arcade.css";
import "./styles.css";
export function Table(p: TableProps) {
	const drawn = p.outcome?.symbols.map(Number) ?? [];
	const resultPicks = p.resultNumbers ?? p.numbers;
	return (
		<MotionConfig reducedMotion="user">
			<div className="new-game new-keno">
				<h2>Constellation Keno</h2>
				<p className="subtitle">Pick three stars. Five numbers light up.</p>
				<div className="new-keno-grid">
					{Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
						<motion.button
							type="button"
							key={n}
							whileTap={{ scale: 0.94 }}
							animate={{ scale: drawn.includes(n) ? [1, 1.08, 1] : 1 }}
							transition={{ duration: 0.35, delay: drawn.indexOf(n) * 0.08 }}
							disabled={
								p.disabled || (!p.numbers.includes(n) && p.numbers.length === 3)
							}
							aria-pressed={p.numbers.includes(n)}
							aria-label={`Number ${n}${drawn.includes(n) ? ", drawn" : ""}`}
							className={
								drawn.includes(n)
									? resultPicks.includes(n)
										? "hit"
										: "drawn"
									: ""
							}
							onClick={() => p.onNumber(n)}
						>
							{n}
						</motion.button>
					))}
				</div>
				<p className="new-game-status">
					{p.busy
						? "Drawing five numbers…"
						: `${p.numbers.length}/3 selected · Match 2: 3× · Match 3: 65×`}
				</p>
				<ActionButton
					disabled={p.disabled || p.numbers.length !== 3}
					onClick={p.onStart}
				>
					{p.busy
						? "Drawing…"
						: p.numbers.length === 3
							? "Draw numbers"
							: "Select 3 numbers to play"}
				</ActionButton>
			</div>
		</MotionConfig>
	);
}
