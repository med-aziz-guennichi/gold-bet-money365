import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton, BetZone } from "@gold-bet-clean-money365/casino-core/ui";

const pockets = [
	0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
	16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const reds = new Set([
	1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
export function Table(p: TableProps) {
	const value = Number(p.outcome?.symbols[0] ?? 0);
	const index = pockets.indexOf(value);
	return (
		<div className="roulette-room">
			<div className="roulette-apparatus">
				<svg
					viewBox="0 0 400 400"
					className={p.phase === "playing" ? "roulette-spinning" : ""}
					aria-label="European roulette wheel"
				>
					<defs>
						<radialGradient id="wood">
							<stop stopColor="#743d28" />
							<stop offset="1" stopColor="#251811" />
						</radialGradient>
					</defs>
					<circle
						cx="200"
						cy="200"
						r="196"
						fill="url(#wood)"
						stroke="#b78d4d"
						strokeWidth="5"
					/>
					<circle cx="200" cy="200" r="169" fill="#1c211d" />
					{pockets.map((n, i) => {
						const a = (i * 360) / 37;
						return (
							<g key={n} transform={`rotate(${a} 200 200)`}>
								<path
									d="M200 32 A168 168 0 0 1 228.4 34.4 L222 67 L200 65Z"
									fill={
										n === 0 ? "#1a7a5a" : reds.has(n) ? "#a52b32" : "#141a1b"
									}
									stroke="#d9bf7d"
									strokeWidth=".7"
								/>
								<text
									x="211"
									y="53"
									fill="#f8ead2"
									textAnchor="middle"
									fontSize="11"
									transform="rotate(5 211 53)"
								>
									{n}
								</text>
							</g>
						);
					})}
					<circle
						cx="200"
						cy="200"
						r="133"
						fill="url(#wood)"
						stroke="#b78d4d"
						strokeWidth="3"
					/>
					<circle cx="200" cy="200" r="74" fill="#bc985c" />
					<circle cx="200" cy="200" r="62" fill="#39271c" />
					<path d="M200 114V286M114 200H286" stroke="#c8a967" strokeWidth="8" />
					<circle cx="200" cy="200" r="17" fill="#edcf85" />
					<circle
						cx="213"
						cy="80"
						r="6"
						fill="ivory"
						transform={`rotate(${(index * 360) / 37} 200 200)`}
					/>
				</svg>
				<span className="roulette-result">
					{p.phase === "playing"
						? "SPINNING"
						: (p.outcome?.detail ?? "PLACE YOUR CHIP")}
				</span>
			</div>
			<div className="roulette-felt">
				<div className="roulette-grid">
					<button
						type="button"
						className={`zero ${p.numbers[0] === 0 && p.choice === "number" ? "selected" : ""}`}
						aria-pressed={p.numbers[0] === 0 && p.choice === "number"}
						onClick={() => {
							p.onChoice("number");
							p.onNumber(0);
						}}
						disabled={p.disabled}
					>
						0
					</button>
					{Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
						<button
							type="button"
							key={n}
							aria-pressed={p.choice === "number" && p.numbers[0] === n}
							style={{
								gridColumn: Math.floor((n - 1) / 3) + 2,
								gridRow: 3 - ((n - 1) % 3),
							}}
							className={`${reds.has(n) ? "red-pocket" : "black-pocket"} ${p.choice === "number" && p.numbers[0] === n ? "selected" : ""}`}
							disabled={p.disabled}
							onClick={() => {
								p.onChoice("number");
								p.onNumber(n);
							}}
						>
							{n}
						</button>
					))}
				</div>
				<div className="roulette-outside">
					{["red", "black", "odd", "even"].map((c) => (
						<BetZone
							key={c}
							label={c.toUpperCase()}
							payout="2×"
							selected={p.choice === c}
							disabled={p.disabled}
							onClick={() => p.onChoice(c)}
						/>
					))}
				</div>
				<p className="table-caption">
					{p.choice === "number"
						? `Straight up · ${p.numbers[0] ?? "choose a number"} · 36× return`
						: `${p.choice.toUpperCase()} · 2× return`}
				</p>
				<ActionButton
					onClick={p.onStart}
					disabled={p.disabled || (p.choice === "number" && !p.numbers.length)}
				>
					{" "}
					<LocalizedText text="Spin roulette" />{" "}
				</ActionButton>
			</div>
		</div>
	);
}
