import { notFound, permanentRedirect } from "next/navigation";
import { arcadeGames } from "@/features/practice-arcade/games";
export function generateStaticParams() {
	return arcadeGames.map((game) => ({ game: game.id }));
}
export default async function Page({
	params,
}: {
	params: Promise<{ game: string }>;
}) {
	const { game } = await params;
	if (!arcadeGames.some((item) => item.id === game)) notFound();
	permanentRedirect(`/casino/${game}`);
}
