"use client";

import { Languages } from "lucide-react";

import { useI18n } from "@/features/i18n/locale-provider";
import type { Locale } from "@/features/i18n/messages";

const options: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.035] px-2.5 py-2 text-xs text-white/70">
      <Languages size={14} aria-hidden="true" />
      <span className={compact ? "sr-only" : ""}>{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="cursor-pointer bg-transparent font-semibold text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#111713]">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
