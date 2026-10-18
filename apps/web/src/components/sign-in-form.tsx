"use client";

import {
	canUseDashboard,
	normalizePhone,
} from "@gold-bet-clean-money365/api/access";
import {
	LocalizedText,
	normalizeDigits,
	useI18n,
} from "@gold-bet-clean-money365/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Brand } from "@/components/brand";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export default function SignInForm() {
	const router = useRouter();
	const { t } = useI18n();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		const form = new FormData(event.currentTarget);
		let phoneNumber: string;
		try {
			const localNumber = String(form.get("phoneNumber") ?? "").trim();
			if (!/^\d{8}$/.test(localNumber)) throw new Error("Invalid local number");
			phoneNumber = normalizePhone(`+216${localNumber}`);
		} catch {
			setError("Enter your 8-digit phone number, for example 92156030.");
			return;
		}
		setBusy(true);
		setError("");
		try {
			const result = await authClient.signIn.phoneNumber({
				phoneNumber,
				password: String(form.get("password") ?? ""),
				rememberMe: false,
			});
			if (result.error) {
				setError(
					result.error.status === 429
						? "Too many sign-in attempts. Please wait before trying again."
						: "Invalid phone number or password.",
				);
				return;
			}
			queryClient.clear();
			const session = await authClient.getSession();
			router.replace(
				canUseDashboard(session.data?.user.role) ? "/dashboard" : "/",
			);
			router.refresh();
		} catch {
			setError("Unable to sign in. Please try again.");
		} finally {
			setBusy(false);
		}
	}
	const field =
		"mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#c6f36b]";
	return (
		<section className="mx-auto mt-14 max-w-md rounded-3xl border border-white/10 bg-[#111713] p-7 shadow-xl">
			<Brand />
			<h1 className="mt-6 font-bold text-3xl">
				<LocalizedText text="Welcome back" />
			</h1>
			<p className="mt-2 text-sm text-white/50">
				{" "}
				<LocalizedText text="Sign in with your phone number and password." />{" "}
			</p>
			<form onSubmit={submit} className="mt-7 space-y-5">
				<label className="block text-sm" htmlFor="phoneNumber">
					{" "}
					<LocalizedText text="Phone number" />{" "}
					<div
						dir="ltr"
						className="mt-2 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-[#c6f36b]"
					>
						<input
							aria-label={t("Country code")}
							value="+216"
							disabled
							className="w-20 shrink-0 border-white/15 border-e bg-white/5 px-3 py-3 text-center text-white/50 opacity-100"
						/>
						<input
							className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
							id="phoneNumber"
							name="phoneNumber"
							onChange={(event) => {
								event.target.value = normalizeDigits(event.target.value);
							}}
							type="tel"
							inputMode="numeric"
							autoComplete="username"
							placeholder="92156030"
							pattern="[0-9]{8}"
							minLength={8}
							maxLength={8}
							aria-describedby="phone-hint"
							required
							disabled={busy}
						/>
					</div>
					<span id="phone-hint" className="mt-2 block text-white/40 text-xs">
						{" "}
						<LocalizedText text="Enter only your 8-digit phone number." />{" "}
					</span>
				</label>
				<label className="block text-sm" htmlFor="password">
					{" "}
					<LocalizedText text="Password" />{" "}
					<input
						className={field}
						dir="ltr"
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						maxLength={128}
						required
						disabled={busy}
					/>
				</label>
				{error && (
					<p role="alert" className="text-red-300 text-sm">
						<LocalizedText text={error} />
					</p>
				)}
				<button
					className="w-full rounded-xl bg-[#c6f36b] py-3 font-bold text-[#11160b] disabled:opacity-50"
					type="submit"
					disabled={busy}
				>
					<LocalizedText text={busy ? "Signing in…" : "Login"} />
				</button>
			</form>
			<p className="mt-5 text-white/40 text-xs leading-5">
				{" "}
				<LocalizedText text="Accounts are provided by your account manager. Contact them if you need access or a password reset." />{" "}
			</p>
			<Link
				href="/support"
				className="mt-3 inline-block text-[#e9bd62] text-sm underline underline-offset-4"
			>
				<LocalizedText text="Support" />
			</Link>
		</section>
	);
}
