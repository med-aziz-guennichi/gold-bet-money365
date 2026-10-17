import type {
	CasinoOutcome,
	TableProps,
} from "@gold-bet-clean-money365/casino-core";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { formatPlayCredits } from "@/lib/play-credits";
import "./round-feedback.css";

import { roundSummary } from "@/lib/round-summary";

/** A persistent result receipt, not a toast that disappears before it can be read. */
export function RoundFeedback({
	outcome,
	stakeMillimes,
	busy,
	phase,
	error,
}: {
	outcome: CasinoOutcome | null;
	stakeMillimes: number;
	busy: boolean;
	phase: TableProps["phase"];
	error?: string;
}) {
	const summary = outcome ? roundSummary(stakeMillimes, outcome) : null;
	return (
		<div
			className={`round-feedback ${busy ? "working" : (summary?.tone ?? "idle")}`}
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			{error ? (
				<>
					<strong>
						<LocalizedText text="Action needs attention" />
					</strong>
					<p>
						<LocalizedText text={error} />
					</p>
				</>
			) : busy ? (
				<>
					<strong>
						<span className="round-feedback-dot" aria-hidden="true" />
						<LocalizedText text="Checking your round…" />
					</strong>
					<p>
						<LocalizedText text="Please wait for confirmation. Your credits are protected from duplicate requests." />
					</p>
				</>
			) : outcome && summary ? (
				<>
					<strong>
						<span aria-hidden="true">
							{summary.tone === "win"
								? "✓"
								: summary.tone === "push"
									? "↔"
									: "−"}
						</span>
						<LocalizedText text={summary.title} />
					</strong>
					<p>
						<LocalizedText text={outcome.detail} />
					</p>
					<div className="round-feedback-totals">
						<span>
							<LocalizedText text="Credits played" />
							<b>{formatPlayCredits(stakeMillimes)}</b>
						</span>
						<span>
							<LocalizedText text="Credits returned" />
							<b>{formatPlayCredits(summary.returned)}</b>
						</span>
						<span>
							<LocalizedText text="Net change" />
							<b>
								{summary.net > 0 ? "+" : ""}
								{formatPlayCredits(summary.net)}
							</b>
						</span>
					</div>
				</>
			) : (
				<>
					<strong>
						<LocalizedText
							text={
								phase === "active"
									? "Your round is active"
									: "Ready when you are."
							}
						/>
					</strong>
					<p>
						<LocalizedText
							text={
								phase === "active"
									? "Choose your next move or collect when available."
									: "Choose your options, then start a round. Results stay here until your next round."
							}
						/>
					</p>
				</>
			)}
		</div>
	);
}
