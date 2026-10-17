import { publicMetadata } from "@/lib/seo";
import Lobby from "./lobby";

export const metadata = publicMetadata(
	"Casino Games & Free Practice | GoldBet365",
	"Play Crash, Plinko, Mines and Dino with free practice points on GoldBet365. No purchases, transfers or cash value.",
	"/casino",
);
export default function CasinoPage() {
	return <Lobby />;
}
