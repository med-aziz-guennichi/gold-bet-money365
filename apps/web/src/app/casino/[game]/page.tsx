import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import { notFound } from "next/navigation";
import { ArcadeRoom } from "@/features/practice-arcade/arcade";
import { publicMetadata } from "@/lib/seo";
import GameHost from "../game-host";

export function generateStaticParams() {
	return casinoGames.map((game) => ({ game: game.id }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game: id } = await params;
	const game = casinoGames.find((g) => g.id === id);

	if (!game) return { robots: { index: false, follow: false } };

	return publicMetadata(
		`${game.name} — Free Practice | GoldBet365`,
		`${game.rules} No cash value.`.slice(0, 165),
		`/casino/${game.id}`,
	);
}

export default async function GamePage({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game: id } = await params;
	const game = casinoGames.find((g) => g.id === id);

	if (!game) notFound();

	return game.id === "dino" ? (
		<ArcadeRoom key={game.id} id="dino" />
	) : (
		<GameHost key={game.id} gameId={game.id} />
	);
}
