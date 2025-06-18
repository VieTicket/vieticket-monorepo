import { SettingsSidebar } from "@/components/profile/settings-sidebar";
import { ReactNode } from "react";

export default function ProfilePageLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-white min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Sidebar */}
                    <div className="lg:col-span-1">
                        <SettingsSidebar />
                    </div>

                    {/* Right Content */}
                    <main className="lg:col-span-3">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}