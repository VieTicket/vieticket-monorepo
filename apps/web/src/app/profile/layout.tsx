import { SettingsSidebar } from "@/components/profile/settings-sidebar";
import { ReactNode } from "react";

export default function ProfilePageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-4 lg:min-h-screen gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 lg:h-full h-auto lg:min-w-72 lg:max-w-xs">
            <SettingsSidebar />
          </div>

          {/* Right Content */}
          <main className="lg:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
