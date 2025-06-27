"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Calendar, Star, Wallet, NotebookPen, Map } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "General", href: "/organizer/general", icon: Home },
  { label: "Create Event", href: "/organizer/event/create", icon: NotebookPen },
  { label: "Create SeatMap", href: "/organizer/seatmap", icon: Map },
  { label: "List Event", href: "/organizer", icon: Calendar },
  { label: "Rating", href: "/organizer/rating", icon: Star },
  {
    label: "Request Payment",
    href: "/organizer/payments",
    icon: Wallet,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null; // Chờ đến khi client hydrate

  return (
    <aside className="w-64 bg-[#1f1c33] text-white p-6 flex flex-col gap-8 shadow-2xl border-r border-[#3a3755] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700/40 scrollbar-track-transparent">
      <h2 className="text-2xl font-extrabold tracking-tight text-yellow-400 px-2">
        VieTicket
      </h2>

      <nav className="flex flex-col gap-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-4 px-5 py-3 rounded-2xl font-medium transition-all duration-200",
                isActive
                  ? "bg-yellow-400 text-[#2a273f] ring-2 ring-yellow-300 shadow-inner"
                  : "hover:bg-[#2f2b47] hover:ring-1 hover:ring-yellow-300/40 text-white/80"
              )}
            >
              <Icon
                size={20}
                className={cn(
                  "transition-all duration-200",
                  isActive
                    ? "text-[#2a273f]"
                    : "text-yellow-300 group-hover:text-yellow-200"
                )}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
