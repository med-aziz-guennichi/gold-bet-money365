import { InformationPage } from "@/components/information-page";
import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
	"Privacy information | GoldBet365",
	"How GoldBet365 uses account information for this private play-credit application.",
	"/privacy",
);
export default function Page() {
	return (
		<InformationPage
			title="Privacy information"
			introduction="How GoldBet365 uses account information for this private play-credit application."
			sections={[
				{
					heading: "Information stored",
					text: "We store your account name, phone number, password hash, account hierarchy, play-credit transactions, accepted bets, game rounds, notifications and management audit records. These records support login, access control, account history and investigating disputes.",
				},
				{
					heading: "Cookies and preferences",
					text: "Authentication uses session cookies. Your language preference and some interface or recovery preferences are stored in your browser. Signing out ends your session; clearing browser storage can remove local preferences.",
				},
				{
					heading: "Who can access information",
					text: "You can view your own history. Account managers can manage accounts within their authorized branch, and administrators can manage the network. Hosting and database infrastructure use Vercel and MongoDB Atlas. Sports fixtures and odds come from the sports data feed.",
				},
				{
					heading: "Requests and retention",
					text: "Contact your account manager to request a correction, account suspension or review of your stored information. No automatic deletion period is currently configured. Transaction and audit records are retained to preserve account integrity. Do not submit sensitive information in support messages.",
				},
				{
					heading: "Play credits only",
					text: "GoldBet365 does not provide purchases, withdrawals or redeemable prizes. Credit amounts displayed with TND are game units and are not money held for you.",
				},
			]}
		/>
	);
}
