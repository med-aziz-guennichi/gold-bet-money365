import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { Skeleton } from "@gold-bet-clean-money365/ui/components/skeleton";
import { Brand } from "@/components/brand";

type LoadingKind = "sports" | "cards" | "table" | "form" | "game";

function Block({ className = "" }: { className?: string }) {
	return (
		<Skeleton
			className={`rounded-xl bg-white/[0.06] motion-reduce:animate-none ${className}`}
		/>
	);
}

/** Shared by route Suspense boundaries and initial client-side query states. */
export function ContentLoading({
	kind = "table",
	label = "Loading…",
}: {
	kind?: LoadingKind;
	label?: string;
}) {
	return (
		<section aria-busy="true" className="w-full min-w-0 py-4">
			<p
				role="status"
				className="mb-5 flex items-center gap-2 text-[#b7bdb8] text-sm"
			>
				<span
					aria-hidden="true"
					className="h-2 w-2 rounded-full bg-[#e9bd62] motion-safe:animate-pulse"
				/>
				<LocalizedText text={label} />
			</p>
			<div aria-hidden="true">
				{kind === "form" ? (
					<div className="mx-auto grid max-w-md gap-6 rounded-2xl border border-white/10 p-6">
						<Block className="h-8 w-2/3" />
						<Block className="h-4 w-full" />
						<Block className="h-12" />
						<Block className="h-12" />
						<Block className="mt-3 h-12" />
					</div>
				) : kind === "cards" ? (
					<div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
						{[0, 1, 2, 3].map((n) => (
							<div key={n} className="rounded-2xl border border-white/10 p-4">
								<Block className="h-32 sm:h-44" />
								<Block className="mt-5 h-6 w-3/4" />
								<Block className="mt-3 h-4" />
								<Block className="mt-6 h-9 w-2/3" />
							</div>
						))}
					</div>
				) : kind === "game" ? (
					<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
						<Block className="h-72 sm:h-[440px]" />
						<div className="grid content-start gap-5 rounded-2xl border border-white/10 p-5">
							<Block className="h-8 w-3/4" />
							<Block className="h-14" />
							<Block className="h-12" />
							<Block className="h-12" />
						</div>
					</div>
				) : (
					<div className="grid gap-3">
						{[0, 1, 2, 3].map((n) => (
							<div
								key={n}
								className="flex min-w-0 items-center gap-4 rounded-xl border border-white/10 p-4 sm:p-6"
							>
								<Block className="h-10 w-10 shrink-0" />
								<div className="grid min-w-0 flex-1 gap-3">
									<Block className="h-4 w-2/3" />
									<Block className="h-3 w-1/2" />
								</div>
								{kind === "sports" && (
									<div className="hidden gap-2 sm:flex">
										{[0, 1, 2].map((i) => (
											<Block key={i} className="h-10 w-16" />
										))}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

export function PageLoading({
	kind = "sports",
	label = "Loading…",
}: {
	kind?: LoadingKind;
	label?: string;
}) {
	return (
		<div className="min-h-screen bg-[#080e0b] text-white">
			<header className="border-white/10 border-b px-5 py-5">
				<div className="mx-auto max-w-6xl">
					<Brand />
				</div>
			</header>
			<main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
				<div aria-hidden="true" className="mb-5 grid max-w-lg gap-4">
					<Block className="h-4 w-28" />
					<Block className="h-9 w-3/4" />
				</div>
				<ContentLoading kind={kind} label={label} />
			</main>
		</div>
	);
}
