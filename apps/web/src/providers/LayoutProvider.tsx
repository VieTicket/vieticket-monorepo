"use client";

import AdminLayout from "@/layout/admin-layout";
import AuthLayout from "@/layout/auth-layout";
import MainLayout from "@/layout/main-layout";
import OrganizerLayout from "@/layout/organizer-layout";
import { usePathname } from "next/navigation";

const NO_LAYOUT_PATHS = ["/seat-map", "/inspector"];

function isNoLayoutPage(pathname: string) {
  return NO_LAYOUT_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith("/auth");
  const isAdminPage = pathname.startsWith("/admin");
  const isOrganizerPage = pathname.startsWith("/organizer");
  const noLayout = isNoLayoutPage(pathname);
  const isMainPage =
    !isAuthPage && !isAdminPage && !isOrganizerPage && !noLayout;

  return (
    <>
      {isAuthPage && <AuthLayout>{children}</AuthLayout>}
      {isAdminPage && <AdminLayout>{children}</AdminLayout>}
      {isOrganizerPage && <OrganizerLayout>{children}</OrganizerLayout>}
      {isMainPage && <MainLayout>{children}</MainLayout>}
      {noLayout && <>{children}</>}
    </>
  );
}
