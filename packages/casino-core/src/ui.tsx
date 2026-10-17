import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import type { ReactNode } from "react";
export function Card({
	value,
	held = false,
	onClick,
}: {
	value: string;
	held?: boolean;
	onClick?: () => void;
}) {
	const hidden = value === "hidden";
	const suit = value.slice(-1);
	const rank = value.slice(0, -1);
	const content = (
		<>
			<span className="card-corner">
				{rank}
				<small>{suit}</small>
			</span>
			<span className="card-pip">{suit}</span>
			<span className="card-corner bottom">
				{rank}
				<small>{suit}</small>
			</span>
		</>
	);
	return onClick ? (
		<button
			type="button"
			aria-label={`${held ? "Release" : "Hold"} ${value}`}
			aria-pressed={held}
			className={`studio-card ${held ? "held" : ""} ${"♥♦".includes(suit) ? "red" : ""}`}
			onClick={onClick}
		>
			{content}
			<b className="hold-label">
				<LocalizedText text={held ? "HELD" : "HOLD"} />
			</b>
		</button>
	) : (
		<div
			className={`studio-card ${hidden ? "back" : ""} ${"♥♦".includes(suit) ? "red" : ""}`}
		>
			{hidden ? <span className="card-monogram">G</span> : content}
		</div>
	);
}
export function Dice({ value }: { value: number }) {
	const dots: Record<number, number[]> = {
		1: [4],
		2: [0, 8],
		3: [0, 4, 8],
		4: [0, 2, 6, 8],
		5: [0, 2, 4, 6, 8],
		6: [0, 2, 3, 5, 6, 8],
	};
	return (
		<div role="img" className="studio-die" aria-label={`Die ${value}`}>
			{Array.from({ length: 9 }, (_, i) => (
				<i key={i} className={dots[value]?.includes(i) ? "visible" : ""} />
			))}
		</div>
	);
}
export function ActionButton({
	children,
	onClick,
	disabled = false,
	secondary = false,
}: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
	secondary?: boolean;
}) {
	return (
		<button
			type="button"
			className={`studio-action ${secondary ? "secondary" : ""}`}
			disabled={disabled}
			onClick={onClick}
		>
			{typeof children === "string" ? (
				<LocalizedText text={children} />
			) : (
				children
			)}
		</button>
	);
}
export function BetZone({
	label,
	payout,
	selected,
	onClick,
	disabled = false,
}: {
	label: string;
	payout: string;
	selected: boolean;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			className={`bet-zone ${selected ? "selected" : ""}`}
			aria-pressed={selected}
			onClick={onClick}
			disabled={disabled}
		>
			<strong>
				<LocalizedText text={label} />
			</strong>
			<small>{payout}</small>
			{selected && <span className="zone-chip" aria-hidden="true" />}
		</button>
	);
}
