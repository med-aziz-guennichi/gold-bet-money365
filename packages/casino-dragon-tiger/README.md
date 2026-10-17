# casino-dragon-tiger

Independent workspace project for dragon-tiger. `src/engine.ts` owns server rules; `src/table.tsx` owns the game experience. The host supplies authentication, wallet transactions, persisted rounds and sounds. This package cannot directly change balances. Run `pnpm --filter @gold-bet-clean-money365/casino-dragon-tiger check-types`.
