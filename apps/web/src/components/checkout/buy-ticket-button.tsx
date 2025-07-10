"use client";

import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { getTicketsAction } from "@/lib/actions/customer/checkout-actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const fetchTicketsMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const result = await getTicketsAction(eventId);
      if (!result.success) {
        throw new Error(result.error || "Failed to load ticket information");
      }
      return result;
    },
    onSuccess: (data, eventId) => {
      // Cache the ticket data with the query key for the seat selection page
      queryClient.setQueryData(['tickets', eventId], data);

      // Navigate to seat selection page WITH eventId as search param
      router.push(`/events/${eventSlug}/seat-selection?eventId=${eventId}`);
    },
    onError: (error) => {
      console.error("Error fetching ticket data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load ticket information");
    },
  });

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

    fetchTicketsMutation.mutate(eventId);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || fetchTicketsMutation.isPending}
      className={className}
    >
      <Ticket className="w-5 h-5" />
      {fetchTicketsMutation.isPending
        ? "Loading..."
        : isPreview
          ? "Buy Tickets (Preview)"
          : "Buy Tickets"
      }
    </Button>
  );
}