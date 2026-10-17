import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import {
	ActionButton,
	BetZone,
	Dice,
} from "@gold-bet-clean-money365/casino-core/ui";
export function Table(p: TableProps) {
	const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
	const dice = p.outcome?.symbols.map((s) => faces.indexOf(s) + 1) ?? [3, 5, 2];
	return (
		<div className="sicbo-room">
			<div className={`dice-dome ${p.busy ? "shaking" : ""}`}>
				<div className="dome-glass" />
				<div className="dome-dice">
					{dice.map((n, i) => (
						<Dice key={i} value={n} />
					))}
				</div>
				<div className="dome-base">SIC BO</div>
			</div>
			<div className="sicbo-zones">
				<BetZone
					label="SMALL"
					payout="4–10 · 2×"
					selected={p.choice === "small"}
					disabled={p.disabled}
					onClick={() => p.onChoice("small")}
				/>
				<BetZone
					label="ANY TRIPLE"
					payout="31×"
					selected={p.choice === "triple"}
					disabled={p.disabled}
					onClick={() => p.onChoice("triple")}
				/>
				<BetZone
					label="BIG"
					payout="11–17 · 2×"
					selected={p.choice === "big"}
					disabled={p.disabled}
					onClick={() => p.onChoice("big")}
				/>
			</div>
			<p className="table-caption">
				THREE DICE · SMALL AND BIG LOSE ON TRIPLES
			</p>
			<ActionButton onClick={p.onStart} disabled={p.disabled}>
				Shake & reveal
			</ActionButton>
		</div>
	);
}
