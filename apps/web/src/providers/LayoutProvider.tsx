"use client";

import AdminLayout from "@/layout/admin-layout";
import AuthLayout from "@/layout/auth-layout";
import MainLayout from "@/layout/main-layout";
import OrganizerLayout from "@/layout/organizer-layout";
import { usePathname } from "next/navigation";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith("/auth");
  const isAdminPage = pathname.startsWith("/admin");
  const isOrganizerPage = pathname.startsWith("/organizer");
  const isUserPage = pathname === "/";

  console.log("isAuthPage:", isAuthPage);
  console.log("isAdminPage:", isAdminPage);
  console.log("isOrganizerPage:", isOrganizerPage);
  console.log("isUserPage:", isUserPage);
  return (
    <>
      {isAuthPage && <AuthLayout>{children}</AuthLayout>}
      {isAdminPage && <AdminLayout>{children}</AdminLayout>}
      {isOrganizerPage && <OrganizerLayout>{children}</OrganizerLayout>}
      {isUserPage && <MainLayout>{children}</MainLayout>}
    </>
  );
}
