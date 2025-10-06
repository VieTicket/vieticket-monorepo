"use client";

import { useLocale } from "@/providers/LocaleProvider";
import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const locales = [
  { code: "vi", label: "Vietnamese" },
  { code: "en", label: "English" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [mounted, setMounted] = useState(false);

  // Đảm bảo render đúng trên client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentLang = locales.find((l) => l.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 shadow-sm hover:bg-gray-50 transition"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-lg shadow-md">
        {locales.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => setLocale(item.code as "vi" | "en")}
            className={`flex items-center gap-2 cursor-pointer ${
              locale === item.code ? "font-semibold text-blue-600" : ""
            }`}
          >
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
