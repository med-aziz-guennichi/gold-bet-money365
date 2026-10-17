import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
import { useEffect, useState } from "react";
export function Table(p: TableProps) {
	const [elapsed, setElapsed] = useState(0);
	const active = p.phase === "active";
	const started = p.view?.startedAt;
	const server = p.view?.serverTime;
	useEffect(() => {
		if (!active || !started || !server) {
			setElapsed(0);
			return;
		}
		const base = performance.now();
		const update = () =>
			setElapsed(server - started + performance.now() - base);
		update();
		const timer = setInterval(update, 50);
		return () => clearInterval(timer);
	}, [active, started, server]);
	const multiplier = active
		? Math.min(100, Math.exp(elapsed * 0.00013))
		: Number(p.outcome?.symbols[0]?.replace("×", "") ?? 1);
	const fraction = Math.min(
		0.94,
		Math.log(Math.max(multiplier, 1)) / Math.log(100),
	);
	const x = 70 + fraction * 660;
	const y = 340 - fraction * fraction * 270;
	return (
		<div
			className={`crash-room ${p.outcome?.multiplierHundredths === 0 ? "crashed" : ""}`}
		>
			<div className="flight-status">
				<span className={active ? "status-dot active" : "status-dot"} />
				{active ? "IN FLIGHT" : p.outcome ? p.outcome.detail : "MISSION READY"}
			</div>
			<div className="flight-chart">
				<svg viewBox="0 0 800 410" aria-hidden="true">
					<defs>
						<linearGradient id="flight-fill" x1="0" y1="0" x2="0" y2="1">
							<stop stopColor="#cfab59" stopOpacity=".4" />
							<stop offset="1" stopColor="#cfab59" stopOpacity="0" />
						</linearGradient>
					</defs>
					{[80, 160, 240, 320].map((n) => (
						<path key={n} d={`M40 ${n}H770`} className="chart-grid" />
					))}
					<path
						d={`M70 340 Q${x * 0.75} 340 ${x} ${y} L${x} 370H70Z`}
						fill="url(#flight-fill)"
					/>
					<path
						d={`M70 340 Q${x * 0.75} 340 ${x} ${y}`}
						className="flight-path"
					/>
					<g transform={`translate(${x},${y}) rotate(-35)`}>
						<path
							d="m-26 9 16-10-3-14 7 1 12 10 25 0-3 8-23 5-13 15-7-2 3-13Z"
							fill="#f1ce7a"
						/>
						<path d="M-26 10h-24" stroke="#f8b54e" strokeWidth="4" />
					</g>
				</svg>
				<div className="flight-multiplier">
					{multiplier.toFixed(2)}
					<small>×</small>
				</div>
				<div className="flight-axis">
					<span>0s</span>
					<span>10s</span>
					<span>20s</span>
					<span>30s</span>
				</div>
			</div>
			<div className="game-controls">
				{active ? (
					<ActionButton
						disabled={p.busy}
						onClick={() => p.onAction({ type: "cashout" })}
					>
						{p.busy ? "Confirming…" : `Cash out · ${multiplier.toFixed(2)}×`}
					</ActionButton>
				) : (
					<ActionButton disabled={p.disabled} onClick={p.onStart}>
						{" "}
						<LocalizedText text="Launch flight" />{" "}
					</ActionButton>
				)}
			</div>
			<p className="table-caption">
				{" "}
				<LocalizedText text="CASH-OUT USES SERVER PROCESSING TIME · WAIT FOR CONFIRMATION" />{" "}
			</p>
		</div>
	);
}
