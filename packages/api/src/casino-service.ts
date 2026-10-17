import { createHash, randomInt } from "node:crypto";
import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import { formatTnd, parseTnd } from "@gold-bet-clean-money365/auth/money";
import { NotificationService } from "@gold-bet-clean-money365/auth/notifications";
import { createRateLimiter } from "@gold-bet-clean-money365/auth/rate-limit";
import {
	activeAccount,
	type ClientSession,
} from "@gold-bet-clean-money365/auth/storage";
import { WalletService } from "@gold-bet-clean-money365/auth/wallets";
import type { Database } from "@gold-bet-clean-money365/db";
import {
	CASINO_VERSION,
	type CasinoInput,
	type CasinoRound,
	casinoGames,
} from "./casino-catalog";
import { casinoPayout, playCasino } from "./casino-engine";

type RoundDocument = CasinoRound & {
	_id: string;
	userId: string;
	fingerprint: string;
	fournisseurId: string | null;
	clientId: string | null;
	savedAt: Date;
};
function publicRound({
	_id,
	userId,
	fingerprint,
	fournisseurId,
	clientId,
	savedAt,
	...round
}: RoundDocument): CasinoRound {
	return round;
}

export class CasinoService {
	private readonly wallet;
	private readonly consume;
	constructor(
		private readonly db: Database,
		secret: string,
	) {
		this.wallet = new WalletService(db, secret);
		this.consume = createRateLimiter(db, secret);
	}
	private rounds() {
		return this.db.collection<RoundDocument>("casinoRound");
	}
	private async user(id: string) {
		const user = await activeAccount(this.db, id);
		if (user?.role !== "user")
			throw new ManagementError(
				"FORBIDDEN",
				"Only active user accounts can play casino games.",
			);
		return user;
	}
	async play(userId: string, input: CasinoInput) {
		const user = await this.user(userId);
		if (input.version !== CASINO_VERSION)
			throw new ManagementError(
				"CONFLICT",
				"Game rules have changed. Reload before playing.",
			);
		const game = casinoGames.find((g) => g.id === input.game);
		if (!game || !(game.choices as readonly string[]).includes(input.choice))
			throw new ManagementError("BAD_REQUEST", "Invalid game selection.");
		const numbers = [...input.numbers].sort((a, b) => a - b);
		const validNumbers =
			input.game === "keno"
				? numbers.length === 3 &&
					new Set(numbers).size === 3 &&
					numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 20)
				: input.game === "roulette" && input.choice === "number"
					? numbers.length === 1 &&
						Number.isInteger(numbers[0]) &&
						numbers[0]! >= 0 &&
						numbers[0]! <= 36
					: numbers.length === 0;
		if (!validNumbers)
			throw new ManagementError("BAD_REQUEST", "Invalid game numbers.");
		let stake: number;
		try {
			stake = parseTnd(input.stake);
		} catch {
			throw new ManagementError("BAD_REQUEST", "Invalid stake.");
		}
		if (stake < 100 || stake > 100_000)
			throw new ManagementError(
				"BAD_REQUEST",
				"Stake must be between 0.100 and 100.000 TND.",
			);
		const fingerprint = createHash("sha256")
			.update(
				JSON.stringify({
					game: input.game,
					version: input.version,
					choice: input.choice,
					numbers,
					stake,
				}),
			)
			.digest("hex");
		const id = `${userId}:${input.requestId}`;
		const previous = async (session?: ClientSession) => {
			const round = await this.rounds().findOne(
				{ _id: id, userId },
				{ session },
			);
			if (round && round.fingerprint !== fingerprint)
				throw new ManagementError(
					"CONFLICT",
					"This request already belongs to another round.",
				);
			return round ? publicRound(round) : null;
		};
		const existing = await previous();
		if (existing) return existing;
		const rate = await this.consume(`casino:${userId}`, {
			window: 60,
			max: 20,
		});
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Please wait before playing another round.",
			);
		// Draw once, outside the retryable transaction; retries can never reroll a round.
		const outcome = playCasino(input.game, input.choice, numbers, randomInt);
		const payout = casinoPayout(stake, outcome.multiplierHundredths);
		const createdAt = new Date().toISOString();
		return this.wallet.casinoRound(userId, {
			id,
			stakeMillimes: stake,
			payoutMillimes: payout,
			existing: previous,
			save: async (session, balance) => {
				const round: CasinoRound = {
					id,
					game: input.game,
					version: input.version,
					choice: input.choice,
					numbers,
					stakeMillimes: stake,
					payoutMillimes: payout,
					balanceMillimes: balance,
					outcome,
					status: payout > stake ? "won" : payout === stake ? "push" : "lost",
					createdAt,
				};
				await this.rounds().insertOne(
					{
						...round,
						_id: id,
						userId,
						fingerprint,
						fournisseurId: user.fournisseurId ?? null,
						clientId: user.clientId ?? null,
						savedAt: new Date(createdAt),
					},
					{ session },
				);
				await new NotificationService(this.db).record(
					{
						_id: `casino:${id}:settled`,
						userId,
						kind: "casino.settled",
						title: `${game.name} · ${round.status}`,
						message: `Stake ${formatTnd(stake)} · return ${formatTnd(payout)}.`,
						href: "/casino",
					},
					session,
				);
				return round;
			},
		});
	}
	async history(
		userId: string,
		input: { page: number; game?: CasinoInput["game"] },
	) {
		await this.user(userId);
		const filter = { userId, ...(input.game ? { game: input.game } : {}) };
		const [items, total] = await Promise.all([
			this.rounds()
				.find(filter)
				.sort({ createdAt: -1, _id: -1 })
				.skip((input.page - 1) * 20)
				.limit(20)
				.toArray(),
			this.rounds().countDocuments(filter),
		]);
		return { items: items.map(publicRound), total, page: input.page };
	}
	async recover(userId: string, requestId: string) {
		await this.user(userId);
		const round = await this.rounds().findOne({
			_id: `${userId}:${requestId}`,
			userId,
		});
		return round ? publicRound(round) : null;
	}
}
