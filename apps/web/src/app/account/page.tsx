import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import ChangePassword from "./password";

export default async function AccountPage() {
	const session = await authClient.getSession({
		fetchOptions: { headers: await headers(), throw: true },
	});
	if (!session?.user) redirect("/login");
	return <ChangePassword />;
}
