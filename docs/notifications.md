# Notifications

Notifications are committed in MongoDB alongside the wallet transfer or bet settlement. Deterministic IDs prevent duplicate messages during retries. Failed transactions produce no notifications.

| Recipient | Trigger |
| --- | --- |
| Active admins | A client or user receives credits, including initial account funding, anywhere in the hierarchy. Includes the fournisseur, recipient name and amount. |
| Owning fournisseur | Their client crosses strictly above 80% of lifetime credits received from that fournisseur being transferred to users. Includes a reminder to call the client. |
| Bet owner | A pending bet settles as Won, Lost or Void. Includes the amount returned to the wallet. |

The 80% rule uses integer millimes and cumulative ledger totals, not bets or current user balances. A top-up that brings the ratio to 80% or below rearms the alert. Further transfers while already above 80% do not repeat it. Existing ledger history is included when the next funding operation occurs; historical notifications are not backfilled.

## Delivery and security

`/api/notifications/ws` uses Vercel's WebSocket upgrade API in production and native `ws` with the Hono Node server locally. Vercel requires Fluid compute. No additional provider or credentials are required. Normal Vercel Function quotas apply; no paid plan or daemon is enabled by this feature.

One MongoDB change stream per function instance routes committed inserts to authenticated recipients. The WebSocket only sends an invalidation signal; the client retrieves notification text through authenticated RPC. Cross-instance delivery relies on MongoDB, not process-local publishing. Reconnection reloads saved notifications, covering missed messages. A second ready signal after the database cursor starts closes the initial snapshot/watch race.

Connections require the configured exact origin and an active session/account hierarchy. Upgrade attempts are rate limited by IP and account. Session validity is checked every 30 seconds, connections rotate before Vercel's function deadline, and clients reconnect with backoff. Client messages cannot publish notifications or choose recipients. Notification listing and marking read always constrain the recipient to the authenticated account.

The bell is included in the shared account menu on the home page, dashboard and bet history. Notifications persist across logout and reconnect and can be marked read individually.

## Settlement timing in free testing

Live user connections request an owner-scoped result refresh every 30 seconds. Notifications fire after confirmed settlement and wallet commit, not from unverified odds or a predicted finish time. Offline notification delivery is recovered when the user returns. The existing settlement worker remains disabled on the free deployment: continuous settlement when no users are connected still requires a running worker. WebSockets do not independently supply match results.

## Verification

Run the integration tests with `RUN_AUTH_INTEGRATION=1` and an explicit `AUTH_TEST_DATABASE_URL` pointing to a local replica set:

```
pnpm --filter server exec tsx --test ../../packages/auth/src/notifications.integration.test.ts src/services/notification-realtime.test.ts ../../packages/api/src/betting.integration.test.ts
```

Tests create and remove disposable databases. They cover threshold boundaries/rearming, transaction rollback, idempotency, recipient isolation, actual WebSocket delivery and exactly-once settlement notifications.
