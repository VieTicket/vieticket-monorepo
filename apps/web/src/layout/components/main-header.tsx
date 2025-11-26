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
import "./index.css";

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
      <header className="professional-header sticky top-0 z-50 text-white px-6 py-4 flex items-center justify-between relative animate-slide-down">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 professional-layout-button btn-enhanced"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        {/* Logo & Brand */}
        <Link className="flex items-center gap-3 group" href="/">
          <IoTicket size={32} color="yellow" className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          <h1 className="text-2xl text-yellow-300 font-bold ml-2 transition-all duration-300 group-hover:text-yellow-400">VieTicket</h1>
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
                  "nav-item-enhanced relative px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 font-medium",
                  isActive ? "text-violet-400 font-semibold glow-text-layout" : "text-white hover:text-violet-400"
                )}
              >
                {item.label}
                {isActive && (
                  <div className="h-1 bg-violet-400 w-full absolute bottom-[-12px] left-0 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex">
          {!session?.user ? (
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link href="/auth/sign-in" className="nav-item-enhanced text-white hover:text-violet-400 transition-colors duration-300">{t("logIn")}</Link>
              <Button
                variant="outline"
                className="professional-layout-button text-white font-medium btn-enhanced hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link href="/auth/sign-up">{t("signUp")}</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-6 text-xs">
              <LanguageSwitcher />
              <Link
                href="/tickets"
                className="flex gap-2 items-center text-white hover:text-violet-400 transition-all duration-300 nav-item-enhanced cursor-pointer"
              >
                <Ticket className="w-5 h-5" />
                <span>Tickets</span>
              </Link>
              <div className="flex gap-2 items-center text-white hover:text-violet-400 transition-all duration-300 nav-item-enhanced cursor-pointer">
                <Star className="w-5 h-5" />
                <span>Interested</span>
              </div>
              <div className="flex gap-2 group items-center relative cursor-pointer text-white hover:text-violet-400 transition-all duration-300">
                <ProfileDropdown />
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
          "fixed top-0 left-0 h-full w-80 professional-sidebar text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden animate-slide-in-left",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
            <div className="flex items-center gap-3 group">
              <IoTicket size={32} color="yellow" className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <h1 className="text-2xl text-yellow-300 font-bold ml-2 transition-all duration-300 group-hover:text-yellow-400">
                VieTicket
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 professional-layout-button btn-enhanced"
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
                    "nav-item-enhanced py-3 px-4 rounded-lg transition-all duration-300 text-lg font-medium",
                    isActive
                      ? "professional-layout-card text-violet-400 glow-text-layout animate-glow"
                      : "text-white hover:text-violet-400 hover:scale-105"
                  )}
                  onClick={toggleMobileMenu}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Auth Section */}
          <div className="mt-auto p-6 border-t border-slate-600/50">
            {!session?.user ? (
              <div className="space-y-4">
                <Link href="/auth/sign-in" onClick={toggleMobileMenu} className="nav-item-enhanced text-white hover:text-violet-400 transition-colors duration-300">
                  {t("logIn")}
                </Link>
                <Button
                  variant="outline"
                  className="w-full professional-layout-button text-white font-medium btn-enhanced"
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
                  className="flex items-center gap-3 py-3 px-4 rounded-lg text-white hover:text-violet-400 transition-all duration-300 nav-item-enhanced"
                  onClick={toggleMobileMenu}
                >
                  <Ticket className="w-5 h-5" />
                  <span>Tickets</span>
                </Link>
                <div className="flex items-center gap-3 py-3 px-4 rounded-lg text-white hover:text-violet-400 transition-all duration-300 nav-item-enhanced cursor-pointer">
                  <Star className="w-5 h-5" />
                  <span>Interested</span>
                </div>
                <div className="py-3 px-4 text-white hover:text-violet-400 transition-all duration-300 nav-item-enhanced cursor-pointer">
                  <ProfileDropdown />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
