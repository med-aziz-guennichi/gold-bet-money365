"use client";

import { LocalizedText } from "@gold-bet-clean-money365/i18n";

import { type FormEvent, useState } from "react";
import { Brand } from "@/components/brand";
import { authClient } from "@/lib/auth-client";

export default function ChangePassword() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		const element = event.currentTarget;
		const form = new FormData(element);
		const newPassword = String(form.get("newPassword") ?? "");
		if (newPassword !== form.get("confirmation")) {
			setError("The new passwords do not match.");
			return;
		}
		setBusy(true);
		setError("");
		setSuccess(false);
		try {
			const result = await authClient.changePassword({
				currentPassword: String(form.get("currentPassword") ?? ""),
				newPassword,
				revokeOtherSessions: true,
			});
			if (result.error)
				setError(
					result.error.status === 429
						? "Too many attempts. Please try again later."
						: "Could not change password. Check your current password.",
				);
			else {
				element.reset();
				setSuccess(true);
			}
		} catch {
			setError("Unable to change password. Please try again.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<main className="min-h-screen bg-[#080b0a] px-4 py-16 text-white">
			<section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#111713] p-7">
				<Brand />
				<h1 className="my-6 font-bold text-2xl">
					<LocalizedText text="Change your password" />
				</h1>
				<form onSubmit={submit} className="space-y-5">
					{(
						[
							{
								name: "currentPassword",
								label: "Current password",
								autoComplete: "current-password",
							},
							{
								name: "newPassword",
								label: "New password",
								autoComplete: "new-password",
							},
							{
								name: "confirmation",
								label: "Confirm new password",
								autoComplete: "new-password",
							},
						] as const
					).map((item) => (
						<label
							key={item.name}
							htmlFor={item.name}
							className="block text-sm"
						>
							<LocalizedText text={item.label} />
							<input
								className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-[#c6f36b]"
								id={item.name}
								name={item.name}
								type="password"
								autoComplete={item.autoComplete}
								minLength={item.name === "currentPassword" ? 1 : 12}
								maxLength={128}
								required
								disabled={busy}
							/>
						</label>
					))}
					<p className="text-white/50 text-xs leading-5">
						{" "}
						<LocalizedText text="Use at least 12 characters. Your other sessions will be signed out." />{" "}
					</p>
					{error && (
						<p role="alert" className="text-red-300 text-sm">
							<LocalizedText text={error} />
						</p>
					)}
					{success && (
						<p role="status" className="text-[#c6f36b] text-sm">
							{" "}
							<LocalizedText text="Password updated." />{" "}
						</p>
					)}
					<button
						type="submit"
						disabled={busy}
						className="w-full rounded-xl bg-[#c6f36b] py-3 font-bold text-[#11160b] disabled:opacity-50"
					>
						<LocalizedText text={busy ? "Saving…" : "Update password"} />
					</button>
				</form>
			</section>
		</main>
	);
}
