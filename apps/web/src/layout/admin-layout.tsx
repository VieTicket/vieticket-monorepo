"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  UserCheck,
  UserX,
  Calendar,
  CreditCard,
  RotateCcw,
  Menu,
  X,
  MessageCircle,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Account", href: "/admin/account", icon: Users },
  { name: "Locked Account", href: "/admin/locked-account", icon: UserX },
  {
    name: "Organizer Pending Active",
    href: "/admin/organizer-pending",
    icon: UserCheck,
  },
  {
    name: "Events Pending Active",
    href: "/admin/events-pending",
    icon: Calendar,
  },
  {
    name: "Payout Requests",
    href: "/admin/payment-requests",
    icon: CreditCard,
  },
  {
    name: "Refunds",
    href: "/admin/refunds",
    icon: RotateCcw,
  },
  { name: "Chat", href: "/admin/chat", icon: MessageCircle },
  { name: "Sign out", href: "/auth/sign-out", icon: LogOut },
];

// Memoized Menu Item Component
const MenuItem = ({
  item,
  isActive,
  onItemClick,
}: {
  item: (typeof menuItems)[0];
  isActive: boolean;
  onItemClick: () => void;
}) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center transition-all duration-200 rounded-2xl font-medium",
        "px-4 py-3 gap-3",
        isActive
          ? "bg-yellow-400 text-[#2a273f] ring-2 ring-yellow-300 shadow-inner"
          : "hover:bg-[#2f2b47] hover:ring-1 hover:ring-yellow-300/40 text-white/80"
      )}
      onClick={onItemClick}
    >
      <Icon
        className={cn(
          "shrink-0 h-5 w-5 transition-all duration-200",
          isActive
            ? "text-[#2a273f]"
            : "text-yellow-300 group-hover:text-yellow-200"
        )}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
};

// Memoized Mobile Toggle Button
const MobileToggleButton = ({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="lg:hidden fixed top-4 left-4 z-50">
    <button
      onClick={onToggle}
      className="p-2 bg-slate-800/95 backdrop-blur-md border border-violet-400/30 rounded-lg shadow-lg hover:bg-slate-700/95 hover:border-violet-400/50 transition-all duration-300 text-yellow-400"
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  </div>
);

// Memoized Sidebar Header
const SidebarHeader = () => (
  <div className="px-4 py-4 border-b border-slate-700/50">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gradient-to-br from-yellow-400 to-violet-500 rounded-lg">
        <Shield className="h-5 w-5 text-[#2a273f]" />
      </div>
      <div>
        <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">
          Admin Panel
        </h2>
        <p className="text-xs text-slate-400">Manage your platform</p>
      </div>
    </div>
  </div>
);

// Memoized Sidebar Footer
const SidebarFooter = () => (
  <div className="px-4 py-4 border-t border-slate-700/50">
    <div className="text-xs text-slate-400 text-center font-medium">
      VieTicket Admin
    </div>
  </div>
);

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Memoized sidebar class to prevent recalculation
  const sidebarClass = useMemo(
    () => cn(
      "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900/95 backdrop-blur-md border-r border-slate-700/50 shadow-xl transform transition-transform duration-300 ease-in-out",
      sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    ),
    [sidebarOpen]
  );

  // Memoized menu items to prevent re-creation on every render
  const renderedMenuItems = useMemo(
    () =>
      menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <MenuItem
            key={item.href}
            item={item}
            isActive={isActive}
            onItemClick={handleItemClick}
          />
        );
      }),
    [pathname, handleItemClick]
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Mobile sidebar toggle */}
      <MobileToggleButton isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <div className={sidebarClass}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <SidebarHeader />

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
              {renderedMenuItems}
            </nav>

            {/* Sidebar Footer */}
            <SidebarFooter />
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 bg-white text-gray-900">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={handleOverlayClick}
        />
      )}
    </div>
  );
}
