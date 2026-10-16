import { canUseDashboard } from "@gold-bet-clean-money365/api/access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
	const session = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
			throw: true,
		},
	});

	if (!session?.user) {
		redirect("/login");
	}

	if (!canUseDashboard(session.user.role)) redirect("/");

	return <Dashboard session={session} />;
}
