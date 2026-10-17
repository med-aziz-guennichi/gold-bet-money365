import type { Metadata } from "next";
import { Figtree, Geist, Geist_Mono, Outfit } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const figtreeHeading = Figtree({
	subsets: ["latin"],
	variable: "--font-heading",
});
const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "GoldBet365 | Sports & Casino",
	applicationName: "GoldBet365",
	metadataBase: new URL("https://www.goldbet365.xyz"),
	icons: {
		icon: "/icon.svg",
		shortcut: "/icon.svg",
		apple: "/brand/apple-touch-icon.png",
	},
	openGraph: {
		title: "GoldBet365 | Sports & Casino",
		description: "Your home for sports, live scores and original casino games.",
		siteName: "GoldBet365",
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
		images: ["/brand/social.png"],
		title: "GoldBet365 | Sports & Casino",
	},
	description:
		"Follow sports matchups, compare odds, and place bets with your account wallet credits.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			dir="ltr"
			suppressHydrationWarning
			className={`${outfit.variable} ${figtreeHeading.variable}`}
		>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
