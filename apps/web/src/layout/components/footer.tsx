"use client";

import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Footer() {
  const t = useTranslations("footer");
  const sections = [
    {
      title: t("companyInfo.title"),
      links: t.raw("companyInfo.properties") as string[],
    },
    {
      title: t("help.title"),
      links: t.raw("help.properties") as string[],
    },
    {
      title: t("categories.title"),
      links: t.raw("categories.properties") as string[],
    },
    {
      title: t("followUs"),
      links: ["Facebook", "Instagram", "Twitter", "Youtube"],
      icons: [
        <FaFacebook key="fb" />,
        <FaInstagram key="ig" />,
        <FaTwitter key="tw" />,
        <FaYoutube key="yt" />,
      ],
    },
  ];

  return (
    <footer className="relative z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 text-white py-12 px-6 md:px-20 shadow-2xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {sections.slice(0, 4).map((section, index) => (
          <div key={index}>
            <h3 className="font-semibold text-lg mb-4 bg-gradient-to-r from-yellow-400 to-violet-400 bg-clip-text text-transparent">{section.title}</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {section.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2">
                  {section.icons && (
                    <div className="text-violet-400 hover:text-yellow-400 transition-colors duration-300 hover:scale-110">
                      {section.icons[i]}
                    </div>
                  )}
                  <div className="cursor-pointer">
                    {(link === "Điều Khoản & Điều Kiện Mua Vé" || link === "Ticket Purchase Terms & Conditions") ? (
                      <a href="/terms" className="hover:text-violet-400 transition-all duration-300 hover:translate-x-1">
                        {link}
                      </a>
                    ) : (
                      <span className="hover:text-violet-400 transition-all duration-300 hover:translate-x-1">{link}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
        ))}
        <div className="relative z-[51] grid grid-cols-2 md:grid-cols-2 gap-8">
          <LanguageSwitcher />
        </div>
      </div>
      <div className="border-t border-slate-700/50 mt-12 pt-4 text-center text-sm text-slate-400">
        <span className="hover:text-violet-400 transition-colors duration-300">© 2025 VieTicket. All rights reserved.</span>
      </div>
    </footer>
  );
}