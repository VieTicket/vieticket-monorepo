"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Calendar,
  Star,
  Wallet,
  NotebookPen,
  Map,
  Menu,
  X,
  MessageCircle,
  TicketCheck,
  LogOut,
  User,
  Building2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { OrgSwitcher } from "@/components/organization/org-switcher";

export default function Sidebar() {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const t = useTranslations("organizer-dashboard");

  const navItems = [
    { label: t("General.general"), href: "/organizer/general", icon: Home },
    {
      label: t("CreateEvent.createEvent"),
      href: "/organizer/event/create",
      icon: NotebookPen,
    },
    {
      label: t("SeatMap.seatMap"),
      href: "/organizer/seat-map",
      icon: Map,
      hideOnMobile: true,
    },
    { label: t("ListEvent.listEvent"), href: "/organizer", icon: Calendar },
    { label: t("Rating.rating"), href: "/organizer/rating", icon: Star },
    {
      label: t("RequestPayout.requestPayout"),
      href: "/organizer/payouts",
      icon: Wallet,
    },
    {
      label: t("InspectTicket.inspectTicket"),
      href: "/inspector",
      icon: TicketCheck,
    },
    {
      label: t("ChatWithAdmin.chatWithAdmin"),
      href: "/organizer/chat?recipientId=admin",
      icon: MessageCircle,
    },
    { label: "Organization", href: "/organizer/organization", icon: Building2 },
    { label: t("Profile.profile"), href: "/profile/edit", icon: User },
    { label: t("SignOut.signOut"), href: "/auth/sign-out", icon: LogOut },
  ];

  useEffect(() => {
    setHasMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!hasMounted) return null;

  return (
    <>
      {/* Mobile Header Bar - sticky at top */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1f1c33] text-white border-b border-[#3a3755] px-4 py-3 flex items-center justify-end h-16">
        <button
          className="p-2 rounded-lg text-yellow-400"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {isOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 z-40 bg-[#1f1c33] border-b border-[#3a3755] shadow-2xl">
            <nav className="flex flex-col">
              {navItems
                .filter((item) => item.href !== "/organizer/seat-map")
                .map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "group flex items-center gap-4 px-4 py-4 transition-all duration-200 font-medium border-b border-[#3a3755]/50",
                        isActive
                          ? "bg-yellow-400 text-[#2a273f]"
                          : "hover:bg-[#2f2b47] text-white/80"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon
                        size={22}
                        className={cn(
                          "transition-all duration-200",
                          isActive ? "text-[#2a273f]" : "text-yellow-300"
                        )}
                      />
                      <span>{label}</span>
                    </Link>
                  );
                })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block",
          // Desktop sticky
          "sticky top-0 h-screen self-start",
          "bg-[#1f1c33] text-white shadow-2xl border-r border-[#3a3755] overflow-y-auto transition-all duration-300",
          isOpen ? "w-64 px-6" : "w-16 px-2"
        )}
      >
        <button
          className="p-3 pt-6 rounded-lg text-yellow-400"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {isOpen && (
          <div className="mb-4 px-1">
            <OrgSwitcher className="w-full" />
          </div>
        )}

        {/* Logo */}
        <div
          className={cn(
            "text-2xl font-extrabold tracking-tight text-yellow-400 flex items-center transition-all duration-300",
            !isOpen && "justify-center"
          )}
        >
          {isOpen ? "" : ""}
        </div>
        <nav className="flex flex-col gap-2">
          {navItems
            .filter((item) => !(isMobile && item.hideOnMobile))
            .map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center transition-all duration-200 rounded-2xl font-medium",
                    isOpen ? "gap-4 px-4 py-3" : "px-[5px] py-3 justify-center",
                    isActive
                      ? "bg-yellow-400 text-[#2a273f] ring-2 ring-yellow-300 shadow-inner"
                      : "hover:bg-[#2f2b47] hover:ring-1 hover:ring-yellow-300/40 text-white/80"
                  )}
                  onClick={() => {
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                >
                  <Icon
                    size={22}
                    className={cn(
                      "transition-all duration-200",
                      isActive
                        ? "text-[#2a273f]"
                        : "text-yellow-300 group-hover:text-yellow-200"
                    )}
                  />
                  {isOpen && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
        </nav>
      </aside>
    </>
  );
}
