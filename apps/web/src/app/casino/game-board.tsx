import type {
	CasinoGameId,
	CasinoRound,
} from "@gold-bet-clean-money365/api/casino-catalog";

export function GameBoard({
	game,
	busy,
	result,
	numbers,
	choose,
	numberChoice,
}: {
	game: CasinoGameId;
	busy: boolean;
	result: CasinoRound | null;
	numbers: number[];
	choose: (n: number) => void;
	numberChoice: boolean;
}) {
	const symbols = result?.game === game ? result.outcome.symbols : null;
	if (game === "keno")
		return (
			<div className={`casino-board keno-board ${busy ? "is-playing" : ""}`}>
				<div className="keno-grid">
					{Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
						<button
							type="button"
							key={n}
							aria-pressed={numbers.includes(n)}
							disabled={busy}
							onClick={() => choose(n)}
							className={`${numbers.includes(n) ? "picked" : ""} ${symbols?.includes(String(n)) ? "drawn" : ""}`}
						>
							{n}
						</button>
					))}
				</div>
				<p>
					{symbols
						? `Drawn: ${symbols.join(" · ")}`
						: `${numbers.length}/3 selected`}
				</p>
			</div>
		);
	if (game === "plinko")
		return (
			<div className={`casino-board plinko-board ${busy ? "is-playing" : ""}`}>
				<div className="plinko-pegs" aria-hidden="true">
					{Array.from({ length: 8 }, (_, r) => (
						<div key={r}>
							{Array.from({ length: r + 3 }, (_, c) => (
								<i key={c} />
							))}
						</div>
					))}
					<span
						className="plinko-ball"
						style={{
							left: result?.outcome.path
								? `${10 + result.outcome.path.reduce((a, b) => a + b, 0) * 10}%`
								: "50%",
						}}
					/>
				</div>
				<div className="plinko-bins">
					{[16, 4, 1.5, 0.5, 0.2, 0.5, 1.5, 4, 16].map((x, i) => (
						<span
							key={i}
							className={
								result?.outcome.path &&
								result.outcome.path.reduce((a, b) => a + b, 0) === i
									? "lit"
									: ""
							}
						>
							{x}×
						</span>
					))}
				</div>
			</div>
		);
	if (game === "roulette" || game === "wheel")
		return (
			<div className={`casino-board ${busy ? "is-playing" : ""}`}>
				<div className={`casino-wheel ${game}`} aria-hidden="true">
					<div>
						{busy ? "✦" : (symbols?.[0] ?? (game === "roulette" ? "0" : "6×"))}
					</div>
				</div>
				{game === "roulette" && numberChoice && (
					<label className="roulette-number">
						Your number{" "}
						<select
							aria-label="Roulette number"
							value={numbers[0] ?? ""}
							onChange={(e) => choose(Number(e.target.value))}
							disabled={busy}
						>
							<option value="" disabled>
								Choose
							</option>
							{Array.from({ length: 37 }, (_, n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					</label>
				)}
			</div>
		);
	const card = game === "baccarat" || game === "dragon-tiger";
	const initial =
		game === "coin"
			? ["H"]
			: game === "slots"
				? ["🍒", "🍋", "💎"]
				: game === "sic-bo"
					? ["⚂", "⚄", "⚅"]
					: card
						? ["♠", "♥"]
						: ["50"];
	return (
		<div className={`casino-board ${game} ${busy ? "is-playing" : ""}`}>
			<div className={`casino-symbols ${card ? "playing-cards" : ""}`}>
				{(symbols ?? initial).map((s, i) => (
					<div key={i} className="casino-symbol">
						{busy ? (card ? "♠" : "✦") : s}
					</div>
				))}
			</div>
			{card && (
				<div className="casino-card-labels">
					<span>{game === "baccarat" ? "PLAYER" : "DRAGON"}</span>
					<span>{game === "baccarat" ? "BANKER" : "TIGER"}</span>
				</div>
			)}
		</div>
	);
}
