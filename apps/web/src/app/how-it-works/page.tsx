import { InformationPage } from "@/components/information-page";
import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
	"How GoldBet365 works | GoldBet365",
	"Learn how to browse matches, read decimal odds, review your bet slip and use casino practice mode.",
	"/how-it-works",
);
export default function Page() {
	return (
		<InformationPage
			title="How GoldBet365 works"
			introduction="Learn how to browse matches, read decimal odds, review your bet slip and use casino practice mode."
			sections={[
				{
					heading: "Find a fixture",
					text: "Choose a sport and date on the sports page. Use In-play to filter the loaded fixtures to reported live events. Open View offers for match details, scores and available markets. Closed, suspended or unverified events cannot accept bets.",
				},
				{
					heading: "Review your bet slip",
					text: "Tap an available price to select it. On mobile, the floating Your bet slip button opens your picks, stake and potential return. A combined bet allows one selection per match. Review every selection before confirming.",
				},
				{
					heading: "Understand decimal odds",
					text: "Combined decimal odds are multiplied. For example, 2.00 \u00d7 1.50 gives total odds of 3.00. A 10 TND stake at those odds has a potential return of 30 TND including the stake, if both picks win. A losing selection loses the combined bet; void selections are handled according to settlement rules.",
				},
				{
					heading: "Check accepted bets",
					text: "The server checks your account, balance, event availability and current prices before acceptance. Accepted bets are saved to your account. Settlement depends on confirmed results, not the displayed scheduled end time. Check your private bet history for status and any payout.",
				},
				{
					heading: "Try casino practice",
					text: "Each casino game starts in Practice mode with separate demo credits. Read its rules before playing. Wallet mode is available only to eligible user accounts. Every round is independent; a previous loss does not make a future win more likely.",
				},
			]}
		/>
	);
}
