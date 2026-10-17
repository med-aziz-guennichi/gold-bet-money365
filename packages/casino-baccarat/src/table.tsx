import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import {
	ActionButton,
	BetZone,
	Card,
} from "@gold-bet-clean-money365/casino-core/ui";
export function Table(p: TableProps) {
	const hands = p.outcome?.symbols.map((s) => s.split(" ")) ?? [
		["hidden", "hidden"],
		["hidden", "hidden"],
	];
	return (
		<div className={`baccarat-room ${p.busy ? "dealing" : ""}`}>
			<div className="baccarat-brand">
				{" "}
				<LocalizedText text="SALON" />{" "}
				<span>
					<LocalizedText text="BACCARAT" />
				</span>
			</div>
			<div className="baccarat-hands">
				{hands.map((hand, i) => (
					<div key={i}>
						<p className="table-overline">
							<LocalizedText text={i === 0 ? "PLAYER" : "BANKER"} />
						</p>
						<div className="hand">
							{hand.map((c, j) => (
								<Card key={j} value={c} />
							))}
						</div>
					</div>
				))}
			</div>
			<div className="baccarat-zones">
				{[
					["player", "PLAYER", "2×"],
					["tie", "TIE", "9×"],
					["banker", "BANKER", "1.95×"],
				].map(([choice, label, pay]) => (
					<BetZone
						key={choice}
						label={label!}
						payout={pay!}
						selected={p.choice === choice}
						disabled={p.disabled}
						onClick={() => p.onChoice(choice!)}
					/>
				))}
			</div>
			<p className="table-caption">
				{" "}
				<LocalizedText text="PLAYER & BANKER PUSH ON TIE · 5% BANKER COMMISSION" />{" "}
			</p>
			<ActionButton onClick={p.onStart} disabled={p.disabled}>
				{" "}
				<LocalizedText text="Deal baccarat" />{" "}
			</ActionButton>
		</div>
	);
}
