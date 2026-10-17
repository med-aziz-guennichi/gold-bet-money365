# casino-slots

Independent workspace project for slots. `src/engine.ts` owns server rules; `src/table.tsx` owns the game experience. The host supplies authentication, wallet transactions, persisted rounds and sounds. This package cannot directly change balances. Run `pnpm --filter @gold-bet-clean-money365/casino-slots check-types`.
