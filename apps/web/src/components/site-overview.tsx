import Link from "next/link";
export function SiteOverview() {
	return (
		<section
			aria-labelledby="about-goldbet365"
			className="mx-auto max-w-[1440px] border-white/10 border-t px-4 py-12 text-white sm:px-8"
		>
			<p className="font-semibold text-[#e9bd62] text-xs uppercase tracking-widest">
				Discover GoldBet365
			</p>
			<h2 id="about-goldbet365" className="mt-3 font-bold text-2xl">
				Sports fixtures, live scores and original casino games
			</h2>
			<div className="mt-5 grid gap-8 text-sm text-white/60 leading-7 md:grid-cols-3">
				<div>
					<h3 className="font-bold text-white">Follow your sports</h3>
					<p>
						Browse football, tennis, basketball and other sports. Choose today,
						tomorrow or the day after tomorrow to explore fixtures, or review
						results from the last 24 hours. Scores and odds refresh regularly;
						provider delays may occur.
					</p>
				</div>
				<div>
					<h3 className="font-bold text-white">Understand your picks</h3>
					<p>
						Open a match to compare available offers. A combined bet multiplies
						the decimal odds of its selections. Review your stake and potential
						return before confirming. Account holders can review accepted bets
						and settlement status in their private history.
					</p>
				</div>
				<div>
					<h3 className="font-bold text-white">Practice before you play</h3>
					<p>
						Explore Blackjack, Mines, Crash, Video Poker and six more animated
						games. Practice uses separate demo credits. Each game publishes its
						rules; past results do not predict the next round.
					</p>
					<Link
						href="/casino"
						className="font-bold text-[#e9bd62] hover:underline"
					>
						Explore the casino →
					</Link>
				</div>
			</div>
			<nav
				aria-label="About GoldBet365"
				className="mt-8 flex flex-wrap gap-6 text-[#e9bd62] text-sm"
			>
				<Link href="/about">About GoldBet365</Link>
				<Link href="/how-it-works">How it works</Link>
				<Link href="/responsible-play">Responsible play</Link>
			</nav>
			<p className="mt-6 text-white/40 text-xs">
				18+ · Set a budget, take breaks and never chase losses.
			</p>
		</section>
	);
}
