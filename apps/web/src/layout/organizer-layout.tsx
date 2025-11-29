"use client";

import React from "react";
import Footer from "./components/footer";
import Sidebar from "./components/organizer-sidebar";

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 bg-white dark:bg-background pt-16 md:pt-0">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
