import { useQuery } from "@tanstack/react-query";
import {
  getTicketsAction,
  getShowingTicketsAction,
} from "@/lib/actions/customer/checkout-actions";

export function useTicketData(eventId: string) {
  return useQuery({
    queryKey: ["tickets", eventId],
    queryFn: async () => {
      const result = await getTicketsAction(eventId);
      if (!result.success) {
        throw new Error(result.error || "Failed to load ticket information");
      }
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - ticket availability changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for ticket data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    enabled: !!eventId, // Only run query if eventId exists
  });
}

export function useShowingTicketData(showingId: string) {
  return useQuery({
    queryKey: ["showing-tickets", showingId],
    queryFn: async () => {
      const result = await getShowingTicketsAction(showingId);
      if (!result.success) {
        throw new Error(
          result.error || "Failed to load showing ticket information"
        );
      }
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - ticket availability changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for ticket data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    enabled: !!showingId, // Only run query if showingId exists
  });
}
