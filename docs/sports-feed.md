# Multi-sport priced events

The homepage reads the scraper's `/sports` catalogue and loads one selected sport
at a time. A browse request checks at most 30 events, returns only events with at
least one active, numeric price above 1, and returns a continuation cursor.
Unpriced events do not become visible while their prices are being checked.
The client skips up to five empty opening batches; further checks require the
load-more button. It does not poll odds in the background.

The server shares in-flight reads and caches fixtures for 90 seconds, prices and
priced pages for 60 seconds, and the catalogue for five minutes. Price-check RPCs
also have a persisted per-IP limit of 20 requests per minute. Requests made during
bet acceptance bypass display odds and retrieve the selected fixtures directly.

Leaderboard sports remain in the catalogue, but the scraper cannot provide their
competitor rows as head-to-head matches with the match-odds endpoint. The UI shows
that limitation instead of inventing an opponent or odds.

Two-way and three-way markets use their actual bookmaker, scope and selections.
Existing football settlement remains unchanged. Other sports accept only
`HOME_AWAY` / `FULL_TIME` bets. Each accepted pick stores the authoritative sport.
Settlement requires the same sport, a normal finished event and an explicit
provider winner; it never interprets a tennis set score as football goals.
Retirements, walkovers, overtime stages and missing winners require review.
Other sport markets are display-only until their settlement rules are implemented.

The free hosted deployment still uses the user's Refresh results action for
settlement. This change does not enable a paid background worker.
