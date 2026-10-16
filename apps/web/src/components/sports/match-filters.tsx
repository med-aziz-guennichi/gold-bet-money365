import { Globe2 } from "lucide-react";
import { useI18n } from "@/features/i18n/locale-provider";
import type { Region } from "@/features/sports/types";
import { getRegionMark } from "@/features/sports/utils";

const FILTER_BASE =
	"inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition";
const FILTER_ACTIVE = "border-[#c6f36b] bg-[#c6f36b]/10 text-[#d8ff9d]";
const FILTER_INACTIVE =
	"border-white/[.07] bg-white/[.035] text-white/60 hover:border-white/20 hover:text-white";

export function MatchFilters({
	regions,
	activeRegion,
	liveOnly,
	onRegionChange,
	onLiveToggle,
}: {
	regions: Region[];
	activeRegion: string;
	liveOnly: boolean;
	onRegionChange: (region: string) => void;
	onLiveToggle: () => void;
}) {
	const { t } = useI18n();
	return (
		<div className="mb-5 rounded-2xl border border-white/[.07] bg-[#101411] p-2.5 sm:p-3">
			<div className="flex min-w-0 flex-wrap gap-2 sm:hidden">
				<select
					aria-label={t("Soccer regions")}
					value={activeRegion}
					onChange={(event) => onRegionChange(event.target.value)}
					className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#101411] px-3 py-2 text-white text-xs"
				>
					<option value="">{t("All Soccer")}</option>
					{regions.map((region) => (
						<option key={region.key} value={region.key}>
							{region.name}
						</option>
					))}
				</select>
				<button
					type="button"
					aria-pressed={liveOnly}
					onClick={onLiveToggle}
					className={`${FILTER_BASE} ${liveOnly ? FILTER_ACTIVE : FILTER_INACTIVE}`}
				>
					{t("In-play")}
				</button>
			</div>
			<div
				role="group"
				className="hidden min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden"
				aria-label={t("Soccer regions")}
			>
				<button
					type="button"
					aria-pressed={!activeRegion && !liveOnly}
					onClick={() => {
						onRegionChange("");
						if (liveOnly) onLiveToggle();
					}}
					className={`${FILTER_BASE} ${!activeRegion && !liveOnly ? FILTER_ACTIVE : FILTER_INACTIVE}`}
				>
					<Globe2 size={13} /> {t("All Soccer")}
				</button>
				<button
					type="button"
					aria-pressed={liveOnly}
					onClick={onLiveToggle}
					className={`${FILTER_BASE} ${liveOnly ? "border-[#f66c61]/70 bg-[#f66c61]/10 text-[#ff9b92]" : FILTER_INACTIVE}`}
				>
					<span
						className={`h-1.5 w-1.5 rounded-full ${liveOnly ? "animate-pulse bg-[#f66c61]" : "bg-white/30"}`}
					/>
					{t("In-play")}
				</button>
				{regions.map((region) => (
					<button
						type="button"
						key={region.key}
						aria-pressed={activeRegion === region.key}
						onClick={() => onRegionChange(region.key)}
						className={`${FILTER_BASE} ${activeRegion === region.key ? FILTER_ACTIVE : FILTER_INACTIVE}`}
					>
						<span className="text-[12px]">{getRegionMark(region.key)}</span>
						{region.name}
					</button>
				))}
			</div>
		</div>
	);
}
