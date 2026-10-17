import { z } from "zod";
import { casinoGames } from "./casino-catalog";

export const casinoGameSchema = z.enum([
	...casinoGames.map((game) => game.id),
	"dino",
]);
export const casinoInputSchema = z
	.object({
		requestId: z.uuid(),
		game: casinoGameSchema,
		version: z.string().min(1).max(30),
		stake: z.string().min(1).max(20),
		choice: z.string().min(1).max(20),
		numbers: z.array(z.number().int().min(0).max(36)).max(3),
	})
	.strict();
