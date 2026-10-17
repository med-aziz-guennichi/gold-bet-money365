import { casinoGames } from "@gold-bet-clean-money365/api/casino-catalog";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
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
		`${game.name}: Rules & Practice | GoldBet365`,
		`Play ${game.name} in practice mode on GoldBet365. ${game.rules}`.slice(
			0,
			165,
		),
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
	return (
		<>
			<GameHost gameId={game.id} />
			<section className="mx-auto max-w-5xl px-5 py-10 text-white">
				<h2 className="font-bold text-xl">
					<LocalizedText text="How" /> <LocalizedText text={game.name} />{" "}
					<LocalizedText text="works" />
				</h2>
				<p className="mt-4 text-white/60 leading-7">
					<LocalizedText text={game.rules} />
				</p>
				<p className="mt-3 text-sm text-white/60">
					{" "}
					<LocalizedText text="Return information:" />{" "}
					<LocalizedText text={game.rtp} />
					<LocalizedText text=". Practice credits are separate from your account wallet. Only eligible user accounts can use wallet mode." />{" "}
				</p>
				<nav className="mt-6 flex flex-wrap gap-5 text-[#e9bd62] text-sm">
					<Link href="/casino">
						<LocalizedText text="All casino games" />
					</Link>
					<Link href="/responsible-play">
						<LocalizedText text="Responsible play" />
					</Link>
				</nav>
			</section>
		</>
	);
}
