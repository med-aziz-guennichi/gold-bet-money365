export type RandomInt = (exclusiveMaximum: number) => number;
export type CasinoOutcome = {
	symbols: string[];
	detail: string;
	multiplierHundredths: number;
	path?: number[];
};
export type GameId =
	| "roulette"
	| "blackjack"
	| "baccarat"
	| "dragon-tiger"
	| "sic-bo"
	| "slots"
	| "mines"
	| "crash"
	| "video-poker"
	| "plinko";
export type Action = {
	type: "hit" | "stand" | "reveal" | "cashout" | "draw";
	index?: number;
	holds?: number[];
};
export type GameState =
	| { kind: "blackjack"; deck: number[]; player: number[]; dealer: number[] }
	| { kind: "mines"; mines: number[]; revealed: number[] }
	| { kind: "crash"; startedAt: number; bustHundredths: number; bustAt: number }
	| { kind: "video-poker"; deck: number[]; cards: number[] };
export type GameView = {
	kind: GameId;
	cards?: string[];
	dealer?: string[];
	revealed?: number[];
	mines?: number[];
	multiplierHundredths?: number;
	nextMultiplierHundredths?: number;
	startedAt?: number;
	serverTime?: number;
	busted?: boolean;
};
export type Transition = { state: GameState; outcome?: CasinoOutcome };
export type SessionEngine = {
	create: (random: RandomInt, now: number) => Transition;
	act: (state: GameState, action: Action, now: number) => Transition;
	view: (state: GameState, ended: boolean, now: number) => GameView;
};
export function result(
	symbols: string[],
	detail: string,
	multiplierHundredths: number,
	path?: number[],
): CasinoOutcome {
	return { symbols, detail, multiplierHundredths, ...(path ? { path } : {}) };
}
export function shuffleDeck(random: RandomInt, decks = 1) {
	const cards = Array.from({ length: 52 * decks }, (_, i) => i % 52);
	for (let i = cards.length - 1; i > 0; i--) {
		const j = random(i + 1);
		const a = cards[i]!;
		cards[i] = cards[j]!;
		cards[j] = a;
	}
	return cards;
}
export function take(deck: number[]) {
	const card = deck.pop();
	if (card === undefined) throw new Error("Deck exhausted");
	return card;
}
export type TableProps = {
	outcome: CasinoOutcome | null;
	view: GameView | null;
	busy: boolean;
	disabled: boolean;
	choice: string;
	numbers: number[];
	onChoice: (choice: string) => void;
	onNumber: (number: number) => void;
	onStart: () => void;
	onAction: (action: Action) => void;
	phase: "ready" | "playing" | "active" | "settled";
};
