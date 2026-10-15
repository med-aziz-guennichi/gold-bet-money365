"use client";

import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <main className="min-h-screen bg-[#080b0a] px-4 text-[#f4f5f2]">
      <div className="mx-auto flex max-w-md justify-end pt-5">
        <LanguageSwitcher />
      </div>
      {showSignIn ? (
        <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
      ) : (
        <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
      )}
    </main>
  );
}
