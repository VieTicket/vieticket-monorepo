import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProfileDropdown() {
  const router = useRouter();
  return (
    <div className="absolute top-full left-1/2 transform -translate-x-3/4 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
      <div className="bg-white text-gray-800 rounded-xl shadow-lg border min-w-[150px] py-1">
        <div
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm hover:rounded-tl rounded-tl-full hover:rounded-tr rounded-tr-full"
          onClick={() => router.push("/interests")}
        >
          Interests
        </div>
        <div
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
          onClick={() => router.push("/profile")}
        >
          Account Settings
        </div>
        <div
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm hover:rounded-bl rounded-bl-full hover:rounded-br rounded-br-full"
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
        </div>
      </div>
    </div>
  );
}
