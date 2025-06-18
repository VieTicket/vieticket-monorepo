"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsSidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Account Info", href: "/profile/edit" },
    { name: "Password", href: "/profile/password" },
  ];

  return (
    <aside className="bg-slate-50 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Account Settings
      </h2>
      <nav>
        <ul>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    block w-full text-left px-4 py-2 rounded-md text-slate-600
                    hover:bg-slate-200 hover:text-slate-800 transition-colors
                    ${
                      isActive
                        ? "bg-slate-200 font-semibold text-slate-900"
                        : ""
                    }
                  `}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}