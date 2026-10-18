import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import Link from "next/link";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
export function InformationPage({
	title,
	introduction,
	sections,
}: {
	title: string;
	introduction: string;
	sections: { heading: string; text: string }[];
}) {
	return (
		<main className="min-h-screen bg-[#080b0a] px-5 py-8 text-white">
			<div className="mx-auto max-w-3xl">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<Brand />
					<LanguageSwitcher />
				</div>
				<p className="mt-12 font-semibold text-[#e9bd62] text-xs uppercase tracking-widest">
					<LocalizedText text="GoldBet365 guide" />
				</p>
				<h1 className="mt-3 font-bold text-4xl tracking-tight">
					<LocalizedText text={title} />
				</h1>
				<p className="mt-5 text-lg text-white/65 leading-8">
					<LocalizedText text={introduction} />
				</p>
				{sections.map((section) => (
					<section key={section.heading} className="mt-9">
						<h2 className="font-bold text-xl">
							<LocalizedText text={section.heading} />
						</h2>
						<p className="mt-3 text-white/60 leading-7">
							<LocalizedText text={section.text} />
						</p>
					</section>
				))}
				<nav
					aria-label="Explore GoldBet365"
					className="mt-12 flex flex-wrap gap-5 border-white/10 border-t pt-6 text-[#e9bd62] text-sm"
				>
					<Link href="/">
						<LocalizedText text="Sports" />
					</Link>
					<Link href="/casino">
						<LocalizedText text="Casino" />
					</Link>
					<Link href="/about">
						<LocalizedText text="About" />
					</Link>
					<Link href="/how-it-works">
						<LocalizedText text="How it works" />
					</Link>
					<Link href="/responsible-play">
						<LocalizedText text="Responsible play" />
					</Link>
					<Link href="/support">
						<LocalizedText text="Support" />
					</Link>
					<Link href="/privacy">
						<LocalizedText text="Privacy information" />
					</Link>
				</nav>
			</div>
		</main>
	);
}
