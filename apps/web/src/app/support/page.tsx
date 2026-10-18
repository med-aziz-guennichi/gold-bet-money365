import { InformationPage } from "@/components/information-page";
import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
	"Support | GoldBet365",
	"Help with accounts, credits and game results.",
	"/support",
);
export default function Page() {
	return (
		<InformationPage
			title="Support"
			introduction="Help with accounts, credits and game results."
			sections={[
				{
					heading: "Account and password help",
					text: "Contact the account manager who gave you your login details using your usual private channel. They can help with access, password resets and account suspension. There is no public sign-up.",
				},
				{
					heading: "Report a bet or game issue",
					text: "Send your manager the receipt or round ID, match or game name, approximate time and a description of what happened. A screenshot can help. Never send your password, session cookies or verification codes.",
				},
				{
					heading: "Credit and result questions",
					text: "Credits are free play points, cannot be purchased or withdrawn, and have no cash or prize value. Confirmed sports results can take time to arrive. Bets requiring review must be checked by an administrator before credits are adjusted.",
				},
				{
					heading: "Settlement timing",
					text: "Results are checked while users are connected. Free hosting also provides a daily offline settlement check, which may run late. This is not an instant or continuously running settlement service.",
				},
			]}
		/>
	);
}
