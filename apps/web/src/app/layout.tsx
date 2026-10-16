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
	title: "Fieldhouse — Sports, with a little more soul",
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
