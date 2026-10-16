"use client";
import { canUseDashboard } from "@gold-bet-clean-money365/api/access";
import Link from "next/link";
import { useI18n } from "@/features/i18n/locale-provider";
import { authClient } from "@/lib/auth-client";
import { LanguageSwitcher } from "./language-switcher";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const { t } = useI18n();
	const { data: session } = authClient.useSession();
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links
						.filter(
							(link) =>
								link.to !== "/dashboard" || canUseDashboard(session?.user.role),
						)
						.map(({ to, label }) => {
							return (
								<Link key={to} href={to}>
									{t(label)}
								</Link>
							);
						})}
				</nav>
				<div className="flex items-center gap-2">
					<LanguageSwitcher compact />
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
