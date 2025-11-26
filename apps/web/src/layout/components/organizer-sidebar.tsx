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
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function Sidebar() {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Changed to false for mobile by default
  const t = useTranslations("organizer-dashboard");

  const navItems = [
  { label: t("General.general"), href: "/organizer/general", icon: Home },
  { label: t("CreateEvent.createEvent"), href: "/organizer/event/create", icon: NotebookPen },
  { label: t("SeatMap.seatMap"), href: "/organizer/seat-map", icon: Map },
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
  { label: t("Profile.profile"), href: "/profile/edit", icon: User },
  { label: t("SignOut.signOut"), href: "/auth/sign-out", icon: LogOut },
];

  useEffect(() => {
    setHasMounted(true);
    // Set isOpen to true for desktop by default
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!hasMounted) return null;

  return (
    <>
      {/* Mobile Header Bar - sticky at top */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 professional-header text-white border-b border-violet-400/30 px-4 py-3 flex items-center justify-end h-16">
        <button
          className="p-2 rounded-lg professional-layout-button btn-enhanced text-violet-400"
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
          <div className="fixed top-16 left-0 right-0 z-40 professional-dropdown border-b border-violet-400/30 shadow-2xl animate-slide-down">
            <nav className="flex flex-col">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "nav-item-enhanced group flex items-center gap-4 px-4 py-4 transition-all duration-300 font-medium border-b border-slate-700/50",
                      isActive
                        ? "professional-layout-card text-violet-400 glow-text-layout animate-glow"
                        : "text-white hover:text-violet-400 hover:scale-105"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-violet-400/20 text-violet-400"
                        : "group-hover:bg-white/10 group-hover:scale-110"
                    )}>
                      <Icon size={22} />
                    </div>
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
          "professional-sidebar text-white shadow-2xl border-r border-violet-400/30 overflow-y-auto transition-all duration-300 animate-slide-in-left",
          isOpen ? "w-64 px-6" : "w-16 px-2"
        )}
      >
        <button
          className="p-3 pt-6 rounded-lg professional-layout-button btn-enhanced text-violet-400"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        {/* Header */}
        <div className="mb-8">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <div className="p-2 professional-layout-card rounded-xl animate-glow">
                <Globe className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white glow-text-layout">
                  Nhà tổ chức
                </h2>
                <p className="text-xs text-slate-400">Quản lý sự kiện</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="p-2 professional-layout-card rounded-xl animate-glow">
                <Globe className="w-6 h-6 text-violet-400" />
              </div>
            </div>
          )}
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "nav-item-enhanced group flex items-center transition-all duration-300 rounded-2xl font-medium relative",
                  isOpen ? "gap-4 px-4 py-3" : "px-[5px] py-3 justify-center",
                  isActive
                    ? "professional-layout-card text-violet-400 glow-text-layout animate-glow"
                    : "text-white hover:text-violet-400 hover:scale-105"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  isActive
                    ? "bg-violet-400/20 text-violet-400"
                    : "group-hover:bg-white/10 group-hover:scale-110"
                )}>
                  <Icon size={22} />
                </div>
                {isOpen && (
                  <div className="flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                      {isActive ? "Đang xem" : "Nhấp để xem"}
                    </p>
                  </div>
                )}
                
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-violet-400 rounded-l-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info at Bottom */}
        {isOpen && (
          <div className="mt-8 p-3 professional-layout-card rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
                alt="Organizer"
                className="w-10 h-10 rounded-full object-cover border-2 border-violet-400/30"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  Tổ chức ABC
                </p>
                <p className="text-xs text-slate-400">
                  Premium Plan
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
