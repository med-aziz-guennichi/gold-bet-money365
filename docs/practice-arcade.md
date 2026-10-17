# Casino collection

The public catalog has fifteen distinct games. Canonical game pages live at `/casino/[game]`; older `/casino/arcade/crash`, `/casino/arcade/mines` and `/casino/arcade/plinko` links permanently redirect to their corresponding canonical page. The lobby lists each game once and uses the newer arcade presentation for those three. Dino is retired from the public catalog and new-round API. Its historical receipts and owner-scoped recovery engine are retained so existing credits/records are not discarded.

Five workspace packages add Coin Flip, Dice, Keno, Prize Wheel and Limbo. Each owns metadata, rules, engine, table and scoped styling. Engines use server RNG and the existing approved non-redeemable credit transaction service. Keno validates exactly three unique selections on both client and server. No new payment or redemption facility is introduced.

## Round UX

A persistent result banner distinguishes net wins, zero returns, full refunds and partial losses. It reports credits played, credits returned and net change. Results remain until a new round starts. Processing and retry states have explicit messages. Keno explains the three-number requirement and preserves the prior round selection for hit highlighting. Reduced-motion settings are supported by Motion and CSS.

Active-query requests are cancelled before a user action. Confirmed session responses replace the active-query cache, and stale background responses are ignored while an operation is pending. Successful results no longer wait for unrelated history refetches. Minimum presentation time is measured from the request start rather than adding another complete pause after network latency. A failed saved-round lookup blocks new rounds and offers a retry. Existing idempotent receipts and transaction recovery remain in place.

Verification includes engine boundary/paytable tests, result-summary classification tests, and disposable local MongoDB tests for every instant game, concurrency, idempotency, rollback and ownership. Production deployment and visual checks are recorded in the task separately.
