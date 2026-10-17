import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { InformationPage } from "@/components/information-page";
import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
	"Responsible play | GoldBet365",
	"GoldBet365 is for adults aged 18 and over. Play within your limits and stop when it is no longer enjoyable.",
	"/responsible-play",
);
export default function Page() {
	return (
		<>
			<InformationPage
				title="Responsible play"
				introduction="GoldBet365 is for adults aged 18 and over. Play within your limits and stop when it is no longer enjoyable."
				sections={[
					{
						heading: "Set a budget before playing",
						text: "Only use money you can afford to lose. Keep essential spending separate. Decide how much time and money you are comfortable spending before you begin, and stop when you reach those limits.",
					},
					{
						heading: "Never chase losses",
						text: "Do not increase stakes or keep playing to recover lost money. Random outcomes are independent, and no strategy guarantees a win. Gambling is not a source of income or a solution to financial problems.",
					},
					{
						heading: "Take a break",
						text: "Pause regularly and avoid playing when upset, tired or under the influence. Practice mode uses demo credits, but it can still take your time and attention. Stop if play interferes with work, relationships or daily responsibilities.",
					},
					{
						heading: "Account access and support",
						text: "If you need to stop using your account, contact the person who manages your account and request suspension. This is a managed suspension request, not an automated self-exclusion feature. For independent support, visit GambleAware through the link below.",
					},
				]}
			/>
			<p className="mx-auto max-w-3xl px-5 pb-10 text-[#e9bd62]">
				<a href="https://www.gambleaware.org/" target="_blank" rel="noreferrer">
					{" "}
					<LocalizedText text="Independent support from GambleAware →" />{" "}
				</a>
			</p>
		</>
	);
}
