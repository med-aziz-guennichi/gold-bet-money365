import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton, Card } from "@gold-bet-clean-money365/casino-core/ui";
import { useEffect, useState } from "react";

const pays = [
	["ROYAL FLUSH", 800],
	["STRAIGHT FLUSH", 50],
	["FOUR OF A KIND", 25],
	["FULL HOUSE", 9],
	["FLUSH", 6],
	["STRAIGHT", 4],
	["THREE OF A KIND", 3],
	["TWO PAIRS", 2],
	["JACKS OR BETTER", 1],
] as const;
export function Table(p: TableProps) {
	const [holds, setHolds] = useState<number[]>([]);
	const active = p.phase === "active";
	const cards = p.view?.cards ?? Array.from({ length: 5 }, () => "hidden");
	const handKey = cards.join(",");
	useEffect(() => {
		if (handKey) setHolds([]);
	}, [handKey]);
	return (
		<div className="poker-room">
			<div className="poker-paytable">
				{pays.map(([name, pay]) => (
					<div
						key={name}
						className={p.outcome?.detail.toUpperCase() === name ? "lit" : ""}
					>
						<span>{name}</span>
						<b>{pay}×</b>
					</div>
				))}
			</div>
			<div className="poker-title">
				JACKS <small>OR</small> BETTER <span>9 / 6</span>
			</div>
			<div className="poker-hand">
				{cards.map((c, i) => (
					<Card
						key={i}
						value={c}
						held={holds.includes(i)}
						onClick={
							active && !p.busy
								? () =>
										setHolds((old) =>
											old.includes(i)
												? old.filter((n) => n !== i)
												: [...old, i],
										)
								: undefined
						}
					/>
				))}
			</div>
			<p className="table-caption">
				{active
					? "TAP CARDS TO HOLD · DRAW ONCE TO COMPLETE YOUR HAND"
					: "FIVE CARDS · ONE DRAW · YOUR DECISION"}
			</p>
			<ActionButton
				disabled={active ? p.busy : p.disabled}
				onClick={active ? () => p.onAction({ type: "draw", holds }) : p.onStart}
			>
				{active ? `Draw ${5 - holds.length} cards` : "Deal five cards"}
			</ActionButton>
		</div>
	);
}
