import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import BetHistory from "./history";

export default async function BetHistoryPage() {
	const session = await authClient.getSession({
		fetchOptions: { headers: await headers(), throw: true },
	});
	if (!session?.user) redirect("/login");
	if (session.user.role !== "user") redirect("/");
	return <BetHistory userId={session.user.id} />;
}
