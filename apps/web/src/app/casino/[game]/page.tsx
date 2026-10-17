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

	if (!game) return { robots: { index: false, follow: false } };

	return publicMetadata(
		`${game.name} — Free Practice | GoldBet365`,
		game.description + " Play with free points. No purchases or cash value.",
		`/casino/${game.id}`,
	);
}

export default async function GamePage({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game: id } = await params;
	const game = arcadeGames.find((g) => g.id === id);

	if (!game) notFound();

	return <ArcadeRoom key={game.id} id={game.id} />;
}
