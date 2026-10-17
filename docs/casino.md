# Animated casino

`/casino` hosts ten RNG games. These are animated games, not live dealer streams. The lobby is public; only active role `user` can wager existing wallet credits. Managers cannot play. No provider, paid hosting tier or background worker is required.

## Architecture

- `packages/api/src/casino-catalog.ts`: public game definitions, fixed paytables and version. Multipliers include the original stake. Version changes require clients to reload before wagering.
- `casino-engine.ts`: deterministic rules with injected random integer source, independently testable. Production uses Node crypto `randomInt`; no `Math.random`, balance-based adjustment, forced wins or forced losses.
- `casino-service.ts`: validation, distributed 20-round/minute user limit, immutable round receipts, owner-only history and recovery. Stakes 0.100–100.000 TND. Invalid choices and extraneous numbers are rejected.
- `WalletService.casinoRound`: one MongoDB transaction checks the entire active hierarchy, locks accounts, checks available credits, debits stake, credits return, stores the result, writes both ledger entries and audit, and inserts a private settlement notification. Failed writes roll everything back. All arithmetic uses integer millimes and payout multiplication uses BigInt, rounding down.
- `casinoRound` collection: deterministic primary key `userId:requestId` protects against duplicates across instances. Request fingerprints reject changed parameters on retries. Outcomes are drawn once before the retryable transaction; transaction retries cannot reroll. Simultaneous duplicates serialize on wallet guards and return the committed receipt.
- UI: no automatic replay, one request at a time, pending request persisted per user in sessionStorage before sending. An interrupted request can be retried with the exact same ID or recovered. Animation never controls outcomes. Recent rounds show wager, return, outcome, selection, timestamp and rules version. Notifications use the existing private WebSocket and sound system.

Payouts are recorded separately from sports bets. Wallet history includes casino stake and return entries. Existing sports settlement does not process casino rounds.

## Rules

The catalog is the source of truth. Roulette uses single zero. Baccarat uses an eight-deck shoe freshly sampled without replacement for each round, standard third-card rules and 5% banker commission. Dragon Tiger also uses eight decks, ace low and half-stake refunds on equal ranks. Sic Bo excludes triples from small/big bets. Slots, Keno 20, Plinko, wheel, coin and Dice 100 use the custom fixed paytables published in the lobby; they do not claim a third-party provider's RTP or certification. Theoretical RTP describes the long-run expectation, never a guarantee per session. Millime rounding can slightly reduce returns on fractional stakes.

Research: [table game rules index](https://massgaming.com/regulations/table-games-rules/), [Node 24 crypto randomInt](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptorandomintmin-max-callback). These sources informed implementation; no independent game certification is claimed.

## Verification

From `apps/server`, run `node --import tsx --test ../../packages/api/src/casino-engine.test.ts ../../packages/api/src/casino.integration.test.ts`. Integration tests require `RUN_AUTH_INTEGRATION=1` and `AUTH_TEST_DATABASE_URL` pointing at a local replica set. They create a random `goldbet_casino_test_*` database, never production records. They cover all games, exact wallet arithmetic, concurrent duplicate requests, changed-request conflicts, private recovery/history, role/ancestor checks, insufficient credits, rollback and distributed limits.
