"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, memo } from "react";

const ProfileDropdown = memo(function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const handleToggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);
  
  const handleAccountSettings = useCallback(() => {
    router.push("/profile");
  }, [router]);
  
  const handleLogOut = useCallback(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth/sign-in");
        },
      },
    });
  }, [router]);
  
  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div 
            className="flex flex-col items-center space-x-1 cursor-pointer"
            onClick={handleToggle}
          >
            <UserIcon className="w-5 h-5" />
            <span>Profile</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="mt-2 rounded-xl shadow-lg border bg-white text-gray-800"
          align="end"
        >
          <DropdownMenuItem>Interests</DropdownMenuItem>
          <DropdownMenuItem onClick={handleAccountSettings}>
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogOut}>
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export { ProfileDropdown };
