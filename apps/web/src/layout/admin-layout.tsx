"use client";

import Header from "@/layout/components/admin-header";
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
  X
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Account", href: "/admin/account", icon: Users },
  { name: "Locked Account", href: "/admin/locked-account", icon: UserX },
  { name: "Organizer Pending Active", href: "/admin/organizer-pending", icon: UserCheck },
  { name: "Events Pending Active", href: "/admin/events-pending", icon: Calendar },
  { name: "Request Payment", href: "/admin/payment-requests", icon: CreditCard },
  { name: "Refund", href: "/admin/refunds", icon: RotateCcw },
];

// Memoized Menu Item Component
const MenuItem = ({ 
  item, 
  isActive, 
  onItemClick 
}: { 
  item: typeof menuItems[0]; 
  isActive: boolean; 
  onItemClick: () => void;
}) => {
  const Icon = item.icon;
  
  return (
    <Link
      href={item.href}
      className={`
        group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 shadow-sm' 
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300'
        }
      `}
      onClick={onItemClick}
    >
      <Icon 
        className={`
          mr-3 flex-shrink-0 h-5 w-5 transition-colors
          ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}
        `} 
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
};

// Memoized Mobile Toggle Button
const MobileToggleButton = ({ 
  isOpen, 
  onToggle 
}: { 
  isOpen: boolean; 
  onToggle: () => void;
}) => (
  <div className="lg:hidden fixed top-20 left-4 z-50">
    <button
      onClick={onToggle}
      className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  </div>
);

// Memoized Sidebar Header
const SidebarHeader = () => (
  <div className="px-4 py-3 border-b border-gray-200">
    <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
    <p className="text-sm text-gray-500">Manage your platform</p>
  </div>
);

// Memoized Sidebar Footer
const SidebarFooter = () => (
  <div className="px-3 py-4 border-t border-gray-200">
    <div className="text-xs text-gray-500 text-center">
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
    setSidebarOpen(prev => !prev);
  }, []);

  const handleItemClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Memoized sidebar class to prevent recalculation
  const sidebarClass = useMemo(() => `
    fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `, [sidebarOpen]);

  // Memoized menu items to prevent re-creation on every render
  const renderedMenuItems = useMemo(() => 
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
    }), [pathname, handleItemClick]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <Header />
      
      {/* Mobile sidebar toggle */}
      <MobileToggleButton isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <div className={sidebarClass}>
          <div className="h-full flex flex-col pt-16">
            {/* Sidebar Header */}
            <SidebarHeader />
            
            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {renderedMenuItems}
              </nav>
            
            {/* Sidebar Footer */}
            <SidebarFooter />
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}
    </div>
  );
}
