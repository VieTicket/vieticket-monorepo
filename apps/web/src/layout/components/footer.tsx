"use client";

import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { IoTicket } from "react-icons/io5";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Ticket, Mail, Phone, MapPin, Star, Globe } from "lucide-react";

export default function Footer() {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();
  
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
    <footer className="professional-footer mt-20 animate-slide-up relative z-[999] text-white py-12 px-6 md:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 group">
              <IoTicket size={32} color="yellow" className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span className="text-2xl text-yellow-300 font-bold ml-2 transition-all duration-300 group-hover:text-yellow-400">
                VieTicket
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Kết nối khán giả với những trải nghiệm tuyệt vời.
            </p>
            <div className="flex items-center gap-4">
              {sections[3].icons?.map((icon, index) => (
                <button
                  key={index}
                  className="p-2 professional-layout-button rounded-lg btn-enhanced group"
                >
                  <span className="text-white group-hover:text-violet-400 transition-all duration-300 group-hover:scale-110">
                    {icon}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white glow-text-layout flex items-center gap-2">
              <Star className="w-5 h-5 text-violet-400" />
              {sections[0].title}
            </h3>
            <nav className="flex flex-col space-y-3">
              {sections[0].links.map((link, i) => (
                <div key={i} className="nav-item-enhanced text-slate-300 hover:text-violet-400 transition-all duration-300 hover:translate-x-2 cursor-pointer">
                  {link}
                </div>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white glow-text-layout flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" />
              {sections[1].title}
            </h3>
            <nav className="flex flex-col space-y-3">
              {sections[1].links.map((link, i) => (
                <div key={i} className="nav-item-enhanced text-slate-300 hover:text-violet-400 transition-all duration-300 hover:translate-x-2 cursor-pointer">
                  {(link === "Điều Khoản & Điều Kiện Mua Vé" || link === "Ticket Purchase Terms & Conditions") ? (
                    <a href="/terms" className="hover:text-violet-400 transition-colors">
                      {link}
                    </a>
                  ) : (
                    link
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Categories & Language */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white glow-text-layout flex items-center gap-2">
              <Mail className="w-5 h-5 text-violet-400" />
              {sections[2].title}
            </h3>
            <nav className="flex flex-col space-y-3">
              {sections[2].links.map((link, i) => (
                <div key={i} className="nav-item-enhanced text-slate-300 hover:text-violet-400 transition-all duration-300 hover:translate-x-2 cursor-pointer">
                  {link}
                </div>
              ))}
            </nav>
            
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            © {currentYear} VieTicket. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-400 hover:text-violet-400 transition-colors duration-300 cursor-pointer">
              Điều khoản
            </div>
            <div className="text-sm text-slate-400 hover:text-violet-400 transition-colors duration-300 cursor-pointer">
              Bảo mật
            </div>
            <div className="text-sm text-slate-400 hover:text-violet-400 transition-colors duration-300 cursor-pointer">
              Cookies
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}