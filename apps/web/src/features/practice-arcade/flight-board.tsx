"use client";

import type { CasinoOutcome } from "@gold-bet-clean-money365/casino-core";
import { useI18n } from "@gold-bet-clean-money365/i18n";

export function FlightBoard({
	active,
	multiplier,
	outcome,
}: {
	active: boolean;
	multiplier: number;
	outcome: CasinoOutcome | null;
}) {
	const { t } = useI18n();
	const crashed = !!outcome && outcome.multiplierHundredths === 0;
	const flightMultiplier = crashed
		? Number.parseFloat(outcome.symbols[0] ?? "1") || 1
		: multiplier;
	const progress = Math.min(
		1,
		Math.log(Math.max(1, flightMultiplier)) / Math.log(8),
	);
	const x = 42 + progress * 600;
	const y = 330 - progress * progress * 250;
	const curve = `M42 330 Q${42 + progress * 300} 330 ${x} ${y}`;
	return (
		<div
			className={`flight-board ${active ? "is-flying" : ""} ${crashed ? "is-crashed" : ""}`}
		>
			<div className="flight-board-brand">
				<b>ORBIT</b>
				<span>GOLDBET365 ORIGINAL</span>
			</div>
			<svg viewBox="0 0 720 390" aria-hidden="true" className="flight-chart">
				<defs>
					<linearGradient id="flight-fill" x1="0" y1="0" x2="0" y2="1">
						<stop stopColor="#e9bd62" stopOpacity=".24" />
						<stop offset="1" stopColor="#e9bd62" stopOpacity="0" />
					</linearGradient>
				</defs>
				{[100, 180, 260, 330].map((y) => (
					<path
						key={y}
						d={`M42 ${y} H690`}
						stroke="#ffffff0c"
						strokeDasharray="3 8"
					/>
				))}
				<path d="M42 50 V330 H690" fill="none" stroke="#ffffff25" />
				<path d={`${curve} L${x} 330 Z`} fill="url(#flight-fill)" />
				<path
					d={curve}
					stroke={crashed ? "#fa6969" : "#e9bd62"}
					strokeWidth="4"
					fill="none"
				/>
				{!crashed && (
					<g
						transform={`translate(${x} ${y}) rotate(${-progress * 22})`}
						className="flight-aircraft"
					>
						<path
							d="M-32 4 L-6 -2 L4 -22 L13 -22 L9 -2 L33 3 Q39 6 31 9 L8 10 L-1 24 L-9 24 L-7 10 L-28 10 L-36 18 L-41 16 Z"
							fill="#efc879"
							stroke="#fff0c3"
							strokeWidth="1.5"
						/>
					</g>
				)}
				<text x="42" y="357" fill="#8d929c" fontSize="11">
					1.00×
				</text>
				<text x="690" y="357" textAnchor="end" fill="#8d929c" fontSize="11">
					100.00× MAX
				</text>
			</svg>
			<div className="flight-readout">
				<span>
					{t(
						active
							? "Flight in progress"
							: crashed
								? "Flight ended"
								: outcome
									? "Cash-out confirmed"
									: "Ready for takeoff",
					)}
				</span>
				<strong dir="ltr">
					{crashed ? outcome.symbols[0] : `${multiplier.toFixed(2)}×`}
				</strong>
				<small>
					{t(
						active
							? "Collect before the flight ends"
							: crashed
								? "Round lost"
								: outcome
									? "Return added to your balance"
									: "Choose your stake, then start a flight",
					)}
				</small>
			</div>
			<div className="flight-caption">
				<span className="flight-dot" />
				{t("Individual round · play credits only")}
			</div>
		</div>
	);
}
