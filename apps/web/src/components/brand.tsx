import Image from "next/image";
import Link from "next/link";

/** Original vector identity shared by the public site and management screens. */
export function Brand({ compact = false }: { compact?: boolean }) {
	return (
		<Link
			href="/"
			aria-label="GoldBet365 home"
			className="inline-flex shrink-0 items-center gap-2.5"
			dir="ltr"
		>
			<Image
				src="/brand/mark.svg"
				width={40}
				height={40}
				alt=""
				className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
			/>
			<span
				className={`${compact ? "text-lg" : "text-xl sm:text-2xl"} whitespace-nowrap font-extrabold text-[#f4f5f2] tracking-[-.06em]`}
			>
				GoldBet<span className="text-[#e9bd62]">365</span>
			</span>
		</Link>
	);
}
