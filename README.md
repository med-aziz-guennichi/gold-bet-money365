# gold-bet-clean-money365

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Node.js** - Runtime environment
- **Mongoose** - TypeScript-first ORM
- **MongoDB** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses MongoDB with Mongoose.

1. Make sure you have MongoDB set up.
2. Update your `apps/server/.env` file with your MongoDB connection URI.

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Accounts and permissions

Login uses a phone number and password, without SMS verification. Tunisian 8-digit numbers and `00216` numbers normalize to `+216`; international numbers must include their country code. There is no public signup. Account managers create credentials in `/dashboard`.

| Role | Dashboard and management scope |
| --- | --- |
| Admin | All accounts; creates fournisseurs, clients, and users under the correct parent |
| Fournisseur | Own clients and their users; creates clients and users within that branch |
| Client | Own users only |
| User | Website and own password settings; no dashboard or management API access |

Managers can rename, suspend, re-enable, and reset passwords for accounts within their scope. Roles and ownership are immutable through the dashboard. Parents are validated server-side, and ownership fields are never accepted from the browser. Suspending a manager blocks the whole branch and revokes its sessions. Password resets revoke the target's sessions. Every signed-in account can change its own password at `/account` using its current password.

### TND wallets

Fournisseurs, clients, and users have server-owned wallets. Admin issues funds to a fournisseur. Funding a client deducts the same amount from its fournisseur; funding a user deducts it from its client. Admin may manage every branch, but funding a client or user still debits the immediate parent's wallet. Creating an account accepts an initial TND amount, and **Add funds** updates an existing account. Existing accounts begin at zero; no arbitrary balance overwrite or withdrawal is exposed.

Amounts are exact integer millimes (1 TND = 1,000 millimes), with up to three decimal places. The account, credentials, wallet, debit/credit, audit record, and idempotent receipt commit in a single MongoDB transaction. A failed transfer creates no partial account or debit. Insufficient balances, suspended accounts, and cross-branch transfers are rejected. Each create/top-up has a stable request UUID; retries cannot apply it twice. Wallet histories are paginated and restricted to the same ownership hierarchy. Bets now spend these server-owned wallet credits; browser storage cannot create or modify spendable credits.

**MongoDB must be a replica set or sharded deployment.** Standalone databases reject wallet writes safely. For this workstation's existing MongoDB Windows service, open PowerShell **as Administrator**, then run from the repository root:

```powershell
.\scripts\enable-wallet-transactions.ps1
```

This script validates the local application URL, backs up `mongod.cfg`, adds a single-node `goldbet-wallets` replica set, restarts only the selected MongoDB service, initializes the replica set, and verifies an actual transaction. It preserves the existing data directory and accounts. It needs Windows Administrator rights because this changes a Windows service. The original configuration backup path is printed. If the service fails to restart, the script restores its original configuration. An initialized replica set can be checked again by safely rerunning the script. Authenticated or remote deployments require their own replica-set configuration; use Atlas or an appropriately secured production replica set. A local single-node set supports transactions but does not provide high availability.

Until this one-time step is completed on a standalone deployment, wallet transfers and account creation return a setup error without changing balances or creating partial accounts. Balance/history reads remain available.

Wallet regression tests can use an isolated transaction-capable database server:

```powershell
$env:RUN_AUTH_INTEGRATION = '1'
$env:AUTH_TEST_DATABASE_URL = 'mongodb://127.0.0.1:27018/?replicaSet=wallet-tests&directConnection=true'
pnpm --filter server exec tsx --test ../../packages/auth/src/money.test.ts ../../packages/auth/src/management.integration.test.ts
```

The integration tests create randomly named temporary databases, test exact amounts, initial funding, duplicate requests, concurrent spending, rollback, and branch isolation, then delete only those test databases. No example amount is automatically allocated to real accounts.

### Betting with user wallet credits

Only active accounts with role `user` can place bets on the home or match page. Admin, fournisseur, and client accounts can manage their branches but cannot wager. `bets.place` is POST-only and derives ownership from the authenticated session; the browser cannot choose a bettor, balance, return, or settlement status.

Placement validates the current match state and uncached active bookmaker prices on the server. Changed or unavailable prices, suspended/finished events, unavailable live offers, invalid stakes, and insufficient credits are rejected. A bet supports up to ten matches, one selection per match; same-match combinations are not priced by multiplying correlated outcomes. Quotes expire after 15 seconds. Potential returns are calculated with integer arithmetic and rounded down once to a millime.

The wallet stake debit, accepted match/market/odds snapshots, `bet` document, stake ledger entry, and audit record commit in one MongoDB transaction. A stable request UUID prevents duplicate charges; identical retries return the original bet even after the match closes. Bet history is read from MongoDB and restricted to the signed-in user, so it survives reloads and device changes. Legacy browser-only demo balances/bets are not imported into wallet credits.

Bets start as **Pending**. A server worker checks rotating batches every 30 seconds and recovers pending work after a restart. It waits for all selections to have confirmed final regulation-time results, then records **Won**, **Lost**, or **Void**, the actual return and settlement time. Wallet credits, an immutable payout ledger entry, audit record and the conditional pending-to-settled transition commit in one MongoDB transaction. Concurrent workers and retries cannot pay twice. Failed payments remain pending and retry automatically, including when the wallet reaches its balance limit. Earned payouts can still credit suspended accounts.

Automatic settlement supports full-time 1X2, recognized double chance, both teams to score, exact scores, and whole/half-goal over/under lines. A pushed line has odds 1 in an accumulator; all pushes refund the stake. Unsupported markets, quarter lines, cancellations, interrupted events, extra-time/penalty finals without a verified regulation score, and ambiguous provider results remain pending with an explicit review message. They require an operator review workflow; no result or refund is guessed. The worker must run in a persistent server process.

Users see their wallet credits directly in the navbar. Wallet and bet history refresh every 30 seconds while the page is visible; this does not poll odds. Match details refresh scores and periods separately, and show the latest reported event minute. The current scraper does not expose a running match clock; event minutes are labeled accordingly. Provider caching and delayed final results can delay settlement, so the UI promises payment after confirmed results rather than an exact wall-clock time.

Signed-in users can open **Bet history** from their account menu or **View all bets** in the bet slip (`/bets`). The page supports status, inclusive placement dates in the browser’s local timezone, minimum/maximum stake, single/multiple selections, literal team/league search and exact receipt ID search. Users can sort by date, stake or paid return and browse 10, 20 or 50 records per page. All filters and summaries are computed in MongoDB under the authenticated user’s ownership constraint. Totals cover every matching bet, including records outside the current page; settled net return excludes pending stakes. Expanding a receipt shows its accepted markets and bookmakers. Query validation rejects forged ownership, invalid ranges and excessive page sizes, with bounded search text and query execution time.


Run the regression tests against a transaction-capable MongoDB server:

```powershell
$env:RUN_AUTH_INTEGRATION = '1'
pnpm --filter server exec tsx --test ../../packages/api/src/betting-money.test.ts ../../packages/api/src/bet-settlement.test.ts ../../packages/api/src/betting.integration.test.ts
```

These tests use a randomly named `goldbet_bet_test_*` database, deterministic feed fixtures, real wallet transactions, and the RPC router. They cover role restrictions, insufficient funds, duplicate submissions, concurrent spending, stale/inactive offers, persistence failure rollback, and private history. Only temporary test accounts receive test funds.

### Initial administrator

Create `apps/server/.env.admin.local` (Git-ignored) with private bootstrap credentials:

```dotenv
INITIAL_ADMIN_NAME="Your full name"
INITIAL_ADMIN_PHONE="+21612345678"
INITIAL_ADMIN_PASSWORD="a-unique-password-at-least-12-characters"
```

With MongoDB available and `apps/server/.env` configured, run:

```powershell
pnpm --filter server auth:bootstrap
```

If the Windows package runner crashes, run `node --import tsx src/bootstrap-admin.ts` directly from `apps/server` with Node.js configured in your PATH.

The initial account for this workspace has already been provisioned; its generated password is in that private local file. Bootstrap is explicit and has no HTTP endpoint. Re-running it never resets the password or promotes an existing non-admin account. It refuses to create a second administrator. After changing your initial password, remove the bootstrap password from local storage. If a bootstrap was interrupted, inspect the disabled account and `bootstrapLock` with an authorized database operator before recovery; do not automatically clear the lock or promote an existing account.

### Authentication security and deployment

- Better Auth handles password hashing and sessions using its [phone-number plugin](https://better-auth.com/docs/plugins/phone-number). Its [admin plugin](https://better-auth.com/docs/plugins/admin) is used only through server-side provisioning calls; its HTTP routes are blocked.
- Passwords are 12–128 characters. Sessions last 8 hours, use HttpOnly cookies, and do not cache authorization claims in cookies. Live database checks validate every parent account.
- Login is limited by socket IP and normalized phone number. Additional authentication limits, management read/write limits, and a 300-request/minute API limit use atomic MongoDB counters shared across server instances. Expired counters are removed by a TTL index.
- Public auth routes are explicitly allowlisted. Email login, signup, OTP, impersonation, self-service role changes, and generic admin routes are unavailable. Management mutations require POST and the configured browser origin; OpenAPI routes receive the same protection.
- Keep `BETTER_AUTH_SECRET` random and private, set `BETTER_AUTH_URL` to the API URL, and set `CORS_ORIGIN` to the exact browser origin. Use HTTPS in production: secure cookies are enabled from the API URL. Cross-site HTTPS deployments use `SameSite=None`; local HTTP development uses `Lax`.
- Forwarded IP headers from the browser are ignored. Behind a reverse proxy the socket IP identifies the proxy, so limits are shared by clients behind that proxy. Configure a trusted proxy integration before deploying at scale; never simply trust user-supplied `X-Forwarded-For`.
- Startup creates unique phone/email/session indexes and ownership indexes. Resolve duplicate legacy identities before deploying; startup deliberately fails if unique identities cannot be enforced. Existing email-only accounts need explicit migration into the hierarchy; they are never automatically promoted.
- Management audit records contain actor, action, target, and timestamp, without passwords or session tokens. Back up and restrict access to MongoDB, and retain audit logs according to your operational policy.

### Security tests

```powershell
pnpm --filter server exec tsx --test ../../packages/auth/src/access.test.ts
$env:RUN_AUTH_INTEGRATION = '1'
pnpm --filter server exec tsx --test ../../packages/auth/src/management.integration.test.ts
```

Integration tests require a local MongoDB account permitted to create and drop a temporary database. They use a randomly named `goldbet_auth_test_*` database and delete only that database when finished. They cover tenant isolation, privilege escalation, public auth restrictions, unverified phone/password login, session revocation, concurrent rate limiting, and idempotent bootstrap.

## Local Football Feed

The web app reads football fixtures, live matches, bookmaker markets and prices, final scores, match statistics, and incident summaries from the local [Flashscore scraper](https://github.com/omkarcloud/flashscore-scraper). Run it in its own terminal:

```powershell
git clone https://github.com/omkarcloud/flashscore-scraper
Set-Location flashscore-scraper
py -m pip install -r requirements.txt
py run.py
```

Keep that scraper running at `http://127.0.0.1:8000` while using this app. The server uses that address by default. To use another address, set `FLASHSCORE_API_URL` in `apps/server/.env`; if your scraper requires authentication, set `FLASHSCORE_API_KEY` there as well. These values stay on the server and are never sent to the browser. The web client accesses the feed through typed oRPC procedures.

### Football data flow

The browser calls `flashscore.matches`, `flashscore.odds`, and `flashscore.results` through oRPC. Their input and output types live in `packages/api`; `apps/server/src/services/flashscore.ts` is the only layer that talks to the scraper and maps its response into the app's football models. The match odds request returns every market offered by the scraper and detail pages group those markets into collapsed accordions. The results feed is used to verify that events are still open when accepting a bet. Bet settlement and payouts are not performed in the browser. Keep scraper credentials in `apps/server/.env` only.

## Languages

The web interface supports English, French, and Arabic. Use the language selector in the header or sign-in screen; the choice is saved in the browser. Arabic automatically switches the page to right-to-left layout. UI copy and language mappings live in `apps/web/src/features/i18n`; add new interface labels to both the French and Arabic dictionaries so they do not fall back to English. Match and competition names are supplied by the Flashscore feed and remain in the source language.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@gold-bet-clean-money365/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Deployment

### Vercel + MongoDB Atlas

The full deployment configuration is in `vercel.json`: Next.js, Hono, a private
Python scraper service, and a persistent settlement daemon. Follow the
[Vercel deployment guide](docs/deployment-vercel.md) for account setup, production
environment variables, admin bootstrap, database cutover and release verification.
The Vercel project root must remain the repository root. The daemon is disabled for free testing; users can check final results from bet history. Continuous settlement
requires a suitable paid plan; Hobby's daemon allowance only lasts about ten hours.

### Docker Compose

- Target: web + server
- Config: `docker-compose.yml` (app Dockerfiles live in `apps/*/Dockerfile`)
- Build images: pnpm run docker:build
- Start: pnpm run docker:up
- Logs: pnpm run docker:logs
- Stop: pnpm run docker:down

Environment variables are read from each app's `.env` file (baked into web builds for public variables) and overridden in `docker-compose.yml` for container networking.

For more details, see the guide on [Deploying with Docker Compose](https://www.better-t-stack.dev/docs/guides/docker).

## Git Hooks and Formatting

- Initialize hooks: `pnpm run prepare`
- Run checks: `pnpm run check`

## Project Structure

```
gold-bet-clean-money365/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run check`: Run Biome formatting and linting
- `pnpm run docker:build`: Build the Docker Compose images
- `pnpm run docker:up`: Build and start the Docker Compose stack
- `pnpm run docker:logs`: Tail logs from the Docker Compose stack
- `pnpm run docker:down`: Stop the Docker Compose stack
