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
import { OrgSwitcher } from "@/components/organization/org-switcher";

export default function Header() {
  const { data: session } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();
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
      <header className="bg-[#2A273F] text-white px-6 py-4 flex items-center justify-between relative z-50">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 hover:bg-gray-700"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        {/* Logo & Brand */}
        <Link className="flex" href="/">
          <IoTicket size={32} color="yellow" />
          <h1 className="text-2xl text-yellow-300 font-bold ml-2">VieTicket</h1>
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
                  "relative hover:text-yellow-400 transition",
                  isActive ? "text-yellow-400 font-semibold" : "text-white"
                )}
              >
                {item.label}
                {isActive && (
                  <div className="h-1 bg-yellow-400 w-full absolute -bottom-3 left-0" />
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
              <Link href="/auth/sign-in">{t("logIn")}</Link>
              <Button
                variant="outline"
                className="bg-yellow-400 text-black hover:bg-yellow-300"
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
                className="flex gap-2 items-center hover:text-yellow-400 transition cursor-pointer"
              >
                <Ticket className="w-5 h-5" />
                <span>Tickets</span>
              </Link>
              <div className="flex gap-2 items-center hover:text-yellow-400 transition cursor-pointer">
                <Star className="w-5 h-5" />
                <span>Interested</span>
              </div>
              {organizations && organizations.length > 0 && (
                <div className="flex items-center">
                  <OrgSwitcher />
                </div>
              )}
              <div className="flex gap-2 group items-center relative cursor-pointer hover:text-yellow-400 transition">
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
          "fixed top-0 left-0 h-full w-80 bg-[#2A273F] text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-600">
            <div className="flex items-center">
              <IoTicket size={32} color="yellow" />
              <h1 className="text-2xl text-yellow-300 font-bold ml-2">
                VieTicket
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-700"
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
                    "py-3 px-4 rounded-lg transition text-lg",
                    isActive
                      ? "bg-yellow-400 text-black font-semibold"
                      : "text-white hover:bg-gray-700"
                  )}
                  onClick={toggleMobileMenu}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Auth Section */}
          <div className="mt-auto p-6 border-t border-gray-600">
            {!session?.user ? (
              <div className="space-y-4">
                <Link href="/auth/sign-in" onClick={toggleMobileMenu}>
                  {t("logIn")}
                </Link>
                <Button
                  variant="outline"
                  className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
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
                  className="flex items-center gap-3 py-3 px-4 rounded-lg hover:text-yellow-400 transition"
                  onClick={toggleMobileMenu}
                >
                  <Ticket className="w-5 h-5" />
                  <span>Tickets</span>
                </Link>
                <div className="flex items-center gap-3 py-3 px-4 rounded-lg hover:text-yellow-400 transition cursor-pointer">
                  <Star className="w-5 h-5" />
                  <span>Interested</span>
                </div>
                <div className="py-3 px-4 hover:text-yellow-400 transition cursor-pointer">
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
