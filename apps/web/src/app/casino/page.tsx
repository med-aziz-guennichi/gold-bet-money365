import { publicMetadata } from "@/lib/seo";
import Lobby from "./lobby";

export const metadata = publicMetadata(
	"Casino Games & Free Practice | GoldBet365",
	"Explore ten GoldBet365 casino games including Blackjack, Mines, Crash and Video Poker. Read the rules and try practice mode with separate demo credits.",
	"/casino",
);
export default function CasinoPage() {
	return <Lobby />;
}
