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
    // THAY ĐỔI Ở ĐÂY: Thêm 'relative' và 'z-[9999]'
    <footer className="relative z-[999] bg-[#2C293C] text-white py-12 px-6 md:px-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {sections.slice(0, 4).map((section, index) => (
          <div key={index}>
            <h3 className="font-semibold text-lg mb-4">{section.title}</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {section.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2">
                  {section.icons && section.icons[i]}
                  <div className="cursor-pointer">
                    {(link === "Điều Khoản & Điều Kiện Mua Vé" || link === "Ticket Purchase Terms & Conditions") ? (
                      <a href="/terms" className="hover:text-yellow-400 transition-colors">
                        {link}
                      </a>
                    ) : (
                      link
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
        ))}
        <div className="relative z-[1000] grid grid-cols-2 md:grid-cols-2 gap-8">
          <LanguageSwitcher />
        </div>
      </div>
      <div className="border-t border-gray-600 mt-12 pt-4 text-center text-sm text-gray-400">
        © 2025 VieTicket. All rights reserved.
      </div>
    </footer>
  );
}