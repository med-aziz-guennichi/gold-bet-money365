import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
import {
	animate,
	MotionConfig,
	motion,
	useAnimationFrame,
	useMotionValue,
	useReducedMotion,
} from "motion/react";
import { useEffect, useState } from "react";
import { wheelReturns } from "./engine";
import "@gold-bet-clean-money365/casino-core/arcade.css";
import "./styles.css";
export function Table(p: TableProps) {
	const rotation = useMotionValue(0);
	const reduced = useReducedMotion();
	const [settling, setSettling] = useState(false);
	const sector = p.outcome?.path?.[0];
	useAnimationFrame((_, delta) => {
		if (p.busy && !reduced)
			rotation.set(rotation.get() + Math.min(delta, 50) * 0.36);
	});
	useEffect(() => {
		if (p.busy || sector === undefined) {
			setSettling(false);
			return;
		}
		const offset = sector * 18 + 9;
		const target =
			Math.ceil((rotation.get() + offset) / 360) * 360 - offset + 360;
		if (reduced) {
			rotation.set(target);
			setSettling(false);
			return;
		}
		setSettling(true);
		const control = animate(rotation, target, {
			duration: 0.9,
			ease: [0.18, 0.72, 0.2, 1],
			onComplete: () => setSettling(false),
		});
		return () => control.stop();
	}, [p.busy, sector, reduced, rotation]);
	return (
		<MotionConfig reducedMotion="user">
			<div className="new-game new-wheel-game">
				<h2>Aurora Wheel</h2>
				<p className="subtitle">Twenty equal sectors. One golden pointer.</p>
				<div className="new-wheel-wrap">
					<span className="new-wheel-pointer" />
					<motion.div className="new-wheel" style={{ rotate: rotation }}>
						{wheelReturns.map((pay, i) => (
							<span
								key={i}
								className="new-wheel-sector"
								style={{ transform: `rotate(${i * 18 + 9}deg)` }}
							>
								<i>{pay / 100}×</i>
							</span>
						))}
					</motion.div>
					<b className="new-wheel-center">
						{p.busy || settling ? "G" : (p.outcome?.symbols[0] ?? "G")}
					</b>
				</div>
				<div className="new-wheel-legend">
					<span>0× · 10 sectors</span>
					<span>1× · 6</span>
					<span>2× · 3</span>
					<span>6× · 1</span>
				</div>
				<p className="new-game-status">
					{p.busy
						? "Wheel in motion…"
						: settling
							? "Landing on your result…"
							: (p.outcome?.detail ?? "Each sector has a 1 in 20 chance")}
				</p>
				<ActionButton disabled={p.disabled || settling} onClick={p.onStart}>
					{p.busy ? "Spinning…" : settling ? "Landing…" : "Spin wheel"}
				</ActionButton>
			</div>
		</MotionConfig>
	);
}
