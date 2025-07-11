// apps/web/src/app/organizer/layout.tsx

import React from "react";
import Sidebar from "./components/Sidebar";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-white dark:bg-background">{children}</div>
    </div>
  );
}
