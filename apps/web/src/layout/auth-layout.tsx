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
    <div className="flex min-h-screen bg-[#2D2A39]">
      <div className="flex flex-col w-1/2 justify-between items-start rounded-r-4xl">
        <Link className="flex p-4" href="/">
          <IoTicket size={32} color="yellow" />
          <h1 className="text-2xl text-yellow-300 font-bold ml-2">VieTicket</h1>
        </Link>
        <div className="flex text-white flex-col justify-center px-16">
          <h1 className="text-4xl font-bold mb-4">Discover tailored events.</h1>
          <p className="text-2xl">
            Sign in for personalized recommendations today!
          </p>
        </div>
        <div className="h-8"></div>
      </div>
      <div className="w-full lg:w-1/2 flex bg-white justify-center items-center p-8 rounded-l-4xl">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
