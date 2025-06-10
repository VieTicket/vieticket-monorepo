"use client";

import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex w-1/2 bg-[#2D2A39] text-white flex-col justify-center px-16">
        <h1 className="text-4xl font-bold mb-4">Discover tailored events.</h1>
        <p className="text-2xl">
          Sign in for personalized recommendations today!
        </p>
      </div>
      <div className="w-full lg:w-1/2 flex justify-center items-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
