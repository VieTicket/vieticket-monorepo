"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, Locale } from "@/lib/i18n";

const timezone = "Asia/Ho_Chi_Minh";
interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "vi",
  setLocale: () => {},
});

export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize with localStorage value immediately to prevent flicker
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("locale") as Locale | null;
      return saved || "vi";
    }
    return "vi";
  });
  
  const [messages, setMessages] = useState(() => getMessages(locale));
  const [mounted, setMounted] = useState(false);

  // Custom setter that updates both state and storage
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", newLocale);
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
    }
    setMessages(getMessages(newLocale));
  };

  // Only update cookie on mount (for SSR consistency)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      document.cookie = `locale=${locale}; path=/; max-age=31536000`;
    }
  }, []);

  // Show minimal content during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <LocaleContext.Provider value={{ locale: "vi", setLocale }}>
        <NextIntlClientProvider
          messages={getMessages("vi")}
          locale="vi"
          timeZone={timezone}
        >
          {children}
        </NextIntlClientProvider>
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        messages={messages}
        locale={locale}
        timeZone={timezone}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
};
