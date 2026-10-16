import { createHmac } from "node:crypto";
import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import { formatTnd, parseTnd } from "@gold-bet-clean-money365/auth/money";
import { NotificationService } from "@gold-bet-clean-money365/auth/notifications";
import { createRateLimiter } from "@gold-bet-clean-money365/auth/rate-limit";
import {
	activeAccount,
	type ClientSession,
	ObjectId,
} from "@gold-bet-clean-money365/auth/storage";
import { WalletService } from "@gold-bet-clean-money365/auth/wallets";
import type { Database } from "@gold-bet-clean-money365/db";
import {
	type BetHistoryInput,
	type BetHistorySummary,
	betHistoryInput,
} from "./bet-history";
import { evaluatePick, settleReturns } from "./bet-settlement";
import type { AcceptedBetPick, PlaceBetInput, SavedBet } from "./betting";
import { calculateBetReturn } from "./betting-money";
import type { FlashscoreService } from "./football";

type BetDocument = Omit<SavedBet, "id" | "placedAt"> & {
	_id: ObjectId;
	userId: string;
	requestId: string;
	fingerprint: string;
	fournisseurId: string;
	clientId: string;
	createdAt: Date;
	quotedAt: Date;
	checkedAt?: Date;
};

function label(value?: string | null) {
	return (value ?? "").trim().toLowerCase();
}
function resultLabel(value: string) {
	const text = label(value);
	if (["1", "1 (home)", "home"].includes(text)) return "home";
	if (["x", "draw", "tie"].includes(text)) return "draw";
	if (["2", "2 (away)", "away"].includes(text)) return "away";
	return text;
}
function serialize(bet: BetDocument): SavedBet {
	return {
		id: bet._id.toHexString(),
		picks: bet.picks,
		stakeMillimes: bet.stakeMillimes,
		potentialReturnMillimes: bet.potentialReturnMillimes,
		totalOdds: bet.totalOdds,
		status: bet.status,
		placedAt: bet.createdAt.toISOString(),
		payoutMillimes: bet.payoutMillimes,
		settledAt: bet.settledAt,
		settlementNote: bet.settlementNote,
		pickResults: bet.pickResults,
	};
}

export class BettingService {
	private readonly wallets;
	private readonly consume;
	constructor(
		private readonly db: Database,
		private readonly feed: FlashscoreService,
		private readonly secret: string,
	) {
		this.wallets = new WalletService(db, secret);
		this.consume = createRateLimiter(db, secret);
	}
	private bets() {
		return this.db.collection<BetDocument>("bet");
	}
	private async user(id: string) {
		const user = await activeAccount(this.db, id);
		if (user?.role !== "user" || !user.fournisseurId || !user.clientId)
			throw new ManagementError(
				"FORBIDDEN",
				"Only active user accounts can place bets.",
			);
		return {
			...user,
			fournisseurId: user.fournisseurId,
			clientId: user.clientId,
		};
	}
	private async previous(
		userId: string,
		requestId: string,
		fingerprint: string,
		session?: ClientSession,
	) {
		const previous = await this.bets().findOne(
			{ userId, requestId },
			{ session },
		);
		if (previous && previous.fingerprint !== fingerprint)
			throw new ManagementError(
				"CONFLICT",
				"This request was already used for a different bet.",
			);
		return previous ? serialize(previous) : null;
	}

	async place(userId: string, input: PlaceBetInput) {
		const user = await this.user(userId);
		const rate = await this.consume(`bet-place:${userId}`, {
			window: 60,
			max: 10,
		});
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Too many bet requests. Please wait before trying again.",
			);
		let stakeMillimes: number;
		try {
			stakeMillimes = parseTnd(input.stake);
		} catch {
			throw new ManagementError(
				"BAD_REQUEST",
				"Enter a valid stake with at most 3 decimal places.",
			);
		}
		if (stakeMillimes <= 0)
			throw new ManagementError(
				"BAD_REQUEST",
				"Stake must be greater than zero.",
			);
		if (
			!input.picks.length ||
			input.picks.length > 10 ||
			new Set(input.picks.map((pick) => pick.matchId)).size !==
				input.picks.length
		)
			throw new ManagementError(
				"BAD_REQUEST",
				"Choose up to 10 picks, with only one pick per match.",
			);
		const canonicalPicks = input.picks
			.map((pick) => ({
				matchId: pick.matchId,
				expectedOdd: pick.expectedOdd,
				market: {
					type: pick.market.type,
					scope: pick.market.scope,
					selection: pick.market.selection,
					handicap: pick.market.handicap ?? null,
					score: pick.market.score ?? null,
					bookmaker: pick.market.bookmaker ?? null,
				},
			}))
			.sort((a, b) => a.matchId.localeCompare(b.matchId));
		const fingerprint = createHmac("sha256", this.secret)
			.update(JSON.stringify({ stakeMillimes, picks: canonicalPicks }))
			.digest("hex");
		const replay = await this.previous(userId, input.requestId, fingerprint);
		if (replay) return replay;
		// Reject unaffordable requests before doing expensive scraper lookups.
		// The transaction still checks again to protect against concurrent spending.
		if ((await this.wallets.balance(userId)).balanceMillimes < stakeMillimes)
			throw new ManagementError(
				"BAD_REQUEST",
				"Your wallet credits are too low for this stake.",
			);
		const ids = canonicalPicks.map((pick) => pick.matchId);
		const validationStartedAt = Date.now();
		let fixtures: Awaited<ReturnType<FlashscoreService["getMatches"]>>;
		let results: Awaited<ReturnType<FlashscoreService["getResults"]>>;
		let prices: Awaited<ReturnType<FlashscoreService["getOdds"]>>;
		try {
			[fixtures, results] = await Promise.all([
				this.feed.getMatches({ ids }),
				this.feed.getResults(ids, { fresh: true }),
			]);
			prices = await this.feed.getOdds(ids, { fresh: true });
		} catch {
			throw new ManagementError(
				"SERVICE_UNAVAILABLE",
				"Cannot validate current matches and prices. No credits were spent. Try again later.",
			);
		}
		const picks: AcceptedBetPick[] = canonicalPicks.map((pick) => {
			const fixture = fixtures.matches.find(
				(match) => match.id === pick.matchId,
			);
			const status = results.results.find(
				(result) => result.id === pick.matchId,
			)?.status;
			const live = status === "TRADING_LIVE";
			if (
				!fixture ||
				!["TRADING", "TRADING_LIVE"].includes(status ?? "") ||
				(!live && !(Date.parse(fixture.time) > Date.now()))
			)
				throw new ManagementError(
					"CONFLICT",
					"A selected match is no longer open for betting. Refresh your selections.",
				);
			const snapshot = prices.odds[pick.matchId];
			if (!fixture.sport || fixture.sport === "Unknown")
				throw new ManagementError(
					"SERVICE_UNAVAILABLE",
					"The event sport could not be verified. No credits were spent.",
				);
			if (
				fixture.sport !== "Football" &&
				(pick.market.type !== "HOME_AWAY" || pick.market.scope !== "FULL_TIME")
			)
				throw new ManagementError(
					"BAD_REQUEST",
					"Only full-match winner bets are currently supported for this sport.",
				);
			for (const market of snapshot?.markets ?? []) {
				if (
					market.betType !== pick.market.type ||
					market.scope !== pick.market.scope ||
					(live && !market.hasLiveBetting) ||
					(pick.market.bookmaker && market.bookmaker !== pick.market.bookmaker)
				)
					continue;
				const normalize =
					market.betType === "HOME_DRAW_AWAY" ? resultLabel : label;
				const offer = market.selections.find(
					(offer) =>
						offer.active &&
						offer.value === pick.expectedOdd &&
						normalize(offer.selection) === normalize(pick.market.selection) &&
						label(offer.handicap) === label(pick.market.handicap) &&
						label(offer.score) === label(pick.market.score),
				);
				if (offer?.value)
					return {
						sport: fixture.sport,
						matchId: fixture.id,
						home: fixture.home,
						away: fixture.away,
						league: fixture.league,
						kickoff: fixture.time,
						odd: offer.value,
						market: {
							type: market.betType,
							scope: market.scope,
							selection: offer.selection,
							handicap: offer.handicap,
							score: offer.score,
							bookmaker: market.bookmaker,
						},
					};
			}
			throw new ManagementError(
				"CONFLICT",
				"A price changed or a selection is unavailable. Refresh your selections before placing the bet.",
			);
		});
		let returns: ReturnType<typeof calculateBetReturn>;
		try {
			returns = calculateBetReturn(
				stakeMillimes,
				picks.map((pick) => pick.odd),
			);
		} catch (error) {
			throw new ManagementError(
				"BAD_REQUEST",
				error instanceof Error ? error.message : "Invalid odds.",
			);
		}
		const quotedAt = new Date(validationStartedAt);
		const bet: BetDocument = {
			_id: new ObjectId(),
			userId,
			requestId: input.requestId,
			fingerprint,
			fournisseurId: user.fournisseurId,
			clientId: user.clientId,
			picks,
			stakeMillimes,
			...returns,
			status: "Pending",
			createdAt: quotedAt,
			quotedAt,
		};
		return this.wallets.spendForBet(userId, {
			stakeMillimes,
			requestId: input.requestId,
			existing: (session) =>
				this.previous(userId, input.requestId, fingerprint, session),
			save: async (session) => {
				if (
					Date.now() - quotedAt.getTime() > 15_000 ||
					picks.some((pick) => {
						const live =
							results.results.find((result) => result.id === pick.matchId)
								?.status === "TRADING_LIVE";
						return !live && Date.parse(pick.kickoff) <= Date.now();
					})
				)
					throw new ManagementError(
						"CONFLICT",
						"The bet quote expired. Refresh your selections and try again.",
					);
				await this.bets().insertOne(bet, { session });
				return serialize(bet);
			},
		});
	}

	/** Internal worker only: bounded batches rotate by last check to avoid starvation. */
	async settlePending(batchSize = 20, userId?: string) {
		const pending = await this.bets()
			.find({ status: "Pending", ...(userId ? { userId } : {}) })
			.sort({ checkedAt: 1, createdAt: 1 })
			.limit(Math.max(1, Math.min(20, batchSize)))
			.toArray();
		if (!pending.length) return;
		const ids = [
			...new Set(
				pending.flatMap((bet) => bet.picks.map((pick) => pick.matchId)),
			),
		];
		const results = new Map<
			string,
			Awaited<ReturnType<FlashscoreService["getResults"]>>["results"][number]
		>();
		for (let offset = 0; offset < ids.length; offset += 6) {
			const batch = await this.feed.getResults(ids.slice(offset, offset + 6));
			for (const result of batch.results) results.set(result.id, result);
		}
		for (const bet of pending) {
			const outcomes = bet.picks.map((pick) =>
				evaluatePick(pick, results.get(pick.matchId)),
			);
			const settlement = settleReturns(bet.stakeMillimes, bet.picks, outcomes);
			const checkedAt = new Date();
			const pickResults = bet.picks.map((pick, index) => {
				const result = results.get(pick.matchId);
				return {
					matchId: pick.matchId,
					status: result?.status ?? "UNKNOWN",
					score: result?.score ?? null,
					latestEventMinute: result?.latestEventMinute ?? null,
					outcome: outcomes[index] ?? ("waiting" as const),
				};
			});
			if (!settlement) {
				await this.bets().updateOne(
					{ _id: bet._id, status: "Pending" },
					{
						$set: {
							checkedAt,
							pickResults,
							settlementNote: outcomes.includes("review")
								? "Result or market needs review before payment."
								: "Paid after all matches finish and final results are confirmed.",
						},
					},
				);
				continue;
			}
			try {
				await this.wallets.payBet({
					betId: bet._id.toHexString(),
					userId: bet.userId,
					payoutMillimes: settlement.payoutMillimes,
					claim: async (session) => {
						const claimed =
							(
								await this.bets().updateOne(
									{ _id: bet._id, status: "Pending" },
									{
										$set: {
											...settlement,
											pickResults,
											settledAt: checkedAt.toISOString(),
											checkedAt,
											settlementNote: "Final results confirmed.",
										},
									},
									{ session },
								)
							).modifiedCount === 1;
						if (claimed)
							await new NotificationService(this.db).record(
								{
									_id: `bet:${bet._id.toHexString()}:settled`,
									userId: bet.userId,
									kind: "bet.settled",
									title: `Bet ${settlement.status.toLowerCase()}`,
									message: `Your bet is ${settlement.status.toLowerCase()}. ${formatTnd(settlement.payoutMillimes)} returned to your wallet.`,
									href: "/bets",
								},
								session,
							);
						return claimed;
					},
				});
			} catch {
				await this.bets().updateOne(
					{ _id: bet._id, status: "Pending" },
					{
						$set: {
							checkedAt,
							settlementNote:
								"Payment pending. Wallet settlement will be retried.",
							pickResults,
						},
					},
				);
				console.error("Bet settlement deferred", bet._id.toHexString());
			}
		}
	}

	/** Free testing can refresh the signed-in user's results without a daemon. */
	async refreshResults(userId: string) {
		await this.user(userId);
		const rate = await this.consume(`bet-refresh:${userId}`, {
			window: 60,
			max: 5,
		});
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Please wait before checking results again.",
			);
		await this.settlePending(5, userId);
		return { ok: true };
	}

	async list(userId: string, input: BetHistoryInput) {
		await this.user(userId);
		const rate = await this.consume(`bet-read:${userId}`, {
			window: 60,
			max: 120,
		});
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Too many history requests.",
			);
		const parsed = betHistoryInput.safeParse(input);
		if (!parsed.success)
			throw new ManagementError(
				"BAD_REQUEST",
				parsed.error.issues[0]?.message ?? "Invalid history filters.",
			);
		const filters = parsed.data;
		// Ownership is always supplied by the session, including search and summaries.
		const constraints: Record<string, unknown>[] = [{ userId }];
		if (filters.status) constraints.push({ status: filters.status });
		if (filters.from || filters.to)
			constraints.push({
				createdAt: {
					...(filters.from ? { $gte: new Date(filters.from) } : {}),
					...(filters.to ? { $lte: new Date(filters.to) } : {}),
				},
			});
		if (filters.minStake !== undefined || filters.maxStake !== undefined)
			constraints.push({
				stakeMillimes: {
					...(filters.minStake !== undefined
						? { $gte: parseTnd(filters.minStake) }
						: {}),
					...(filters.maxStake !== undefined
						? { $lte: parseTnd(filters.maxStake) }
						: {}),
				},
			});
		if (filters.type)
			constraints.push({ "picks.1": { $exists: filters.type === "multiple" } });
		if (filters.query) {
			const literal = filters.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const search: Record<string, unknown>[] = [
				"picks.home",
				"picks.away",
				"picks.league",
			].map((field) => ({ [field]: { $regex: literal, $options: "i" } }));
			if (/^[a-f\d]{24}$/i.test(filters.query))
				search.push({ _id: new ObjectId(filters.query) });
			constraints.push({ $or: search });
		}
		const sort: Record<string, 1 | -1> =
			filters.sort === "oldest"
				? { createdAt: 1, _id: 1 }
				: filters.sort === "stake"
					? { stakeMillimes: -1, _id: -1 }
					: filters.sort === "payout"
						? { payoutMillimes: -1, _id: -1 }
						: { createdAt: -1, _id: -1 };
		const [result] = await this.bets()
			.aggregate<{ items: BetDocument[]; summary: BetHistorySummary[] }>(
				[
					{ $match: { $and: constraints } },
					{
						$facet: {
							items: [
								{ $sort: sort },
								{ $skip: (filters.page - 1) * filters.limit },
								{ $limit: filters.limit },
							],
							summary: [
								{
									$group: {
										_id: null,
										total: { $sum: 1 },
										stakeMillimes: { $sum: "$stakeMillimes" },
										payoutMillimes: {
											$sum: { $ifNull: ["$payoutMillimes", 0] },
										},
										settledStakeMillimes: {
											$sum: {
												$cond: [
													{ $ne: ["$status", "Pending"] },
													"$stakeMillimes",
													0,
												],
											},
										},
										pending: {
											$sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
										},
									},
								},
								{ $project: { _id: 0 } },
							],
						},
					},
				],
				{ maxTimeMS: 5_000 },
			)
			.toArray();
		const summary = result?.summary[0] ?? {
			total: 0,
			stakeMillimes: 0,
			payoutMillimes: 0,
			settledStakeMillimes: 0,
			pending: 0,
		};
		return {
			items: (result?.items ?? []).map(serialize),
			total: summary.total,
			summary,
			page: filters.page,
		};
	}
}
