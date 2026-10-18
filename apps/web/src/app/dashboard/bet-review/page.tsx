import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export const metadata = { title: "Bet review | GoldBet365" };

import ReviewQueue from "./review-queue";
export default async function Page() {
	const session = await authClient.getSession({
		fetchOptions: { headers: await headers(), throw: true },
	});
	if (!session?.user) redirect("/login");
	if (session.user.role !== "admin") redirect("/");
	return <ReviewQueue />;
}
