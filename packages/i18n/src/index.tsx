"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { type Locale, locales, translate } from "./messages";

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
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored && locales.includes(stored as Locale))
				setLocale(stored as Locale);
		} catch {
			/* Private webviews may deny browser storage. */
		}
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
		document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch {
			/* Keep the selected language in memory. */
		}
	}, [locale]);

	const value = useMemo(
		() => ({
			locale,
			setLocale,
			t: (message: string) => translate(locale, message),
		}),
		[locale],
	);

	return (
		<LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
	);
}

export function useI18n() {
	const context = useContext(LocaleContext);
	if (!context) throw new Error("useI18n must be used within LocaleProvider");
	return context;
}

export function LocalizedText({ text }: { text: string }) {
	const { t } = useI18n();
	return t(text);
}

export { normalizeDigits } from "./numbers";
