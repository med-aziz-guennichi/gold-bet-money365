# Fieldhouse Originals

Ten independent game workspace projects share a secure account and wallet host. Each `packages/casino-<game>/` project owns its package manifest, TypeScript configuration, server engine, client table, stylesheet and README. They can be checked independently with `pnpm --filter @gold-bet-clean-money365/casino-<game> check-types`.

| Project | Production route | Interaction |
| --- | --- | --- |
| casino-blackjack | /casino/blackjack | Hit, stand, dealer play and natural blackjack |
| casino-mines | /casino/mines | Reveal tiles, avoid mines, cash out |
| casino-crash | /casino/crash | Timed flight and authoritative cash-out |
| casino-video-poker | /casino/video-poker | Hold individual cards, draw once, hand evaluation |
| casino-roulette | /casino/roulette | Number grid and outside wagers, wheel and ball |
| casino-baccarat | /casino/baccarat | Player/banker/tie, standard third-card rules |
| casino-dragon-tiger | /casino/dragon-tiger | Two-card duel, rank comparisons and ties |
| casino-sic-bo | /casino/sic-bo | Three dice, small/big/any-triple |
| casino-slots | /casino/slots | Three reels, one payline, custom vector symbols |
| casino-plinko | /casino/plinko | Eight-step path and nine payout bins |

## Boundaries

`casino-core` supplies contracts, card utilities and low-level visual primitives. Game projects never write balances or choose account ownership. The API chooses a registered engine; the host performs authenticated wallet operations. Code is split by game, not duplicated into ten independently funded services. The existing free Vercel project serves the lobby and all dedicated routes; no additional provider or paid service is required.

Instant games use `CasinoService` and a single atomic stake/result/payout transaction. Interactive games use `CasinoSessions`: start commits the stake and private session, actions update the same session, and settlement atomically writes its return, immutable receipt, ledger, audit and private notification. Integer millimes and BigInt payout multiplication prevent floating-point balance errors. Parent guards serialize wallet operations with funding, sports wagers and suspension checks. A failed final receipt write rolls back the payout and leaves the game resumable.

Private decks, mine positions and Crash's hidden bust point remain in MongoDB. Public session views reveal only legal information. Every action has a unique idempotency ID and payload fingerprint. Concurrent cash-outs can pay only once. Reloading or service restarts preserve wallet rounds. One active session per user per interactive game is enforced under the account guard. Invalid actions, user impersonation, stale rules, managers, suspended ancestors and insufficient funds fail closed.

Crash uses a personal timed round. The server processing time determines whether a cash-out wins and its actual return; the displayed multiplier is an estimate between authenticated status reads. Active Crash status refreshes every 700 ms while the game is open. An expired offline round is finalized on the next status/recovery/action request; this free setup does not run a permanent game daemon. Maximum 100x rounds automatically pay on that same finalization. No claim is made of a provider's shared multiplayer Crash room or live dealer stream.

## Practice

Every room defaults to explicitly labeled practice mode with a separate 1,000 TND demo balance. Practice runs the same pure rules locally using Web Crypto random integers and never calls wallet wager endpoints or persists fake account history. Wallet mode requires an active role `user`; managers can practice. Switching modes is blocked during a round or uncertain request. Wallet results are always computed by the server, regardless of any client-side practice code.

Completed wallet rounds, including older retired games, remain available at `/casino/history`. No historical records or production balances are migrated or removed. Each game also shows recent wallet receipts. The old shared-board UI has been removed.

## Rules and verification

Rules and fixed total-return tables are versioned in each project. There is no balance-based win adjustment or forced-loss algorithm. Casino results are original RNG implementations, with no claim of independent certification or affiliation with another operator. Research references: [Evolution first-person game experiences](https://games.evolution.com/first-person/), [Pragmatic Play game interaction features](https://www.pragmaticplay.com/en/live-casino/), [published table-game rules](https://massgaming.com/regulations/table-games-rules/), and [Node crypto randomness](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptorandomintmin-max-callback).

From `apps/server`, run `node --import tsx --test ../../packages/api/src/casino-engine.test.ts ../../packages/api/src/casino-interactive.test.ts ../../packages/api/src/casino.integration.test.ts ../../packages/api/src/casino-sessions.integration.test.ts`. Set `RUN_AUTH_INTEGRATION=1` and `AUTH_TEST_DATABASE_URL` to a local MongoDB replica set. Tests use randomly named disposable databases, never production wallet records. Coverage includes third-card rules, probability tables, poker hand categories, player actions, hidden state, restart recovery, duplicate actions, cash-out races, exact ledger arithmetic, transaction rollback, rate limits and account hierarchy checks.
