import { publicMetadata } from "@/lib/seo";
import Lobby from "./lobby";

export const metadata = publicMetadata(
	"Casino Games & Free Practice | GoldBet365",
	"Explore ten classic games and four arcade editions on GoldBet365. Play with free practice credits or your saved non-redeemable play credits.",
	"/casino",
);
export default function CasinoPage() {
	return <Lobby />;
}
