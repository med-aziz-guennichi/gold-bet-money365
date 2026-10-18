import { createHmac } from "node:crypto";
import { ManagementError } from "@gold-bet-clean-money365/auth/errors";
import { formatAmount, parseAmount } from "@gold-bet-clean-money365/auth/money";
import { NotificationService } from "@gold-bet-clean-money365/auth/notifications";
import { createRateLimiter } from "@gold-bet-clean-money365/auth/rate-limit";
import {
	type AccountDocument,
	activeAccount,
	type ClientSession,
	ObjectId,
	userCollection,
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
import { marketRestriction } from "./market-availability";

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
	manualResolution?: {
		actorId: string;
		requestId: string;
		reason: string;
		outcomes: ("won" | "lost" | "void")[];
	};
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
		currency: bet.currency ?? "TND",
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
			stakeMillimes = parseAmount(input.stake);
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
			const restriction = marketRestriction(
				fixture.sport,
				status ?? "UNKNOWN",
				{
					betType: pick.market.type,
					scope: pick.market.scope,
					hasLiveBetting: true,
					selection: pick.market.selection,
					handicap: pick.market.handicap,
					score: pick.market.score,
				},
			);
			if (restriction) throw new ManagementError("BAD_REQUEST", restriction);
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
			currency: user.currency ?? "TND",
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
	async settlePending(batchSize = 20, userId?: string, checkedBefore?: Date) {
		const pending = await this.bets()
			.find({
				status: "Pending",
				...(userId ? { userId } : {}),
				...(checkedBefore
					? {
							$or: [
								{ checkedAt: { $lt: checkedBefore } },
								{ checkedAt: { $exists: false } },
							],
						}
					: {}),
			})
			.sort({ checkedAt: 1, createdAt: 1 })
			.limit(Math.max(1, Math.min(20, batchSize)))
			.toArray();
		if (!pending.length) return 0;
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
					currency: bet.currency,
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
									message: `Your bet is ${settlement.status.toLowerCase()}. ${formatAmount(settlement.payoutMillimes, bet.currency)} returned to your wallet.`,
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
		return pending.length;
	}

	private async admin(actorId: string, session?: ClientSession) {
		const actor = await activeAccount(this.db, actorId, session);
		if (actor?.role !== "admin")
			throw new ManagementError(
				"FORBIDDEN",
				"Only active administrators can review bets.",
			);
		return actor;
	}
	async reviewQueue(actorId: string, page = 1) {
		await this.admin(actorId);
		const filter = {
			status: "Pending" as const,
			$or: [
				{ "pickResults.outcome": "review" },
				{
					"picks.kickoff": {
						$lt: new Date(Date.now() - 86400_000).toISOString(),
					},
				},
			],
		};
		const [items, total, job] = await Promise.all([
			this.bets()
				.find(filter)
				.sort({ createdAt: 1 })
				.skip((page - 1) * 20)
				.limit(20)
				.maxTimeMS(5000)
				.toArray(),
			this.bets().countDocuments(filter, { maxTimeMS: 5000 }),
			this.db
				.collection<{
					_id: string;
					lastCompletedAt?: Date;
					lastErrorAt?: Date;
				}>("settlementJob")
				.findOne({ _id: "daily" }),
		]);
		const owners = await userCollection(this.db)
			.find({
				_id: {
					$in: [...new Set(items.map((item) => item.userId))]
						.filter((id) => /^[a-f0-9]{24}$/i.test(id))
						.map((id) => new ObjectId(id)),
				},
			})
			.project<Pick<AccountDocument, "_id" | "name">>({ _id: 1, name: 1 })
			.toArray();
		const names = new Map(
			owners.map((owner) => [owner._id.toHexString(), owner.name]),
		);

		return {
			items: items.map((item) => ({
				...serialize(item),
				ownerName: names.get(item.userId) ?? "Unknown account",
			})),
			total,
			page,
			lastCompletedAt: job?.lastCompletedAt?.toISOString() ?? null,
			lastErrorAt: job?.lastErrorAt?.toISOString() ?? null,
		};
	}
	async resolveReview(
		actorId: string,
		input: {
			betId: string;
			requestId: string;
			reason: string;
			outcomes: ("won" | "lost" | "void")[];
		},
	) {
		await this.admin(actorId);
		const rate = await this.consume(`bet-review:${actorId}`, {
			window: 60,
			max: 20,
		});
		if (!rate.allowed)
			throw new ManagementError(
				"TOO_MANY_REQUESTS",
				"Too many review requests.",
			);
		if (
			!/^[a-f0-9]{24}$/i.test(input.betId) ||
			!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
				input.requestId,
			) ||
			input.reason.trim().length < 10 ||
			input.reason.length > 500
		)
			throw new ManagementError(
				"BAD_REQUEST",
				"Provide a valid receipt and a detailed review reason.",
			);
		const id = new ObjectId(input.betId);
		const bet = await this.bets().findOne({ _id: id });
		if (!bet) throw new ManagementError("BAD_REQUEST", "Bet not found.");
		const matchesPrevious = (value: BetDocument) =>
			value.manualResolution?.actorId === actorId &&
			value.manualResolution.requestId === input.requestId &&
			value.manualResolution.reason === input.reason.trim() &&
			JSON.stringify(value.manualResolution.outcomes) ===
				JSON.stringify(input.outcomes);
		if (bet.status !== "Pending") {
			if (matchesPrevious(bet)) return serialize(bet);
			throw new ManagementError(
				"CONFLICT",
				"This bet has already been settled.",
			);
		}
		const eligible =
			bet.pickResults?.some((pick) => pick.outcome === "review") ||
			bet.picks.some(
				(pick) => Date.parse(pick.kickoff) < Date.now() - 86400_000,
			);
		if (!eligible)
			throw new ManagementError(
				"CONFLICT",
				"This bet is still awaiting results and does not require review.",
			);
		if (
			input.outcomes.length !== bet.picks.length ||
			input.outcomes.some(
				(outcome) => !["won", "lost", "void"].includes(outcome),
			)
		)
			throw new ManagementError(
				"BAD_REQUEST",
				"Provide one final outcome for every selection.",
			);
		const settlement = settleReturns(
			bet.stakeMillimes,
			bet.picks,
			input.outcomes,
		);
		if (!settlement)
			throw new ManagementError("BAD_REQUEST", "Invalid review outcomes.");
		const resolvedAt = new Date();
		await this.wallets.payBet({
			betId: input.betId,
			currency: bet.currency,
			userId: bet.userId,
			payoutMillimes: settlement.payoutMillimes,
			claim: async (session) => {
				await this.admin(actorId, session);
				// Serialize an administrator suspension with the privileged decision.
				await userCollection(this.db).updateOne(
					{ _id: new ObjectId(actorId) },
					{ $inc: { walletGuard: 1 } },
					{ session },
				);
				const claim = await this.bets().updateOne(
					{ _id: id, status: "Pending" },
					{
						$set: {
							...settlement,
							settledAt: resolvedAt.toISOString(),
							checkedAt: resolvedAt,
							settlementNote: `Administrator review: ${input.reason.trim()}`,
							pickResults: bet.picks.map((pick, index) => ({
								matchId: pick.matchId,
								status: "OPERATOR_REVIEW",
								score: null,
								outcome: input.outcomes[index] ?? "review",
							})),
							manualResolution: {
								actorId,
								requestId: input.requestId,
								reason: input.reason.trim(),
								outcomes: input.outcomes,
							},
						},
					},
					{ session },
				);
				if (!claim.modifiedCount) return false;
				await this.db.collection("managementAudit").insertOne(
					{
						actorId,
						action: "bet.manual-settle",
						targetId: input.betId,
						requestId: input.requestId,
						reason: input.reason.trim(),
						outcomes: input.outcomes,
						amountMillimes: settlement.payoutMillimes,
						createdAt: resolvedAt,
					},
					{ session },
				);
				await new NotificationService(this.db).record(
					{
						_id: `bet:${input.betId}:settled`,
						userId: bet.userId,
						kind: "bet.settled",
						title: `Bet ${settlement.status.toLowerCase()}`,
						message: `Your bet is ${settlement.status.toLowerCase()}. ${formatAmount(settlement.payoutMillimes, bet.currency)} returned to your wallet.`,
						href: "/bets",
					},
					session,
				);
				return true;
			},
		});
		const latest = await this.bets().findOne({ _id: id });
		if (!latest || !matchesPrevious(latest))
			throw new ManagementError(
				"CONFLICT",
				"Another settlement already resolved this bet. Refresh the queue.",
			);
		return serialize(latest);
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
		const user = await this.user(userId);
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
						? { $gte: parseAmount(filters.minStake) }
						: {}),
					...(filters.maxStake !== undefined
						? { $lte: parseAmount(filters.maxStake) }
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
			currency: user.currency ?? "TND",
		};
	}
}
