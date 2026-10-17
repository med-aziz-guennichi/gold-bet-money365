import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";

const pays = [16, 4, 1.5, 0.5, 0.2, 0.5, 1.5, 4, 16];
export function Table(p: TableProps) {
	const path = p.outcome?.path;
	const bin = path?.reduce((a, b) => a + b, 0);
	let column = 0;
	const points = [
		"250,25",
		...(path ?? []).map((step, row) => {
			column += step;
			return `${250 + (column - (row + 1) / 2) * 42},${60 + row * 34}`;
		}),
		...(bin === undefined ? [] : [`${72 + bin * 44},345`]),
	].join(" ");
	return (
		<div className="plinko-room">
			<div className="plinko-top">
				<span>8 ROWS</span>
				<strong>PLINKO</strong>
				<span>FIXED RISK</span>
			</div>
			<svg viewBox="0 0 500 390" aria-label="Plinko board">
				<defs>
					<radialGradient id="peg">
						<stop stopColor="#f6e5b2" />
						<stop offset="1" stopColor="#b68c41" />
					</radialGradient>
				</defs>
				{Array.from({ length: 8 }, (_, row) =>
					Array.from({ length: row + 3 }, (_, col) => (
						<circle
							key={`${row}:${col}`}
							cx={250 + (col - (row + 2) / 2) * 42}
							cy={60 + row * 34}
							r="4.5"
							fill="url(#peg)"
						/>
					)),
				)}
				{path && (
					<>
						<polyline
							points={points}
							fill="none"
							stroke="#d6b97455"
							strokeWidth="2"
						/>
						<circle r="9" fill="#f1d07c">
							<animateMotion
								dur="1.3s"
								fill="freeze"
								path={`M${points.replaceAll(" ", " L")}`}
							/>
						</circle>
					</>
				)}
				{!path && <circle cx="250" cy="25" r="9" fill="#f1d07c" />}
				{pays.map((pay, i) => (
					<g key={i}>
						<rect
							x={52 + i * 44}
							y="330"
							width="41"
							height="35"
							rx="5"
							fill={
								i === bin
									? "#f1d07c"
									: i === 0 || i === 8
										? "#a74936"
										: i === 1 || i === 7
											? "#976d37"
											: "#355a49"
							}
						/>
						<text
							x={72 + i * 44}
							y="352"
							fill={i === bin ? "#171e18" : "#f3e5c9"}
							textAnchor="middle"
							fontSize="12"
							fontWeight="700"
						>
							{pay}×
						</text>
					</g>
				))}
			</svg>
			<ActionButton onClick={p.onStart} disabled={p.disabled}>
				Drop a ball
			</ActionButton>
			<p className="table-caption">
				EIGHT INDEPENDENT LEFT / RIGHT STEPS · EVERY DROP IS A NEW ROUND
			</p>
		</div>
	);
}
