import { SiteOverview } from "@/components/site-overview";
import { publicMetadata, SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";
import Home from "./home";
export const metadata = publicMetadata(
	"GoldBet365 | Sports Fixtures, Live Scores & Casino",
	SITE_DESCRIPTION,
	"/",
);
export default function HomePage() {
	const graph = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				url: SITE_URL,
				name: "GoldBet365",
				alternateName: "Gold Bet 365",
				description: SITE_DESCRIPTION,
				inLanguage: "en",
			},
			{
				"@type": "Organization",
				"@id": `${SITE_URL}/#organization`,
				name: "GoldBet365",
				url: SITE_URL,
				logo: `${SITE_URL}/brand/apple-touch-icon.png`,
			},
		],
	};
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(graph).replace(/</g, "\\u003c"),
				}}
			/>
			<Home />
			<SiteOverview />
		</>
	);
}
