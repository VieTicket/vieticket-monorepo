// src/lib/i18n.ts
import en from "@/lib/locales/en.json";
import vi from "@/lib/locales/vi.json";

export const languages = {
  en,
  vi,
};

export type Locale = keyof typeof languages;

export function getMessages(locale: Locale) {
  return languages[locale];
}
