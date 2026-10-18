import { createHash, randomInt } from "node:crypto";
import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import {
	type Currency,
	formatAmount,
	parseAmount,
} from "@gold-bet-clean-money365/auth/money";
import { NotificationService } from "@gold-bet-clean-money365/auth/notifications";
import { createRateLimiter } from "@gold-bet-clean-money365/auth/rate-limit";
import {
	activeAccount,
	type ClientSession,
} from "@gold-bet-clean-money365/auth/storage";
import { WalletService } from "@gold-bet-clean-money365/auth/wallets";
import * as blackjack from "@gold-bet-clean-money365/casino-blackjack/engine";
import type {
	Action,
	CasinoOutcome,
	GameState,
	GameView,
	SessionEngine,
} from "@gold-bet-clean-money365/casino-core";
import * as crash from "@gold-bet-clean-money365/casino-crash/engine";
import * as dino from "@gold-bet-clean-money365/casino-dino/engine";
import * as mines from "@gold-bet-clean-money365/casino-mines/engine";
import * as poker from "@gold-bet-clean-money365/casino-video-poker/engine";
import type { Database } from "@gold-bet-clean-money365/db";
import {
	CASINO_VERSION,
	type CasinoRound,
	casinoGames,
} from "./casino-catalog";
import { casinoPayout } from "./casino-engine";
import type { RoundDocument } from "./casino-service";

export const sessionGames = [
	"blackjack",
	"mines",
	"crash",
	"video-poker",
	"dino",
] as const;
export type SessionGame = (typeof sessionGames)[number];
const engines: Record<SessionGame, SessionEngine> = {
	dino,
	blackjack,
	mines,
	crash,
	"video-poker": poker,
};
type SessionDoc = {
	currency?: Currency;
	_id: string;
	userId: string;
	game: SessionGame;
	state: GameState;
	status: "active" | "settled";
	stakeMillimes: number;
	balanceMillimes: number;
	createdAt: string;
	version: string;
	fingerprint: string;
	outcome?: CasinoOutcome;
	payoutMillimes?: number;
};
export type GameSession = {
	currency?: Currency;
	id: string;
	game: SessionGame;
	status: "active" | "settled";
	stakeMillimes: number;
	balanceMillimes: number;
	createdAt: string;
	version: string;
	view: GameView;
	outcome: CasinoOutcome | null;
	serverTime: number;
};
const fingerprint = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
function publicSession(doc: SessionDoc, now = Date.now()): GameSession {
	return {
		id: doc._id,
		currency: doc.currency ?? "TND",
		game: doc.game,
		status: doc.status,
		stakeMillimes: doc.stakeMillimes,
		balanceMillimes: doc.balanceMillimes,
		createdAt: doc.createdAt,
		version: doc.version,
		view: engines[doc.game].view(doc.state, doc.status === "settled", now),
		outcome: doc.outcome ?? null,
		serverTime: now,
	};
}

export class CasinoSessions {
	private readonly wallets;
	private readonly consume;
	constructor(
		private readonly db: Database,
		secret: string,
	) {
		this.wallets = new WalletService(db, secret);
		this.consume = createRateLimiter(db, secret);
	}
	private sessions() {
		return this.db.collection<SessionDoc>("casinoSession");
	}
	private async authorize(userId: string) {
		const user = await activeAccount(this.db, userId);
		if (user?.role !== "user")
			throw new ManagementError(
				"FORBIDDEN",
				"Only active user accounts can play.",
			);
		return user;
	}
	private async limit(id: string, max: number) {
		const rate = await this.consume(id, { window: 60, max });
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Please slow down and try again.",
			);
	}
	private async settle(
		doc: SessionDoc,
		outcome: CasinoOutcome,
		session: ClientSession,
		move: (id: string, stake: number, payout: number) => Promise<number>,
	) {
		const payout = casinoPayout(
			doc.stakeMillimes,
			outcome.multiplierHundredths,
		);
		doc.balanceMillimes = await move(doc._id, 0, payout);
		doc.status = "settled";
		doc.outcome = outcome;
		doc.payoutMillimes = payout;
		await this.sessions().replaceOne(
			{ _id: doc._id, userId: doc.userId },
			doc,
			{ session },
		);
		const user = await activeAccount(this.db, doc.userId, session);
		const round: CasinoRound = {
			id: doc._id,
			currency: doc.currency ?? "TND",
			game: doc.game,
			version: doc.version,
			choice: "play",
			numbers: [],
			stakeMillimes: doc.stakeMillimes,
			payoutMillimes: payout,
			balanceMillimes: doc.balanceMillimes,
			outcome,
			status:
				payout > doc.stakeMillimes
					? "won"
					: payout === doc.stakeMillimes
						? "push"
						: "lost",
			createdAt: doc.createdAt,
		};
		await this.db.collection<RoundDocument>("casinoRound").insertOne(
			{
				...round,
				_id: doc._id,
				currency: doc.currency ?? "TND",
				userId: doc.userId,
				fingerprint: doc.fingerprint,
				fournisseurId: user?.fournisseurId ?? null,
				clientId: user?.clientId ?? null,
				savedAt: new Date(),
			},
			{ session },
		);
		const name = casinoGames.find((g) => g.id === doc.game)?.name ?? doc.game;
		await new NotificationService(this.db).record(
			{
				_id: `casino:${doc._id}:settled`,
				userId: doc.userId,
				kind: "casino.settled",
				title: `${name} · ${round.status}`,
				message: `Stake ${formatAmount(doc.stakeMillimes, doc.currency)} · return ${formatAmount(payout, doc.currency)}.`,
				href: "/casino",
			},
			session,
		);
	}
	async start(
		userId: string,
		input: {
			requestId: string;
			game: SessionGame;
			version: string;
			stake: string;
		},
	) {
		const user = await this.authorize(userId);
		if (input.version !== CASINO_VERSION)
			throw new ManagementError(
				"CONFLICT",
				"Reload to use the latest game rules.",
			);
		let stake: number;
		try {
			stake = parseAmount(input.stake);
		} catch {
			throw new ManagementError("BAD_REQUEST", "Invalid stake.");
		}
		if (stake < 100 || stake > 100000)
			throw new ManagementError(
				"BAD_REQUEST",
				"Stake must be between 0.100 and 100.000 credits.",
			);
		const id = `${userId}:${input.requestId}`;
		const hash = fingerprint({
			game: input.game,
			stake,
			version: input.version,
		});
		await this.limit(`casino-start:${userId}`, 20);
		const initial = engines[input.game].create(randomInt, Date.now());
		return this.wallets.casinoSession(userId, async (session, move) => {
			const prior = await this.sessions().findOne(
				{ _id: id, userId },
				{ session },
			);
			if (prior) {
				if (prior.fingerprint !== hash)
					throw new ManagementError(
						"CONFLICT",
						"This request belongs to another round.",
					);
				return publicSession(prior);
			}
			if (
				await this.db
					.collection<{ _id: string }>("casinoRound")
					.findOne({ _id: id }, { session })
			)
				throw new ManagementError("CONFLICT", "Request ID already used.");
			if (
				await this.sessions().findOne(
					{ userId, game: input.game, status: "active" },
					{ session },
				)
			)
				throw new ManagementError(
					"CONFLICT",
					"Resume your active round before starting another.",
				);
			const balance = await move(id, stake, 0);
			const doc: SessionDoc = {
				currency: user.currency ?? "TND",
				_id: id,
				userId,
				game: input.game,
				state: initial.state,
				status: "active",
				stakeMillimes: stake,
				balanceMillimes: balance,
				createdAt: new Date().toISOString(),
				version: input.version,
				fingerprint: hash,
			};
			// Crash starts when the stake is accepted, not while waiting for a wallet lock.
			if (doc.state.kind === "crash") {
				const duration = doc.state.bustAt - doc.state.startedAt;
				doc.state.startedAt = Date.now();
				doc.state.bustAt = doc.state.startedAt + duration;
			}
			await this.sessions().insertOne(doc, { session });
			if (initial.outcome)
				await this.settle(doc, initial.outcome, session, move);
			return publicSession(doc);
		});
	}
	async recover(userId: string, id: string) {
		await this.authorize(userId);
		const doc = await this.sessions().findOne({ _id: id, userId });
		if (!doc) return null;
		if (
			doc.status === "active" &&
			doc.state.kind === "crash" &&
			Date.now() >= doc.state.bustAt
		)
			return this.action(
				userId,
				{ id: doc._id, requestId: "automatic", action: { type: "cashout" } },
				true,
			);
		return publicSession(doc);
	}

	async active(userId: string, game: SessionGame) {
		await this.authorize(userId);
		const doc = await this.sessions().findOne({
			userId,
			game,
			status: "active",
		});
		if (!doc) return null;
		if (doc.state.kind === "crash" && Date.now() >= doc.state.bustAt)
			return this.action(
				userId,
				{ id: doc._id, requestId: "automatic", action: { type: "cashout" } },
				true,
			);
		return publicSession(doc);
	}
	async action(
		userId: string,
		input: { id: string; requestId: string; action: Action },
		automatic = false,
	) {
		await this.authorize(userId);
		if (!automatic) await this.limit(`casino-action:${userId}`, 120);
		return this.wallets.casinoSession(userId, async (session, move) => {
			const doc = await this.sessions().findOne(
				{ _id: input.id, userId },
				{ session },
			);
			if (!doc) throw new ManagementError("FORBIDDEN", "Round not found.");
			const actions = this.db.collection<{
				_id: string;
				fingerprint: string;
				reply: GameSession;
			}>("casinoAction");
			const actionId = `${doc._id}:${input.requestId}`;
			const hash = fingerprint(input.action);
			const prior = await actions.findOne({ _id: actionId }, { session });
			if (prior) {
				if (prior.fingerprint !== hash)
					throw new ManagementError("CONFLICT", "Action request already used.");
				return prior.reply;
			}
			if (doc.status === "settled") return publicSession(doc);
			let next: ReturnType<SessionEngine["act"]>;
			try {
				next = engines[doc.game].act(doc.state, input.action, Date.now());
			} catch (error) {
				throw new ManagementError(
					"BAD_REQUEST",
					error instanceof Error ? error.message : "Invalid game action.",
				);
			}
			doc.state = next.state;
			if (next.outcome) await this.settle(doc, next.outcome, session, move);
			else
				await this.sessions().replaceOne({ _id: doc._id, userId }, doc, {
					session,
				});
			const reply = publicSession(doc);
			await actions.insertOne(
				{ _id: actionId, fingerprint: hash, reply },
				{ session },
			);
			return reply;
		});
	}
}
