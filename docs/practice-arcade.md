# Practice arcade

The public casino lobby now exposes four original browser-only practice games: Crash, Plinko, Mines and Dino. The game concepts were selected after reviewing tanh1c/stake-originals-clone; no upstream code, branding, tracking scripts or third-party Dino assets were copied.

UI: shared Base UI/shadcn buttons and Motion for React, responsive layouts, keyboard focus states and reduced-motion support. Each game has a dedicated route. The client resets its free practice points on navigation; no account wallet, funding, settlement API, database or authentication dependency is imported by the new arcade. No purchases, transfers or redemption are supported. Previous casino backend code is retained for historical records; the replacement public screens do not call it.

Randomness uses rejection-sampled Web Crypto. These are casual simulations, not certified wagering games. Rules are visible on each game page. One active round at a time; a synchronous ref guards rapid repeated inputs. Crash collection checks elapsed time again on the click, so a delayed browser interval cannot collect after the crash. Plinko uses a preselected eight-step path and settles after its animation. Timers are removed on unmount. Mines have three distinct positions; Dino has an explicit independent 80% chance at each jump and automatic collection after 20 successes.

Verification: run web check-types and the games.test.ts suite with node --import tsx from the server workspace. Production deployment and visual browser checks must be recorded separately; a local type check does not confirm either.
