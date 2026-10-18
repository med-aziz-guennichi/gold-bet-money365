import {
	canUseDashboard,
	formatAmount,
} from "@gold-bet-clean-money365/api/access";
import { LocalizedText } from "@gold-bet-clean-money365/i18n";
import { Button } from "@gold-bet-clean-money365/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gold-bet-clean-money365/ui/components/dropdown-menu";
import { Skeleton } from "@gold-bet-clean-money365/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/features/i18n/locale-provider";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import NotificationBell from "./notification-bell";

export default function UserMenu() {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<UserMenuContent />
			<NotificationBell />
		</div>
	);
}

function UserMenuContent() {
	const { t } = useI18n();
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const wallet = useQuery(
		orpc.accounts.wallet.queryOptions({
			queryKey: ["management", session?.user.id, "wallet"],
			enabled: Boolean(session),
			staleTime: 10_000,
			refetchInterval: session?.user.role === "user" ? 30_000 : false,
			retry: false,
		}),
	);

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Link
				href="/login"
				className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-[#151b17] px-4 py-2 font-bold text-white text-xs transition hover:border-[#c6f36b]/50 hover:bg-[#202a21] focus-visible:outline-2 focus-visible:outline-[#c6f36b] focus-visible:outline-offset-2"
			>
				{t("Sign In")}
			</Link>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{session.user.role === "user" && (
				<div
					aria-live="polite"
					className="rounded-lg border border-[#c6f36b]/20 bg-[#c6f36b]/10 px-3 py-2 text-xs"
				>
					<span className="block text-[9px] text-white/50">
						{t("Wallet credits")}
					</span>
					<strong className="text-[#c6f36b] tabular-nums">
						{wallet.data
							? formatAmount(wallet.data.balanceMillimes, wallet.data.currency)
							: wallet.isError
								? t("Unavailable")
								: t("Loading…")}
					</strong>
				</div>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label={session.user.name}
					render={
						<Button
							variant="outline"
							className="border-white/20 bg-[#151b17] text-white hover:bg-[#202a21] hover:text-white dark:bg-[#151b17]"
						/>
					}
				>
					<UserRound className="sm:hidden" size={16} />
					<span className="hidden max-w-32 truncate sm:inline">
						{session.user.name}
					</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="bg-card">
					<DropdownMenuGroup>
						<DropdownMenuLabel>{t("My Account")}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>{session.user.phoneNumber}</DropdownMenuItem>
						{session.user.role !== "admin" && wallet.data && (
							<DropdownMenuItem>
								{" "}
								<LocalizedText text="Wallet:" />{" "}
								{formatAmount(
									wallet.data.balanceMillimes,
									wallet.data.currency,
								)}
							</DropdownMenuItem>
						)}
						{canUseDashboard(session.user.role) && (
							<DropdownMenuItem render={<Link href="/dashboard" />}>
								{" "}
								<LocalizedText text="Dashboard" />{" "}
							</DropdownMenuItem>
						)}
						{session.user.role === "user" && (
							<DropdownMenuItem render={<Link href="/casino" />}>
								{" "}
								<LocalizedText text="Casino & rounds" />{" "}
							</DropdownMenuItem>
						)}
						{session.user.role === "user" && (
							<DropdownMenuItem render={<Link href="/bets" />}>
								{t("Bet history")}
							</DropdownMenuItem>
						)}
						<DropdownMenuItem render={<Link href="/account" />}>
							{" "}
							<LocalizedText text="Change password" />{" "}
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onClick={() => {
								authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											queryClient.clear();
											router.replace("/");
											router.refresh();
										},
									},
								});
							}}
						>
							{t("Sign Out")}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
