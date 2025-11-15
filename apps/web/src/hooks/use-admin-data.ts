import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types for the API response
export interface AdminStats {
  totalRevenue: number;
  ongoingEvents: number;
  activeOrganizers: number;
  allUsers: number;
  revenueChange: number;
  eventsChange: number;
  organizersChange: number;
  usersChange: number;
}

export interface ChartData {
  revenue: {
    labels: string[];
    data: number[];
  };
  events: {
    labels: string[];
    data: number[];
  };
}

export interface EventShowing {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  ticketSaleStart: string | null;
  ticketSaleEnd: string | null;
  isActive: boolean;
}

export interface PendingEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  price: number;
  capacity: number;
  organizer_name: string;
  organizer_email: string;
  created_at: string;
  approvalStatus: "pending" | "approved" | "rejected"; // Changed from is_approved
  image_url?: string;
  category: string;
  showings?: EventShowing[];
}

export interface UpdateEventApprovalRequest {
  eventId: string;
  approvalStatus: "approved" | "rejected"; // Changed from isApproved
}

// API functions
const fetchAdminStats = async (): Promise<AdminStats> => {
  const response = await fetch("/api/admin/stats");
  if (!response.ok) {
    throw new Error("Failed to fetch admin statistics");
  }
  return response.json();
};

const fetchChartData = async (startDate?: string, endDate?: string): Promise<ChartData> => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  
  const url = `/api/admin/charts${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch chart data");
  }
  return response.json();
};

const fetchPendingEvents = async (): Promise<PendingEvent[]> => {
  const response = await fetch("/api/admin/events-pending");
  if (!response.ok) {
    throw new Error("Failed to fetch pending events");
  }
  return response.json();
};

const fetchAllEvents = async (): Promise<PendingEvent[]> => {
  const response = await fetch("/api/admin/events");
  if (!response.ok) {
    throw new Error("Failed to fetch all events");
  }
  return response.json();
};

const updateEventApproval = async ({
  eventId,
  approvalStatus,
}: UpdateEventApprovalRequest): Promise<void> => {
  const response = await fetch(`/api/admin/events/${eventId}/approval`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approval_status: approvalStatus }), // Changed field name
  });

  if (!response.ok) {
    throw new Error("Failed to update event approval status");
  }
};

// React Query hooks
export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useChartData = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["chart-data", startDate, endDate],
    queryFn: () => fetchChartData(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const usePendingEvents = () => {
  return useQuery({
    queryKey: ["pending-events"],
    queryFn: fetchPendingEvents,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAllEvents = () => {
  return useQuery({
    queryKey: ["all-events"],
    queryFn: fetchAllEvents,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateEventApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEventApproval,
    onSuccess: () => {
      // Invalidate and refetch all events
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      // Also invalidate admin stats since approval affects counts
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
};
