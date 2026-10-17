"use client";

import type { GameId, TableProps } from "@gold-bet-clean-money365/casino-core";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const load = (factory: () => Promise<{ Table: ComponentType<TableProps> }>) =>
	dynamic(() => factory().then((m) => m.Table), {
		loading: () => (
			<div className="table-loading">
				<LocalizedText text="Preparing your table…" />
			</div>
		),
		ssr: false,
	});
export const tables: Record<GameId, ComponentType<TableProps>> = {
	roulette: load(
		() => import("@gold-bet-clean-money365/casino-roulette/table"),
	),
	blackjack: load(
		() => import("@gold-bet-clean-money365/casino-blackjack/table"),
	),
	baccarat: load(
		() => import("@gold-bet-clean-money365/casino-baccarat/table"),
	),
	"dragon-tiger": load(
		() => import("@gold-bet-clean-money365/casino-dragon-tiger/table"),
	),
	"sic-bo": load(() => import("@gold-bet-clean-money365/casino-sic-bo/table")),
	slots: load(() => import("@gold-bet-clean-money365/casino-slots/table")),
	mines: load(() => import("@gold-bet-clean-money365/casino-mines/table")),
	crash: load(() => import("@gold-bet-clean-money365/casino-crash/table")),
	"video-poker": load(
		() => import("@gold-bet-clean-money365/casino-video-poker/table"),
	),
	plinko: load(() => import("@gold-bet-clean-money365/casino-plinko/table")),
};
