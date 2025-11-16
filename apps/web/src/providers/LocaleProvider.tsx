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
  const [locale, setLocale] = useState<Locale>("vi");
  const [messages, setMessages] = useState(getMessages(locale));

  useEffect(() => {
    localStorage.setItem("locale", locale);
    // Set cookie for server-side components
    document.cookie = `locale=${locale}; path=/; max-age=31536000`; // 1 year
    setMessages(getMessages(locale));
  }, [locale]);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved) setLocale(saved);
  }, []);

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
