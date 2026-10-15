"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { locales, translate, type Locale } from "./messages";

const STORAGE_KEY = "fieldhouse-locale";
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string) => string;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales.includes(stored as Locale)) setLocale(stored as Locale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = translate(locale, "Fieldhouse — Sports, with a little more soul");
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description)
      description.content = translate(
        locale,
        "A cleaner way to follow the moments that matter. Explore sports matchups and illustrative odds in demo mode.",
      );
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t: (message: string) => translate(locale, message) }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useI18n must be used within LocaleProvider");
  return context;
}
