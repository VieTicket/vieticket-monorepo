"use client";

import React from "react";
import Footer from "./components/footer";

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        {children}
      </div>
      <Footer />
    </div>
  );
}
