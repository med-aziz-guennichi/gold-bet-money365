import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import { notFound } from "next/navigation";
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
	return {
		title: game ? `${game.name} · Fieldhouse Casino` : "Casino · Fieldhouse",
		description: game?.rules,
	};
}
export default async function GamePage({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game: id } = await params;
	const game = casinoGames.find((g) => g.id === id);
	if (!game) notFound();
	return <GameHost gameId={game.id} />;
}
