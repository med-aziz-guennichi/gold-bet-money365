# GoldBet365 game collections

The lobby includes the ten original classic editions at `/casino/[game]` and four arcade editions at `/casino/arcade/[game]`. Crash, Mines and Plinko editions deliberately share their corresponding engines and saved active round; changing editions cannot start an additional concurrent session or change its rules. Dino is an independent workspace package and interactive session engine.

Signed-in user accounts default to the existing stored play-credit wallet. The owner explicitly confirmed on 2026-10-17 that credits cannot be purchased or redeemed for money or prizes and approved game deductions/returns after an automatic-review warning. Manager accounts and guests can use separate practice mode. Account mode uses the existing server-authoritative engines, MongoDB transactions, exact integer accounting, role/ancestor checks, rate limits and idempotent recovery. No browser-generated outcome or requested payout is accepted in account mode. UI labels identify the balance as play credits with no cash value.

Dino preselects a hidden collision step using server crypto randomness. Every jump independently survives with probability 80%; successful returns are floor(100*1.2^steps)/100. After twenty successes collection is automatic. Its public view contains only the current step and multiplier. Jump and collection requests use the same persisted action receipts as the other interactive games.

Motion and shared shadcn/Base UI controls provide animations and accessible controls. The new screens reuse useGameRoom rather than maintaining a parallel balance implementation. Plinko pockets use the actual shared engine paytable. Pending network requests retain their identifier and offer recovery or an identical retry. The public sitemap includes all fourteen editions.

Verification: engine tests, new Dino boundary tests, and local disposable MongoDB transaction tests cover duplicate starts/actions, hidden state, ownership, concurrent collection and rollback. No production player balance was used for testing.
