import { publicMetadata } from "@/lib/seo";
import Lobby from "./lobby";

export const metadata = publicMetadata(
	"Casino Games & Free Practice | GoldBet365",
	"Explore fifteen distinct GoldBet365 games including Coin Flip, Dice, Keno, Prize Wheel and Limbo. Play with practice credits or saved non-redeemable play credits.",
	"/casino",
);
export default function CasinoPage() {
	return <Lobby />;
}
