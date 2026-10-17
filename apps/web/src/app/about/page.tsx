import { InformationPage } from "@/components/information-page";
import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
	"About GoldBet365 | GoldBet365",
	"GoldBet365 brings sports fixtures, scores, odds and original animated casino games together in one place.",
	"/about",
);
export default function Page() {
	return (
		<InformationPage
			title="About GoldBet365"
			introduction="GoldBet365 brings sports fixtures, scores, odds and original animated casino games together in one place."
			sections={[
				{
					heading: "Sports in one place",
					text: "Explore football, tennis, basketball and other supported sports. Browse fixtures for today and the next two days, check reported live scores and review recent results. Available competitions and markets depend on the data provider.",
				},
				{
					heading: "Original casino games",
					text: "The casino includes Roulette, Blackjack, Baccarat, Dragon Tiger, Sic Bo, Slots, Mines, Crash, Video Poker and Plinko. Rules and return information are available on each game page. Practice mode uses demo credits and does not change your wallet.",
				},
				{
					heading: "Account access",
					text: "Accounts are managed by the account hierarchy; there is no public sign-up. Sign in using your phone number and password. Only accounts with the user role can place wallet bets. Your accepted bets and completed casino rounds are available in your account history.",
				},
				{
					heading: "Data and responsible use",
					text: "Sports information is supplied through Flashscore feeds and may be delayed. Prices are checked before a bet is accepted. GoldBet365 is intended for adults aged 18 and over. Set limits, take breaks and never treat gambling as a way to earn income.",
				},
			]}
		/>
	);
}
