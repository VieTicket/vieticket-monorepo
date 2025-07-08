"use client";

import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { getTicketsAction } from "@/lib/actions/customer/checkout-actions";
import { useState } from "react";

interface BuyTicketButtonProps {
  eventSlug: string;
  eventId?: string;
  isPreview?: boolean;
  className?: string;
  disabled?: boolean;
}

export function BuyTicketButton({
  eventSlug,
  eventId,
  isPreview = false,
  className = "flex items-center justify-center gap-2 bg-[#ffdf20] text-[#2a273f] px-6 py-3 rounded-xl font-semibold hover:bg-yellow-300 transition-colors duration-200 w-full",
  disabled = false,
}: BuyTicketButtonProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isPreview) {
      toast.info("This is a preview - ticket purchasing is not available yet");
      return;
    }

    if (!session?.user) {
      toast.info("Please sign in to purchase tickets");
      router.push("/auth/sign-in");
      return;
    }

    if (session.user.role !== "customer") {
      toast.warning("Only customers can purchase tickets");
      return;
    }

    if (!eventId) {
      toast.error("Event ID is required to purchase tickets");
      return;
    }

    setIsLoading(true);
    try {
      // Call the server action to get ticket data
      const result = await getTicketsAction(eventId);
      console.log(JSON.stringify(result, null, 3));
      
      if (!result.success) {
        toast.error(result.error || "Failed to load ticket information");
        return;
      }

      // Navigate to ticket purchase page with the fetched data
      // We could:
      // use Tanstack Query
      router.push(`/events/${eventSlug}/seat-selection`);
      
    } catch (error) {
      console.error("Error fetching ticket data:", error);
      toast.error("Failed to load ticket information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
    >
      <Ticket className="w-5 h-5" />
      {isLoading ? "Loading..." : isPreview ? "Buy Tickets (Preview)" : "Buy Tickets"}
    </Button>
  );
}