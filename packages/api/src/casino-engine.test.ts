import assert from "node:assert/strict";
import { test } from "node:test";
import { casinoGames } from "./casino-catalog";
import {
	bankerDraws,
	casinoPayout,
	playCasino,
	plinkoReturns,
	wheelReturns,
} from "./casino-engine";

function sequence(values: number[]) {
	let i = 0;
	return (max: number) => {
		const n = values[i++];
		assert.ok(
			n !== undefined && n >= 0 && n < max,
			`Invalid test draw ${n}/${max}`,
		);
		return n;
	};
}
test("fifteen distinct engines and exact integer returns", () => {
	assert.equal(new Set(casinoGames.map((g) => g.id)).size, 15);
	assert.equal(casinoPayout(101, 195), 196);
	assert.equal(casinoPayout(100000, 6500), 6500000);
});
test("roulette exhaustively gives 18 outside wins; zero never wins outside", () => {
	for (const choice of ["red", "black", "odd", "even"]) {
		let sum = 0;
		for (let n = 0; n < 37; n++)
			sum += playCasino(
				"roulette",
				choice,
				[],
				sequence([n]),
			).multiplierHundredths;
		assert.equal(sum, 3600);
		assert.equal(
			playCasino("roulette", choice, [], sequence([0])).multiplierHundredths,
			0,
		);
	}
	assert.equal(
		playCasino("roulette", "number", [0], sequence([0])).multiplierHundredths,
		3600,
	);
});
test("coin and dice are independent fixed-odds outcomes", () => {
	assert.equal(
		playCasino("coin", "heads", [], sequence([0])).multiplierHundredths,
		196,
	);
	assert.equal(
		playCasino("coin", "heads", [], sequence([1])).multiplierHundredths,
		0,
	);
	for (const choice of ["under", "over"]) {
		const sum = Array.from(
			{ length: 100 },
			(_, n) =>
				playCasino("dice", choice, [], sequence([n])).multiplierHundredths,
		).reduce((a, b) => a + b, 0);
		assert.equal(sum, 9800);
	}
});
test("sic bo excludes triples and exhaustive paytables match the rules", () => {
	const sums = { small: 0, big: 0, triple: 0 };
	for (let a = 0; a < 6; a++)
		for (let b = 0; b < 6; b++)
			for (let c = 0; c < 6; c++)
				for (const choice of ["small", "big", "triple"] as const)
					sums[choice] += playCasino(
						"sic-bo",
						choice,
						[],
						sequence([a, b, c]),
					).multiplierHundredths;
	assert.deepEqual(sums, { small: 21000, big: 21000, triple: 18600 });
});
test("slots has exactly the published reel distribution", () => {
	let sum = 0;
	for (let a = 0; a < 6; a++)
		for (let b = 0; b < 6; b++)
			for (let c = 0; c < 6; c++)
				sum += playCasino(
					"slots",
					"spin",
					[],
					sequence([a, b, c]),
				).multiplierHundredths;
	assert.equal(sum, 21000); // 210 / 216 = 97.2222% total return.
});
test("keno draws without replacement; two and three matches have fixed returns", () => {
	const out = playCasino("keno", "draw", [1, 2, 3], sequence([0, 0, 0, 0, 0]));
	assert.deepEqual(out.symbols, ["1", "2", "3", "4", "5"]);
	assert.equal(out.multiplierHundredths, 6500);
	assert.equal(
		playCasino("keno", "draw", [1, 2, 20], sequence([0, 0, 0, 0, 0]))
			.multiplierHundredths,
		300,
	);
});
test("all 256 plinko paths and all 20 wheel sectors use published multipliers", () => {
	let sum = 0;
	for (let n = 0; n < 256; n++) {
		const path = Array.from({ length: 8 }, (_, i) => (n >> i) & 1);
		const out = playCasino("plinko", "drop", [], sequence(path));
		assert.equal(
			out.multiplierHundredths,
			plinkoReturns[path.reduce((a, b) => a + b, 0)],
		);
		sum += out.multiplierHundredths;
	}
	assert.equal(sum, 25000);
	assert.equal(
		wheelReturns.reduce((a, b) => a + b, 0),
		1800,
	);
	for (let n = 0; n < 20; n++)
		assert.equal(
			playCasino("wheel", "spin", [], sequence([n])).multiplierHundredths,
			wheelReturns[n],
		);
});
test("dragon tiger compares ranks, refunds half on equal ranks", () => {
	assert.equal(
		playCasino("dragon-tiger", "dragon", [], sequence([12, 0]))
			.multiplierHundredths,
		200,
	);
	assert.equal(
		playCasino("dragon-tiger", "dragon", [], sequence([0, 13]))
			.multiplierHundredths,
		50,
	);
	assert.equal(
		playCasino("dragon-tiger", "tie", [], sequence([0, 13]))
			.multiplierHundredths,
		1200,
	);
});
test("baccarat natural, player draw, banker draw, tie push and commission", () => {
	// Draw indices 0..12 are A..K; removing a card replaces its index with the last card.
	const natural = playCasino(
		"baccarat",
		"player",
		[],
		sequence([3, 1, 16, 14]),
	);
	assert.match(natural.detail, /Player 8 · Banker 4/);
	assert.equal(natural.multiplierHundredths, 200);
	const banker = playCasino("baccarat", "banker", [], sequence([1, 3, 14, 16]));
	assert.match(banker.detail, /Banker 8/);
	assert.equal(banker.multiplierHundredths, 195);
	assert.equal(
		playCasino("baccarat", "player", [], sequence([3, 16, 29, 42]))
			.multiplierHundredths,
		100,
	);
	const drawn = playCasino(
		"baccarat",
		"tie",
		[],
		sequence([0, 13, 26, 39, 52, 65]),
	);
	assert.match(drawn.detail, /Player 3 · Banker 3/);
	assert.equal(drawn.multiplierHundredths, 900);
});

test("baccarat banker third-card table covers every total and third card", () => {
	// Independent table from the published punto banco rules.
	const thirdCards = [
		"0123456789",
		"0123456789",
		"0123456789",
		"012345679",
		"234567",
		"4567",
		"67",
		"",
		"",
		"",
	];
	for (let total = 0; total < 10; total++) {
		assert.equal(bankerDraws(total, null), total <= 5);
		for (let third = 0; third < 10; third++)
			assert.equal(
				bankerDraws(total, third),
				thirdCards[total]?.includes(String(third)),
				`${total}/${third}`,
			);
	}
});
