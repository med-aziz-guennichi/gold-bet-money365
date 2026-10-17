import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import {
	ActionButton,
	BetZone,
	Card,
} from "@gold-bet-clean-money365/casino-core/ui";
export function Table(p: TableProps) {
	return (
		<div className="dragon-room">
			<div className="dragon-duel">
				<div className="dragon-side">
					<span className="duel-emblem">龍</span>
					<h3>
						<LocalizedText text="DRAGON" />
					</h3>
					<Card value={p.outcome?.symbols[0] ?? "hidden"} />
				</div>
				<span className="duel-versus">
					<LocalizedText text="VS" />
				</span>
				<div className="tiger-side">
					<span className="duel-emblem">虎</span>
					<h3>
						<LocalizedText text="TIGER" />
					</h3>
					<Card value={p.outcome?.symbols[1] ?? "hidden"} />
				</div>
			</div>
			<div className="duel-zones">
				{["dragon", "tie", "tiger"].map((c) => (
					<BetZone
						key={c}
						label={c.toUpperCase()}
						payout={c === "tie" ? "12×" : "2×"}
						selected={p.choice === c}
						disabled={p.disabled}
						onClick={() => p.onChoice(c)}
					/>
				))}
			</div>
			<p className="table-caption">
				{" "}
				<LocalizedText text="HIGH CARD WINS · ACE LOW · HALF RETURN ON SIDE-BET TIES" />{" "}
			</p>
			<ActionButton onClick={p.onStart} disabled={p.disabled}>
				{" "}
				<LocalizedText text="Reveal the duel" />{" "}
			</ActionButton>
		</div>
	);
}
