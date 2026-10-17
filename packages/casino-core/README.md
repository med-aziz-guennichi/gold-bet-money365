# casino-core

Shared contracts (`src/index.ts`), card utilities (`src/cards.ts`), and low-level table primitives (`src/ui.tsx`). Each game owns its own rules, engine, table and stylesheet in a sibling project. This package has no database access and cannot change wallet balances. Run `pnpm --filter @gold-bet-clean-money365/casino-core check-types`.
