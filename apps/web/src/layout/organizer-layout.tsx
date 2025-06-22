"use client";

import Header from "@/layout/components/organizer-header";
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
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Organizer Dashboard</h1>
        </div>
        {children}
      </div>
      <Footer />
    </div>
  );
}
