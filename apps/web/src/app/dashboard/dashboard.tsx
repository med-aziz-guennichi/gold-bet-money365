"use client";

import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useI18n } from "@/features/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  const { t } = useI18n();
  const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <main className="min-h-screen bg-[#080b0a] p-6 text-[#f4f5f2]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("Dashboard")}</h1>
          <LanguageSwitcher compact />
        </div>
        <p className="mt-4">{t("Welcome")}, {session.user.name}</p>
        <p className="mt-2 text-white/60">{t("API message")}: {privateData.data?.message}</p>
      </div>
    </main>
  );
}
