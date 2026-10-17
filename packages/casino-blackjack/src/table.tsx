import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton, Card } from "@gold-bet-clean-money365/casino-core/ui";
import { total } from "./engine";

function score(cards: string[]) {
	return total(
		cards
			.filter((c) => c !== "hidden")
			.map((c) =>
				[
					"A",
					"2",
					"3",
					"4",
					"5",
					"6",
					"7",
					"8",
					"9",
					"10",
					"J",
					"Q",
					"K",
				].indexOf(c.slice(0, -1)),
			),
	);
}
export function Table(p: TableProps) {
	const active = p.phase === "active";
	const player = p.view?.cards ?? ["hidden", "hidden"];
	const dealer = p.view?.dealer ?? ["hidden", "hidden"];
	return (
		<div className="blackjack-room">
			<div className="shoe-stack" aria-hidden="true">
				<Card value="hidden" />
				<span>6 DECKS</span>
			</div>
			<p className="table-overline">DEALER</p>
			<div className="hand dealer-hand">
				{dealer.map((c, i) => (
					<Card key={i} value={c} />
				))}
			</div>
			<div className="blackjack-inscription">
				<strong>BLACKJACK PAYS 3 TO 2</strong>
				<span>Dealer stands on all 17s</span>
				<i />
			</div>
			<div className="hand player-hand">
				{player.map((c, i) => (
					<Card key={i} value={c} />
				))}
			</div>
			<p className="table-overline">
				YOUR HAND {p.view?.cards ? ` · ${score(player)}` : ""}
			</p>
			<div className="game-controls">
				{active ? (
					<>
						<ActionButton
							onClick={() => p.onAction({ type: "hit" })}
							disabled={p.busy}
						>
							Hit +
						</ActionButton>
						<ActionButton
							onClick={() => p.onAction({ type: "stand" })}
							disabled={p.busy}
							secondary
						>
							Stand
						</ActionButton>
					</>
				) : (
					<ActionButton onClick={p.onStart} disabled={p.disabled}>
						Deal a hand
					</ActionButton>
				)}
			</div>
		</div>
	);
}
