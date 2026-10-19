"use client";

import type { OriginalGameId } from "@gold-bet-clean-money365/api/original-games";
import { originalGames } from "@gold-bet-clean-money365/api/original-games";
import type { TableProps } from "@gold-bet-clean-money365/casino-core";
import {
	ActionButton,
	Card,
	Dice,
} from "@gold-bet-clean-money365/casino-core/ui";
import { useI18n } from "@gold-bet-clean-money365/i18n";
import { MotionConfig, motion } from "motion/react";
import "./original-tables.css";

const signs: Record<string, string> = {
	rock: "✊",
	paper: "✋",
	scissors: "✌",
};
const payouts: Record<OriginalGameId, [string, string][]> = {
	"scratch-nine": [["Three matching symbols", "1× / 2× / 5× / 10× / 20×"]],
	"poker-dice": [
		["Five of a kind", "50×"],
		["Four of a kind", "10×"],
		["Full house", "4×"],
		["Straight", "4×"],
		["Three of a kind", "1.5×"],
		["Two pairs", "1×"],
	],
	"three-card": [
		["Straight flush", "41×"],
		["Three of a kind", "31×"],
		["Straight", "7×"],
		["Flush", "4×"],
		["Pair", "2×"],
	],
	"hand-duel": [
		["Win", "1.94×"],
		["Tie", "1×"],
		["Loss", "0×"],
	],
	"lucky-seven": [
		["Under 7", "2.35×"],
		["Exactly 7", "5.88×"],
		["Over 7", "2.35×"],
	],
};
function OriginalTable({ id, ...p }: TableProps & { id: OriginalGameId }) {
	const { t } = useI18n();
	const game = originalGames.find((game) => game.id === id);
	if (!game) return null;
	const symbols = p.outcome?.symbols;
	const choices: Record<string, string> = {
		rock: "Rock",
		paper: "Paper",
		scissors: "Scissors",
		under: "Under 7",
		seven: "Exactly 7",
		over: "Over 7",
	};
	return (
		<MotionConfig reducedMotion="user">
			<div className={`original-table original-${id}`}>
				<header>
					<span>GOLDBET365 / {t("ORIGINAL")}</span>
					<h2>{t(game.name)}</h2>
					<p>
						{t("Total returns include your stake. Each round is independent.")}
					</p>
				</header>
				<div
					className={`original-board ${p.busy ? "original-pending" : ""}`}
					aria-busy={p.busy}
				>
					{id === "scratch-nine" && (
						<div className="scratch-grid">
							{Array.from({ length: 9 }, (_, index) => (
								<motion.div
									key={`${index}-${symbols?.join("") ?? "ready"}`}
									className={`scratch-cell ${symbols?.[index]?.includes("×") ? "prize-cell" : ""}`}
									initial={{ opacity: 0.4, scale: 0.92 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										delay: p.outcome ? index * 0.035 : 0,
										duration: 0.2,
									}}
								>
									<span>{p.busy ? "✦" : (symbols?.[index] ?? "G")}</span>
								</motion.div>
							))}
						</div>
					)}
					{(id === "poker-dice" || id === "lucky-seven") && (
						<>
							<div className="original-dice">
								{Array.from(
									{ length: id === "poker-dice" ? 5 : 2 },
									(_, index) => (
										<motion.div
											key={`${index}-${symbols?.join("") ?? "ready"}`}
											animate={{ rotate: p.busy ? [0, 12, -12, 0] : 0 }}
											transition={{
												duration: 0.5,
												repeat: p.busy ? Number.POSITIVE_INFINITY : 0,
											}}
										>
											<Dice
												value={Number(symbols?.[index] ?? (index % 6) + 1)}
											/>
										</motion.div>
									),
								)}
							</div>
							{id === "lucky-seven" && (
								<div className="seven-total">
									<span>{t("Total")}</span>
									<strong>{p.busy ? "…" : (p.outcome?.detail ?? "—")}</strong>
								</div>
							)}
						</>
					)}
					{id === "three-card" && (
						<div className="original-cards">
							{Array.from({ length: 3 }, (_, index) => (
								<motion.div
									key={`${index}-${symbols?.join("") ?? "ready"}`}
									initial={{ opacity: 0.5, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: index * 0.06 }}
								>
									<Card
										value={p.busy ? "hidden" : (symbols?.[index] ?? "hidden")}
									/>
								</motion.div>
							))}
						</div>
					)}
					{id === "hand-duel" && (
						<div className="duel-arena">
							<div>
								<span>{t("Your hand")}</span>
								<b>{signs[p.busy ? p.choice : (symbols?.[0] ?? p.choice)]}</b>
							</div>
							<span className="duel-versus">VS</span>
							<div>
								<span>{t("Opponent")}</span>
								<b>
									{p.busy ? "…" : symbols ? signs[symbols[1] ?? "rock"] : "?"}
								</b>
							</div>
						</div>
					)}
				</div>
				{game.choices.length > 1 && (
					<div className="original-choices">
						{game.choices.map((choice) => (
							<button
								key={choice}
								type="button"
								disabled={p.disabled}
								aria-pressed={p.choice === choice}
								onClick={() => p.onChoice(choice)}
							>
								{id === "hand-duel" && (
									<span aria-hidden="true">{signs[choice]}</span>
								)}
								{t(choices[choice] ?? choice)}
							</button>
						))}
					</div>
				)}
				<p className="original-result" role="status" aria-live="polite">
					{p.busy
						? t("Resolving your round…")
						: p.outcome
							? id === "lucky-seven"
								? `${t("Total")}: ${p.outcome.detail}`
								: t(p.outcome.detail)
							: t("Choose your stake, then play when ready.")}
				</p>
				<ActionButton onClick={p.onStart} disabled={p.disabled}>
					{t(p.busy ? "Resolving your round…" : game.action)}
				</ActionButton>
				<details className="original-paytable">
					<summary>{t("Payout table")}</summary>
					<p>
						{t("Total returns include your stake. Each round is independent.")}
					</p>
					<dl>
						{payouts[id].map(([name, payout]) => (
							<div key={name}>
								<dt>{t(name)}</dt>
								<dd>{payout}</dd>
							</div>
						))}
					</dl>
				</details>
			</div>
		</MotionConfig>
	);
}
export const ScratchTable = (p: TableProps) => (
	<OriginalTable id="scratch-nine" {...p} />
);
export const PokerDiceTable = (p: TableProps) => (
	<OriginalTable id="poker-dice" {...p} />
);
export const HandDuelTable = (p: TableProps) => (
	<OriginalTable id="hand-duel" {...p} />
);
export const LuckySevenTable = (p: TableProps) => (
	<OriginalTable id="lucky-seven" {...p} />
);
export const ThreeCardTable = (p: TableProps) => (
	<OriginalTable id="three-card" {...p} />
);
