"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { Star, Ticket } from "lucide-react";
import Link from "next/link";
import { ProfileDropdown } from "./profile-dropdown";
import { IoTicket } from "react-icons/io5";

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <header className="bg-[#2A273F] text-white px-6 py-4 flex items-center justify-between">
      {/* Logo & Brand */}
      <Link className="flex" href="/">
        <IoTicket size={32} color="yellow" />
        <h1 className="text-2xl text-yellow-300 font-bold ml-2">VieTicket</h1>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-8 text-sm">
        <Link
          href="/"
          className="relative text-white hover:text-yellow-400 transition"
        >
          Home
          <div className="h-1 bg-yellow-400 w-full absolute bottom-[-12px] left-0" />
        </Link>
        <Link href="/events" className="hover:text-yellow-400 transition">
          Events
        </Link>
        <Link href="/about" className="hover:text-yellow-400 transition">
          About
        </Link>
        <Link href="/contact" className="hover:text-yellow-400 transition">
          Contact
        </Link>
      </nav>

      {!session?.user ? (
        <div className="flex items-center gap-4">
          <Link href="/auth/sign-in">Log In</Link>
          <Button
            variant="outline"
            className="bg-yellow-400 text-black hover:bg-yellow-300"
            asChild
          >
            <Link href="/auth/sign-up">Sign Up</Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-6 text-xs">
          <div className="flex flex-col items-center">
            <Ticket className="w-5 h-5" />
            <span>Tickets</span>
          </div>
          <div className="flex flex-col items-center">
            <Star className="w-5 h-5" />
            <span>Interested</span>
          </div>
          <div className="flex flex-col items-center relative group cursor-pointer">
            <ProfileDropdown />
          </div>
        </div>
      )}
    </header>
  );
}
