"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import SignInForm from "@/components/sign-in-form";

export default function LoginPage() {
	return (
		<main className="min-h-screen bg-[#080b0a] px-4 text-[#f4f5f2]">
			<div className="mx-auto flex max-w-md justify-end pt-5">
				<LanguageSwitcher />
			</div>
			<SignInForm />
		</main>
	);
}
