"use client";

import Header from "@/layout/components/main-header";
import React from "react";
import Footer from "./components/footer";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950">
      <div>
        <Header />
        {children}
      </div>
      <Footer />
    </div>
  );
}
