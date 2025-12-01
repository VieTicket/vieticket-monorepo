"use client";

import { IoTicket } from "react-icons/io5";
import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#2D2A39] flex-col md:flex-row min-w-[320px]">
      {/* Left Panel - Logo and Description */}
      <div className="flex flex-col justify-between w-full md:w-1/3">
        {/* Logo */}
        <Link className="flex items-center p-4" href="/">
          <IoTicket size={32} color="yellow" />
          <h1 className="text-2xl text-yellow-300 font-bold ml-2">VieTicket</h1>
        </Link>

        {/* Description - Hidden on mobile, visible on md and up */}
        <div className="pt-12 h-full max-md:hidden md:flex md:flex-col justify-between md:px-8 lg:px-16 md:pb-8">
          <div className="text-yellow-300">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 leading-relaxed">
              Discover and book your favorite events with ease. In VieTicket,
              you explore upcoming shows, secure your tickets instantly, and
              enjoy a smooth, reliable experience from start to finish.
            </h2>
          </div>
          <div className="text-yellow-300 text-sm md:text-base">
            Thank you for choosing us. Enjoy the event!
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 md:w-2/3 flex bg-white justify-center items-center p-6 md:p-8 rounded-t-3xl md:rounded-t-none md:rounded-l-3xl">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
