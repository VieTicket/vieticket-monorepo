"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { UserIcon, Ticket, Heart, Calendar, Settings, LogOut, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  // Mock user data - replace with actual user data
  const user = {
    name: "Nguyễn Văn A",
    email: "user@example.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
  };

  return (
    <div
      onClick={() => {
        setOpen(!open);
      }}
      className="relative"
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex cursor-pointer gap-2 md:items-center p-2 professional-layout-button rounded-lg btn-enhanced group">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-6 h-6 rounded-full object-cover border-2 border-violet-400/30 group-hover:border-violet-400 transition-all duration-300"
            />
            <span className="group-hover:text-violet-400 transition-colors duration-300">Profile</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="mt-2 w-64 professional-dropdown rounded-xl shadow-2xl border border-violet-400/30 text-white"
          align="end"
        >
          {/* User Info */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-violet-400/30"
              />
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {[
              { 
                icon: UserIcon, 
                label: "Hồ sơ cá nhân", 
                href: "/profile",
                description: "Quản lý thông tin cá nhân"
              },
              { 
                icon: Ticket, 
                label: "Vé đã mua", 
                href: "/orders",
                description: "Xem danh sách vé"
              },
              { 
                icon: Heart, 
                label: "Sự kiện yêu thích", 
                href: "/favorites",
                description: "Sự kiện đã lưu"
              },
              { 
                icon: Calendar, 
                label: "Sự kiện của tôi", 
                href: "/my-events",
                description: "Sự kiện đã tạo"
              },
              { 
                icon: Settings, 
                label: "Cài đặt", 
                href: "/profile/edit",
                description: "Tùy chỉnh tài khoản"
              }
            ].map((item) => (
              <DropdownMenuItem key={item.href} className="p-0 focus:bg-transparent">
                <Link
                  href={item.href}
                  className="nav-item-enhanced w-full flex items-center gap-3 p-3 rounded-lg text-white hover:text-violet-400 transition-all duration-300 group hover:scale-105"
                >
                  <div className="p-2 professional-layout-button rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}

            <div className="border-t border-slate-700/50 my-2"></div>

            {/* Logout */}
            <DropdownMenuItem className="p-0 focus:bg-transparent">
              <button
                onClick={() => {
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        router.push("/auth/sign-in");
                      },
                    },
                  });
                }}
                className="nav-item-enhanced w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 group"
              >
                <div className="p-2 professional-layout-button rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Đăng xuất</p>
                  <p className="text-xs text-slate-400 group-hover:text-red-300/70 transition-colors duration-300">
                    Thoát khỏi tài khoản
                  </p>
                </div>
              </button>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
