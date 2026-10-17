import { notFound } from "next/navigation";
import { ArcadeRoom } from "@/features/practice-arcade/arcade";
import { arcadeGames } from "@/features/practice-arcade/games";
import { publicMetadata } from "@/lib/seo";
export function generateStaticParams() {
	return arcadeGames.map((game) => ({ game: game.id }));
}
export async function generateMetadata({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game: id } = await params;
	const game = arcadeGames.find((g) => g.id === id);
	return game
		? publicMetadata(
				`${game.name} | GoldBet365`,
				`${game.description} Play credits only; no cash value.`,
				`/casino/arcade/${game.id}`,
			)
		: { robots: { index: false, follow: false } };
}
export default async function Page({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game: id } = await params;
	const game = arcadeGames.find((g) => g.id === id);
	if (!game) notFound();
	return <ArcadeRoom key={game.id} id={game.id} />;
}
