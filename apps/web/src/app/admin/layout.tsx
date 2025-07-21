import { authorise } from "@/lib/auth/authorise";
import { Role } from "@vieticket/db/pg/schema";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  try {
    // Verify user has admin role
    await authorise("admin" as Role);
    return <>{children}</>;
  } catch {
    // If authorization fails, redirect to home page (404 effect)
    redirect("/");
  }
}
