"use client";

import { useState } from "react";
import { MatchCenter } from "@/components/sports/match-center";
import {
	HeroSection,
	HighlightsSection,
	SiteHeader,
} from "@/components/sports/page-chrome";
import { useBetting } from "@/features/sports/use-betting";
import { useFlashscoreMatches } from "@/features/sports/use-flashscore-matches";

/** Route composition: data and betting behavior live in feature hooks. */
export default function Home() {
	const [visibleMatchIds, setVisibleMatchIds] = useState<string[]>([]);
	const football = useFlashscoreMatches(visibleMatchIds);
	const betting = useBetting();

	return (
		<main className="min-h-screen bg-[#080b0a] text-[#f4f5f2]">
			<SiteHeader />
			<div
				id="top"
				className="mx-auto max-w-[1440px] px-4 pt-8 pb-16 sm:px-8 sm:pt-10"
			>
				<HeroSection featuredMatch={football.featuredMatch} />
				<MatchCenter
					matches={football.matches}
					onVisibleMatchIdsChange={setVisibleMatchIds}
					regions={football.regions}
					loading={football.matchesQuery.isLoading}
					error={football.matchesQuery.error?.message}
					oddsLoading={football.oddsLoading}
					oddsError={football.oddsError}
					selected={betting.selected}
					onPick={betting.togglePick}
					slip={betting.slipProps}
				/>
				<HighlightsSection />
			</div>
		</main>
	);
}
