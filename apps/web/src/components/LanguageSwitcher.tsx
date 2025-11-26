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
import { useRouter } from "next/navigation";

const locales = [
  { code: "vi", label: "VN" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Đảm bảo render đúng trên client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleChange = (newLocale: "vi" | "en") => {
    setLocale(newLocale);
    // Force refresh để server components cập nhật locale
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  if (!mounted) return null;

  const currentLang = locales.find((l) => l.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 font-normal justify-center p-0 shadow-sm hover:text-yellow-400 transition cursor-pointer">
          <Globe className="w-5 h-5" />
          <span className="hidden sm:inline">{currentLang?.label}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="language-switcher-dropdown rounded-lg shadow-md bg-white border border-gray-200"
        style={{ zIndex: 99999 }}
      >
        {locales.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => handleLocaleChange(item.code as "vi" | "en")}
            className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 ${
              locale === item.code ? "font-semibold text-blue-600 bg-blue-50" : ""
            }`}
          >
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
