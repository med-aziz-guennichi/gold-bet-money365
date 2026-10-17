import Link from "next/link";
import { Brand } from "./brand";
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
				<Brand />
				<p className="mt-12 font-semibold text-[#e9bd62] text-xs uppercase tracking-widest">
					GoldBet365 guide
				</p>
				<h1 className="mt-3 font-bold text-4xl tracking-tight">{title}</h1>
				<p className="mt-5 text-lg text-white/65 leading-8">{introduction}</p>
				{sections.map((section) => (
					<section key={section.heading} className="mt-9">
						<h2 className="font-bold text-xl">{section.heading}</h2>
						<p className="mt-3 text-white/60 leading-7">{section.text}</p>
					</section>
				))}
				<nav
					aria-label="Explore GoldBet365"
					className="mt-12 flex flex-wrap gap-5 border-white/10 border-t pt-6 text-[#e9bd62] text-sm"
				>
					<Link href="/">Sports</Link>
					<Link href="/casino">Casino</Link>
					<Link href="/about">About</Link>
					<Link href="/how-it-works">How it works</Link>
					<Link href="/responsible-play">Responsible play</Link>
				</nav>
			</div>
		</main>
	);
}
