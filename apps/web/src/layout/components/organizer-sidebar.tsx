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
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "General", href: "/organizer/general", icon: Home },
  { label: "Create Event", href: "/organizer/event/create", icon: NotebookPen },
  { label: "SeatMap", href: "/organizer/seat-map", icon: Map },
  { label: "List Event", href: "/organizer", icon: Calendar },
  { label: "Rating", href: "/organizer/rating", icon: Star },
  {
    label: "Request Payment",
    href: "/organizer/payments",
    icon: Wallet,
  },
  {
    label: "Inspect Ticket",
    href: "/inspector",
    icon: TicketCheck,
  },
  {
    label: "Chat with Admin",
    href: "/organizer/chat?recipientId=admin",
    icon: MessageCircle, // import from lucide-react or similar
  },
  { label: "Profile", href: "/profile/edit", icon: User },
  { label: "Sign out", href: "/auth/sign-out", icon: LogOut },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          // Mobile (fixed)
          "fixed top-0 left-0 h-full z-40 md:relative",
          // Desktop sticky
          "md:sticky md:top-0 md:h-screen md:self-start",
          "bg-[#1f1c33] text-white shadow-2xl border-r border-[#3a3755] overflow-y-auto transition-all duration-300",
          isOpen ? "w-64 px-6" : "w-16 px-2"
        )}
      >
        <button
          className="p-3 rounded-lg text-yellow-400"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
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
          {navItems.map(({ href, label, icon: Icon }) => {
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
      {/* Overlay mobile */}
      {isOpen && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
