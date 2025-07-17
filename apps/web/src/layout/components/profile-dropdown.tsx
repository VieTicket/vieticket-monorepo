"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div
      onClick={() => {
        setOpen(!open);
      }}
      className="relative"
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex flex-col items-center space-x-1 cursor-pointer">
            <UserIcon className="w-5 h-5" />
            <span>Profile</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="mt-2 rounded-xl shadow-lg border bg-white text-gray-800"
          align="end"
        >
          <DropdownMenuItem>
            <Link href={"/orders"}>My Orders</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Interests</DropdownMenuItem>
          <DropdownMenuItem>
            <Link href={"/profile/edit"}>Account Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/auth/sign-in");
                  },
                },
              });
            }}
          >
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
