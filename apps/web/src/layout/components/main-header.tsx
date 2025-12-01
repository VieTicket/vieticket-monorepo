"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { Star, Ticket, UserIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import { ProfileDropdown } from "./profile-dropdown";
import { IoTicket } from "react-icons/io5";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export default function Header() {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = t.raw("nav") as {
    label: string;
    href: string;
  }[];

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <header className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 text-white px-6 py-5 flex items-center justify-between z-50 shadow-xl">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 hover:bg-violet-500/20 hover:border-violet-400/50 border border-transparent transition-all duration-300"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        {/* Logo & Brand */}
        <Link className="flex items-center group" href="/">
          <IoTicket
            size={32}
            className="text-yellow-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
          />
          <h1 className="text-2xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent font-bold ml-2 transition-all duration-300 group-hover:scale-105">
            VieTicket
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "relative px-3 py-2 transition-all duration-300 hover:text-violet-300",
                  isActive ? "text-yellow-400 font-semibold" : "text-white"
                )}
              >
                {item.label}
                {(isActive || pathname === item.href) && (
                  <div className="h-0.5 bg-gradient-to-r from-yellow-400 to-violet-400 w-full absolute bottom-0 left-0 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex">
          {!session?.user ? (
            <div className="flex items-center gap-4">
              <div className="relative z-[51]">
                <LanguageSwitcher />
              </div>
              <Link
                href="/auth/sign-in"
                className="relative px-4 py-2 hover:text-violet-300 transition-all duration-300 group"
              >
                {t("logIn")}
                <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
              </Link>
              <Button
                variant="outline"
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400 border-0 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link href="/auth/sign-up">{t("signUp")}</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-6 text-xs">
              <div className="relative z-[51]">
                <LanguageSwitcher />
              </div>
              <Link
                href="/tickets"
                className="relative flex gap-2 items-center px-3 py-2 hover:text-violet-300 transition-all duration-300 cursor-pointer group"
              >
                <Ticket className="w-5 h-5" />
                <span>Tickets</span>
                <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
              </Link>
              {/* <div className="relative flex gap-2 items-center px-3 py-2 hover:text-violet-300 transition-all duration-300 cursor-pointer group">
                <Star className="w-5 h-5" />
                <span>Interested</span>
                <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
              </div> */}
              <div className="relative flex gap-2 group items-center cursor-pointer px-3 py-2 hover:text-violet-300 transition-all duration-300">
                <ProfileDropdown />
                <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Language Switcher */}
        <div className="md:hidden">
          <LanguageSwitcher />
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={clsx(
          "fixed top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-r border-slate-700/50 text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center">
              <IoTicket size={32} className="text-yellow-400" />
              <h1 className="text-2xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent font-bold ml-2">
                VieTicket
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-violet-500/20 hover:border-violet-400/50 border border-transparent transition-all duration-300"
              onClick={toggleMobileMenu}
            >
              <X size={24} />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex flex-col p-6 space-y-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "py-3 px-4 rounded-lg transition-all duration-300 text-lg border",
                    isActive
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold shadow-lg border-yellow-400"
                      : "text-white hover:bg-violet-500/20 hover:border-violet-400/50 border-transparent hover:text-violet-300"
                  )}
                  onClick={toggleMobileMenu}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Auth Section */}
          <div className="mt-auto p-6 border-t border-slate-700/50">
            {!session?.user ? (
              <div className="space-y-4">
                <Link
                  href="/auth/sign-in"
                  onClick={toggleMobileMenu}
                  className="relative block py-3 px-4 hover:text-violet-300 transition-all duration-300 group"
                >
                  {t("logIn")}
                  <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
                </Link>
                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400 border-0 font-semibold shadow-lg"
                  asChild
                >
                  <Link href="/auth/sign-up" onClick={toggleMobileMenu}>
                    {t("signUp")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Link
                  href="/tickets"
                  className="relative flex items-center gap-3 py-3 px-4 hover:text-violet-300 transition-all duration-300 group"
                  onClick={toggleMobileMenu}
                >
                  <Ticket className="w-5 h-5" />
                  <span>Tickets</span>
                  <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
                </Link>
                <div className="relative flex items-center gap-3 py-3 px-4 hover:text-violet-300 transition-all duration-300 cursor-pointer group">
                  <Star className="w-5 h-5" />
                  <span>Interested</span>
                  <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
                </div>
                <div className="relative py-3 px-4 hover:text-violet-300 transition-all duration-300 cursor-pointer group">
                  <ProfileDropdown />
                  <div className="h-0.5 bg-gradient-to-r from-violet-300 to-violet-400 w-0 group-hover:w-full absolute bottom-0 left-0 transition-all duration-300" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
