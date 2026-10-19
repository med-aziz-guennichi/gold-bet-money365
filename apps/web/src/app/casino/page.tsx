import { publicMetadata } from "@/lib/seo";
import Lobby from "./lobby";

export const metadata = publicMetadata(
	"Casino Games & Free Practice | GoldBet365",
	"Explore twenty distinct GoldBet365 games including Scratch Nine, Poker Dice, Hand Duel, Lucky Seven and Three Card Studio. Play with practice credits or saved non-redeemable play credits.",
	"/casino",
);
export default function CasinoPage() {
	return <Lobby />;
}
