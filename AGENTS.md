# Repository engineering guide

Read more specific instructions before editing a subtree. In particular, preserve
`apps/web/AGENTS.md` and consult the installed Next.js guides it identifies.

## Architecture and boundaries

- Use Node 24 and pnpm 12 (see `packageManager`); keep the pnpm lockfile consistent.
  This is a Turborepo workspace, not a collection of independent npm installs.
- `apps/web`: Next.js App Router, React, Tailwind CSS, Motion, TanStack Query, and
  oRPC client. Routes compose features; reusable product components belong in
  `src/components`, feature hooks/state in `src/features`.
- `apps/server`: Hono entry point, transport adapters, Flashscore service, and
  environment/bootstrap integration. Keep upstream HTTP/cache policy here.
- `packages/api`: typed oRPC contracts, input validation, betting/game services,
  and authoritative rules. Keep browser presentation out of this package.
- `packages/auth`: Better Auth, hierarchical account management, wallet transfers,
  rate limits, and persisted notifications. Enforce branch ownership on the server.
- `packages/db`: MongoDB/Mongoose infrastructure. This project does not use Prisma
  or PostgreSQL; do not add either for stylistic consistency.
- `packages/ui`, `packages/i18n`, `packages/config`: shared primitives, translations,
  and strict TypeScript configuration. Reuse them rather than forking conventions.
- `packages/casino-*`: individual game engines/UI; `casino-core` owns shared types
  and presentation contracts. Preserve historical round compatibility.
- `apps/scraper`: Python Flashscore integration. `workers/settlement`: settlement
  worker. Treat upstream data as fallible and keep external calls bounded.

## Implementation conventions

- Follow adjacent naming: kebab-case modules, PascalCase React components,
  camelCase functions/values. Prefer explicit exports and cohesive modules.
- Keep TypeScript strict and public contracts typed. Validate external input with
  Zod and normalize upstream payloads at their boundary. Do not fix type errors
  with broad `any`, unchecked assertions, or disabled compiler rules.
- Server-side rules are authoritative. Never trust client-supplied prices,
  balances, roles, game results, or ownership. Preserve atomic transactions,
  integer credit arithmetic, idempotency, and cross-account isolation.
- Credits are non-redeemable play credits. Do not introduce hidden outcome
  manipulation or alter stored balances merely to test an interface.
- Bound network concurrency, retries, and pagination. Cache keys must reflect
  inputs and authorization where applicable. Preserve freshness and fail closed
  when a market's state or result is uncertain; never invent live scores or odds.
- Surface actionable errors without secrets; distinguish unavailable data from
  an empty result. Prevent duplicate submissions and make success/failure clear.
- Never print `.env` values, bootstrap passwords, database URIs, or private account
  data. Use disposable local databases for integration tests, never production.

## Interface and animation

- Preserve the GoldBet365 design system and shared shadcn/Base UI primitives.
  Build composable components, consistent spacing/type hierarchy, and fluid
  mobile layouts with no horizontal page overflow.
- Include loading, empty, error, success, pending, disabled, and selected states.
  Keep existing content visible during background polling. Use semantic controls,
  labels, keyboard navigation, focus visibility, and clear touch targets.
- Translate user-facing text through `packages/i18n`; check Arabic RTL and French
  expansion as well as English. Keep identifiers and participant names intact.
- Prefer CSS transitions for simple feedback; use the existing Motion dependency
  for complex sequences. Favor transform/opacity, respect reduced motion, clean up
  timers/subscriptions, and keep round outcomes and button availability clear.
- Keep secrets and server-only dependencies out of client components. Choose
  server components where appropriate and consult installed Next.js docs.

## Checks and workflows

Inspect -> brief plan -> implement -> focused checks -> review diff -> report.
For frontend work, inspect the rendered result at phone and desktop widths using
the browser tool permitted in the active session. Verify actual interactions,
not just screenshots. Report any checks that could not be performed.

Commands from the repository root:

```powershell
pnpm check-types
pnpm --filter web check-types
pnpm --filter server check-types
pnpm lint
pnpm exec biome check <changed-files>
pnpm exec biome check --write <changed-files>
pnpm test:sports
pnpm --filter web build
pnpm build
```

- Biome is the existing formatter/linter. Do not add competing ESLint/Prettier
  configurations. `pnpm lint` is read-only; `pnpm check` and `pnpm lint:fix` mutate
  files. Prefer scoped formatting to avoid unrelated changes.
- Unit tests use Node's test runner with `tsx`; add tests for meaningful behavior
  and regressions. Integration suites require their documented opt-in flags and a
  disposable local MongoDB replica set. Never point them at the hosted database.
- Build scripts generate Varlock types. Preserve its environment validation and
  Next integration. If a Windows runtime issue blocks a build, report it and use
  the established environment-loader workaround without logging serialized env.
- Playwright MCP supports exploratory browser QA; it is not a repository test
  suite. Add Playwright Test only when repeatable automated browser tests justify
  a new dependency and test-data setup.
- Do not commit, push, deploy, change production settings, or install significant
  dependencies as part of development-tool configuration. Obtain authorization
  for those actions through the active task.
