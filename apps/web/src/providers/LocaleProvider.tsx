"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, Locale } from "@/lib/i18n";

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
    setMessages(getMessages(locale));
  }, [locale]);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved) setLocale(saved);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
};
