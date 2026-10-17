import "./styles.css";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import { ActionButton } from "@gold-bet-clean-money365/casino-core/ui";
export function Table(p: TableProps) {
	const active = p.phase === "active";
	const revealed = p.view?.revealed ?? [];
	const mines = p.view?.mines ?? [];
	return (
		<div className="mines-room">
			<div className="mines-metrics">
				<span>
					<small>MINES</small>
					<b>03</b>
				</span>
				<span>
					<small>SAFE FOUND</small>
					<b>{revealed.filter((n) => !mines.includes(n)).length}</b>
				</span>
				<span>
					<small>NEXT RETURN</small>
					<b>{((p.view?.nextMultiplierHundredths ?? 110) / 100).toFixed(2)}×</b>
				</span>
			</div>
			<div className="minefield">
				{Array.from({ length: 25 }, (_, i) => {
					const mine = mines.includes(i);
					const open = revealed.includes(i) || mine;
					return (
						<button
							type="button"
							key={i}
							disabled={!active || p.busy || revealed.includes(i)}
							aria-label={`Tile ${i + 1}${open ? (mine ? " mine" : " diamond") : ""}`}
							className={`${open ? (mine ? "mine" : "diamond") : "covered"}`}
							onClick={() => p.onAction({ type: "reveal", index: i })}
						>
							{open ? (
								mine ? (
									<svg aria-hidden="true" viewBox="0 0 40 40">
										<circle cx="20" cy="22" r="12" />
										<path
											d="m24 11 3-6 6 3"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
										/>
									</svg>
								) : (
									<svg aria-hidden="true" viewBox="0 0 40 40">
										<path d="m7 12 8-7h10l8 7-13 23Z" />
										<path
											d="m7 12 13 23 13-23M7 12h26M15 5l5 7 5-7"
											fill="none"
											stroke="#b8fff4"
										/>
									</svg>
								)
							) : (
								<span>◆</span>
							)}
						</button>
					);
				})}
			</div>
			<div className="game-controls">
				{active ? (
					<ActionButton
						disabled={p.busy || !revealed.length}
						onClick={() => p.onAction({ type: "cashout" })}
					>
						Cash out {((p.view?.multiplierHundredths ?? 100) / 100).toFixed(2)}×
					</ActionButton>
				) : (
					<ActionButton disabled={p.disabled} onClick={p.onStart}>
						Enter the minefield
					</ActionButton>
				)}
			</div>
			<p className="table-caption">
				REVEAL DIAMONDS · AVOID 3 MINES · CASH OUT ANYTIME AFTER A SAFE TILE
			</p>
		</div>
	);
}
