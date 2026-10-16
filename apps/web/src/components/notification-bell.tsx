"use client";
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
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/features/i18n/locale-provider";
import { useNotificationSound } from "@/features/notifications/use-notification-sound";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function NotificationBell() {
	const { data: session } = authClient.useSession();
	const { t } = useI18n();
	const router = useRouter();
	const sound = useNotificationSound();
	const playSound = sound.play;
	const [page, setPage] = useState(1);
	const [connected, setConnected] = useState(false);
	const userId = session?.user.id;
	const notifications = useQuery(
		orpc.notifications.list.queryOptions({
			input: { page },
			queryKey: ["notifications", userId, page],
			enabled: Boolean(userId),
			staleTime: 30_000,
			retry: false,
		}),
	);
	useEffect(() => {
		if (!userId) return;
		let stopped = false;
		let socket: WebSocket | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let delay = 1000;
		const invalidate = () =>
			void queryClient.invalidateQueries({
				queryKey: ["notifications", userId],
			});
		function connect() {
			if (stopped) return;
			const url = new URL(
				"/api/notifications/ws",
				process.env.NEXT_PUBLIC_SERVER_URL ?? window.location.origin,
			);
			url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
			socket = new WebSocket(url);
			socket.onopen = () => {
				setConnected(true);
				delay = 1000;
				invalidate();
			};
			socket.onmessage = (event) => {
				let message: { type?: string };
				try {
					message = JSON.parse(event.data);
				} catch {
					return;
				}
				if (message.type === "notifications.ready") invalidate();
				if (message.type === "notifications.changed") {
					invalidate();
					void queryClient.invalidateQueries({
						predicate: (query) =>
							["management", "bets"].includes(String(query.queryKey[0])),
					});
					toast(t("You have a new notification."));
					playSound();
				}
			};
			socket.onclose = (event) => {
				setConnected(false);
				if (stopped || event.code === 1008) return;
				timer = setTimeout(connect, delay + Math.random() * 500);
				delay = Math.min(delay * 2, 30_000);
			};
			socket.onerror = () => socket?.close();
		}
		connect();
		return () => {
			stopped = true;
			if (timer) clearTimeout(timer);
			socket?.close();
			setConnected(false);
		};
	}, [userId, t, playSound]);
	if (!session) return null;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						className="relative border-white/15 bg-transparent text-white"
						aria-label={`${t("Notifications")} (${notifications.data?.unread ?? 0})`}
					/>
				}
			>
				<Bell size={16} />
				{Boolean(notifications.data?.unread) && (
					<span className="absolute -top-1 -right-1 rounded-full bg-[#c6f36b] px-1 text-[10px] text-black">
						{Math.min(notifications.data?.unread ?? 0, 99)}
					</span>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-[min(360px,calc(100vw-2rem))] border-white/15 bg-[#111713] text-white"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel>
						{t("Notifications")} · {t(connected ? "Live" : "Reconnecting…")}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={sound.toggle}
						className="text-white focus:bg-white/10 focus:text-white"
					>
						{t(
							sound.enabled
								? "Mute notification sound"
								: "Enable notification sound",
						)}
					</DropdownMenuItem>
					{sound.enabled && (
						<DropdownMenuItem
							onClick={sound.play}
							className="text-white focus:bg-white/10 focus:text-white"
						>
							{t("Preview notification sound")}
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<div className="max-h-[60vh] overflow-y-auto">
						{notifications.isPending ? (
							<p className="p-3 text-sm">{t("Loading…")}</p>
						) : notifications.isError ? (
							<p role="alert" className="p-3 text-sm">
								{t("Could not load notifications.")}
							</p>
						) : !notifications.data?.items.length ? (
							<p className="p-3 text-sm text-white/60">
								{t("No notifications yet.")}
							</p>
						) : (
							notifications.data.items.map((item) => (
								<DropdownMenuItem
									key={item.id}
									className="block whitespace-normal p-3 text-white focus:bg-white/10 focus:text-white"
									onClick={async () => {
										try {
											await orpc.notifications.read.call({ id: item.id });
										} catch {
											toast(t("Could not mark notification as read."));
											return;
										}
										void queryClient.invalidateQueries({
											queryKey: ["notifications", userId],
										});
										router.push(item.href);
									}}
								>
									<p className="font-semibold text-sm">
										{!item.readAt && (
											<span
												role="img"
												aria-label={t("Unread")}
												className="me-2 inline-block h-2 w-2 rounded-full bg-[#c6f36b]"
											/>
										)}
										{t(item.title)}
									</p>
									<p className="mt-1 text-white/65 text-xs">{item.message}</p>
									<time
										className="mt-1 block text-[10px] text-white/45"
										dateTime={item.createdAt}
									>
										{new Date(item.createdAt).toLocaleString()}
									</time>
								</DropdownMenuItem>
							))
						)}
					</div>
					<div className="flex justify-between p-2">
						<Button
							variant="ghost"
							disabled={page === 1}
							onClick={() => setPage((p) => p - 1)}
						>
							{t("Previous")}
						</Button>
						<Button
							variant="ghost"
							disabled={!notifications.data?.hasMore}
							onClick={() => setPage((p) => p + 1)}
						>
							{t("Next")}
						</Button>
					</div>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
