import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";

const labels = ["CHERRY", "LEMON", "GRAPE", "ORANGE", "BELL", "GEM"];
const old = ["🍒", "🍋", "🍇", "🍊", "🔔", "💎"];
function ReelSymbol({ n }: { n: number }) {
	return (
		<svg
			viewBox="0 0 100 100"
			className={`reel-symbol symbol-${n}`}
			aria-label={labels[n]}
		>
			{n === 5 ? (
				<>
					<path d="M20 30 35 15H65L80 30 50 85Z" />
					<path
						d="m20 30 30 55 30-55M35 15 50 30 65 15M20 30H80"
						className="symbol-line"
					/>
				</>
			) : n === 4 ? (
				<>
					<path d="M25 65 30 40Q30 15 50 15Q70 15 70 40L75 65Z" />
					<ellipse cx="50" cy="72" rx="29" ry="8" />
					<circle cx="50" cy="85" r="6" />
				</>
			) : n === 0 ? (
				<>
					<circle cx="30" cy="64" r="20" />
					<circle cx="69" cy="69" r="19" />
					<path
						d="M30 45Q30 12 60 13Q72 25 69 50M60 13Q45 5 35 16"
						className="symbol-line"
					/>
				</>
			) : n === 2 ? (
				[
					[35, 30],
					[60, 30],
					[25, 50],
					[50, 50],
					[75, 50],
					[38, 70],
					[63, 70],
					[50, 88],
				].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="13" />)
			) : (
				<>
					<ellipse
						cx="50"
						cy="53"
						rx={n === 1 ? "34" : "32"}
						ry={n === 1 ? "27" : "34"}
						transform={n === 1 ? "rotate(-30 50 53)" : ""}
					/>
					<path d="M50 19Q65 4 78 15" className="symbol-line" />
				</>
			)}
		</svg>
	);
}
export function Table(p: TableProps) {
	const values = p.outcome?.symbols.map((s) => old.indexOf(s)) ?? [];
	return (
		<div className="slots-room">
			<div className="slot-marquee">
				<small>GOLDBET365 ORIGINALS</small>
				<h3>
					<LocalizedText text="GOLDEN ORCHARD" />
				</h3>
				<span>
					<LocalizedText text="3 REELS · ONE PAYLINE · UP TO 30×" />
				</span>
			</div>
			<div className={`slot-cabinet ${p.busy ? "spinning" : ""}`}>
				<div className="payline-arrow">▶</div>
				{[0, 1, 2].map((reel) => (
					<div key={reel} className="reel-window">
						<div
							className="reel-strip"
							style={{ animationDelay: `${reel * 120}ms` }}
						>
							{[0, 1, 2].map((row) => (
								<div key={row} className={row === 1 ? "payline-cell" : ""}>
									<ReelSymbol
										n={
											row === 1 ? (values[reel] ?? reel) : (reel + row + 3) % 6
										}
									/>
								</div>
							))}
						</div>
					</div>
				))}
				<div className="payline-arrow">◀</div>
			</div>
			<div className="slot-paytable">
				<span>
					{" "}
					<LocalizedText text="CHERRIES ×3" /> <b>30×</b>
				</span>
				<span>
					{" "}
					<LocalizedText text="OTHER TRIPLES" /> <b>18×</b>
				</span>
				<span>
					{" "}
					<LocalizedText text="ONE PAIR" /> <b>1×</b>
				</span>
			</div>
			<ActionButton onClick={p.onStart} disabled={p.disabled}>
				{" "}
				<LocalizedText text="Spin reels" />{" "}
			</ActionButton>
		</div>
	);
}
