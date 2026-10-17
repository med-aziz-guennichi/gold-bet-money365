import type { Metadata } from "next";
export const SITE_URL = "https://www.goldbet365.xyz";
export const SITE_NAME = "GoldBet365";
export const SITE_DESCRIPTION =
	"Explore sports fixtures, follow live scores and compare odds on GoldBet365. Discover fifteen distinct casino games with practice mode and published rules.";
export function publicMetadata(
	title: string,
	description: string,
	path: string,
): Metadata {
	return {
		title,
		description,
		alternates: { canonical: path },
		openGraph: {
			title,
			description,
			url: path,
			siteName: SITE_NAME,
			type: "website",
			images: [
				{
					url: "/brand/social.png",
					width: 1200,
					height: 630,
					alt: "GoldBet365 Sports & Casino",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: ["/brand/social.png"],
		},
	};
}
export const privateMetadata: Metadata = {
	robots: {
		index: false,
		follow: false,
		googleBot: { index: false, follow: false },
	},
};
