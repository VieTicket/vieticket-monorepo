"use client";

import { useTicketData, useShowingTicketData } from "@/hooks/use-ticket-data";
import { use, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyVND } from "@/lib/utils";
import { createOrderAction } from "@/lib/actions/customer/checkout-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Users,
  CreditCard,
  Clock,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SeatSelectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventId?: string; showingId?: string }>;
}

export default function SeatSelectionPage({
  searchParams,
}: SeatSelectionPageProps) {
  const { eventId, showingId } = use(searchParams);
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [selectedShowingId, setSelectedShowingId] = useState<string>(
    showingId || ""
  );

  // Fetch event data with showings
  const {
    data: eventTicketData,
    isLoading: isLoadingEvent,
    error: eventError,
  } = useTicketData(eventId!);

  // Fetch showing-specific data if showing is selected
  const {
    data: showingTicketData,
    isLoading: isLoadingShowing,
    error: showingError,
  } = useShowingTicketData(selectedShowingId);

  // Determine loading and error states
  const isLoading = selectedShowingId ? isLoadingShowing : isLoadingEvent;
  const error = selectedShowingId ? showingError : eventError;

  const showingData = showingTicketData?.data?.showingData;
  const seatStatus = selectedShowingId
    ? showingTicketData?.data?.seatStatus
    : eventTicketData?.data?.seatStatus; // Use event seat status when no showing selected
  const isTicketSaleActive = showingTicketData?.data?.isTicketSaleActive;

  // Check if showing-specific error indicates tickets not on sale
  const isShowingNotOnSale =
    selectedShowingId &&
    (showingError?.message.includes("Tickets are not currently on sale") ||
      showingError?.message.includes("Ticket sales have ended") ||
      (showingTicketData?.data && isTicketSaleActive === false));

  // Get data from appropriate source
  const eventData =
    (selectedShowingId
      ? showingTicketData?.data?.eventData
      : eventTicketData?.data?.eventData) || eventTicketData?.data?.eventData;

  const seatingStructure = selectedShowingId
    ? showingTicketData?.data?.seatingStructure
    : eventTicketData?.data?.seatingStructure; // Use event seating structure when no showing selected

  // Get showings from event data
  const showings = eventTicketData?.data?.showings || [];
  const maxTicketsByOrder = eventData?.maxTicketsByOrder;

  // Debug logging
  console.log("Debug - seat selection data:", {
    eventId,
    selectedShowingId,
    eventData: !!eventData,
    seatingStructure: !!seatingStructure,
    seatingStructureLength: seatingStructure?.length,
    seatStatus: !!seatStatus,
    showingsLength: showings.length,
    eventTicketData: !!eventTicketData?.data,
    showingTicketData: !!showingTicketData?.data,
    isTicketSaleActive,
    isShowingNotOnSale,
    showingError: showingError?.message,
  });

  // Validate seat selection against maxTicketsByOrder
  const canSelectMoreSeats = useMemo(() => {
    if (!maxTicketsByOrder) return true;
    return selectedSeats.length < maxTicketsByOrder;
  }, [selectedSeats.length, maxTicketsByOrder]);

  const handleShowingChange = (newShowingId: string) => {
    setSelectedShowingId(newShowingId);
    setSelectedSeats([]); // Clear selected seats when changing showing
  };

  const handleSeatClick = (seatId: string, canSelect: boolean) => {
    if (!canSelect) return;

    // Don't allow seat selection if tickets are not on sale yet
    if (isTicketSaleActive === false) {
      toast.error("Ticket sales have not started yet");
      return;
    }

    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        // Deselecting - always allowed
        return prev.filter((id) => id !== seatId);
      } else {
        // Selecting - check limits
        if (!canSelectMoreSeats) {
          toast.error(
            `You can only select up to ${maxTicketsByOrder} tickets per order`
          );
          return prev;
        }
        return [...prev, seatId];
      }
    });
  };

  const getSeatStatus = (seatId: string) => {
    // Only available if we have seat status data (showing selected)
    if (!seatStatus) return "available";

    if (seatStatus.paidSeatIds.includes(seatId)) return "sold";
    if (seatStatus.activeHoldSeatIds.includes(seatId)) return "held";
    return "available";
  };

  const getSeatStatusColor = (
    status: string,
    isSelected: boolean,
    canSelect: boolean
  ) => {
    if (isSelected) return "bg-blue-500 text-white border-blue-600";

    if (!canSelect && status === "available") {
      return "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300";
    }

    switch (status) {
      case "sold":
        return "bg-red-500 text-white cursor-not-allowed";
      case "held":
        return "bg-yellow-500 text-white cursor-not-allowed";
      case "available":
        return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 cursor-pointer";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const calculateTotal = () => {
    if (!seatingStructure) return 0;

    let total = 0;
    for (const area of seatingStructure) {
      for (const row of area.rows) {
        for (const seat of row.seats) {
          if (selectedSeats.includes(seat.id)) {
            total += area.price;
          }
        }
      }
    }
    return total;
  };

  const getSelectedSeatDetails = () => {
    if (!seatingStructure) return [];

    const details: Array<{
      seatId: string;
      areaName: string;
      rowName: string;
      seatNumber: string;
      price: number;
    }> = [];

    for (const area of seatingStructure) {
      for (const row of area.rows) {
        for (const seat of row.seats) {
          if (selectedSeats.includes(seat.id)) {
            details.push({
              seatId: seat.id,
              areaName: area.name,
              rowName: row.rowName,
              seatNumber: seat.seatNumber,
              price: area.price,
            });
          }
        }
      }
    }
    return details;
  };

  const handleProceedToPayment = async () => {
    if (selectedSeats.length === 0) {
      toast.error("Please select at least one seat");
      return;
    }

    if (!selectedShowingId && showings.length > 0) {
      toast.error("Please select a showing first");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const result = await createOrderAction(
        eventId!,
        selectedSeats,
        selectedShowingId || undefined
      );

      if (result.success && result.data) {
        toast.success("Order created successfully! Redirecting to payment...");
        // Redirect to VNPay payment URL
        window.location.href = result.data.vnpayURL;
      } else {
        toast.error(result.error?.message || "Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading ticket information...</p>
        </div>
      </div>
    );
  }

  if (error && !isShowingNotOnSale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">
              Error loading tickets: {error.message}
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!eventTicketData?.data && !showingTicketData?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">No event data available</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">Event data not found</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format showing time for display
  const formatShowingTime = (showing: any) => {
    const startTime = new Date(showing.startTime);
    const endTime = new Date(showing.endTime);
    return {
      date: startTime.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: `${startTime.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${endTime.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select Your Seats
        </h1>
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <MapPin className="w-4 h-4" />
          <span>{eventData?.name}</span>
          <span>•</span>
          <span>{eventData?.location}</span>
        </div>

        {/* Max tickets notice */}
        {maxTicketsByOrder && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mb-4">
            <Users className="w-4 h-4" />
            <span>Maximum {maxTicketsByOrder} tickets per order</span>
          </div>
        )}
      </div>

      {/* Showing Selection */}
      {showings.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Showing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedShowingId}
              onValueChange={handleShowingChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a showing time" />
              </SelectTrigger>
              <SelectContent>
                {showings.map((showing: any) => {
                  const timeInfo = formatShowingTime(showing);
                  return (
                    <SelectItem key={showing.id} value={showing.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {showing.name || timeInfo.date}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedShowingId && isShowingNotOnSale && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {isTicketSaleActive === false
                      ? "Tickets Not Yet Available"
                      : "Tickets Not Available"}
                  </span>
                </div>
                <p className="text-sm text-orange-600 mb-3">
                  {isTicketSaleActive === false
                    ? "Ticket sales have not started for this showing yet. You can preview the seating chart below."
                    : "Tickets are not currently available for this showing. Please select another showing time."}
                </p>

                {/* Show ticket sale times when available */}
                {showingData &&
                  (showingData.ticketSaleStart ||
                    showingData.ticketSaleEnd) && (
                    <div className="text-xs text-orange-600 mb-3 p-2 bg-orange-100 rounded">
                      <div className="font-medium mb-1">
                        Ticket Sale Period:
                      </div>
                      {showingData.ticketSaleStart && (
                        <div>
                          Starts:{" "}
                          {new Date(
                            showingData.ticketSaleStart
                          ).toLocaleDateString("vi-VN", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                      {showingData.ticketSaleEnd && (
                        <div>
                          Ends:{" "}
                          {new Date(
                            showingData.ticketSaleEnd
                          ).toLocaleDateString("vi-VN", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  )}
                {isTicketSaleActive === false ? (
                  <p className="text-xs text-orange-500">
                    Note: You cannot purchase tickets until sales begin.
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedShowingId("");
                      setSelectedSeats([]);
                    }}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    Choose Different Showing
                  </Button>
                )}
              </div>
            )}

            {selectedShowingId &&
              showingData &&
              !isShowingNotOnSale &&
              (showingData.ticketSaleStart || showingData.ticketSaleEnd) && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Ticket Sale Period
                  </h4>
                  <div className="text-sm text-blue-700">
                    <div className="ml-2 text-xs">
                      {showingData.ticketSaleStart && (
                        <div>
                          From:{" "}
                          {new Date(
                            showingData.ticketSaleStart
                          ).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                      {showingData.ticketSaleEnd && (
                        <div>
                          Until:{" "}
                          {new Date(
                            showingData.ticketSaleEnd
                          ).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Show seating chart if we have seating structure and either no showings exist or a valid showing is selected */}
      {seatingStructure && (showings.length === 0 || selectedShowingId) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Seating Chart
                </CardTitle>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span>On Hold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Sold</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {seatingStructure?.map((area: any) => (
                  <div key={area.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{area.name}</h3>
                      <Badge variant="secondary">
                        {formatCurrencyVND(area.price)}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {area.rows.map((row: any) => (
                        <div key={row.id} className="flex items-center gap-2">
                          {/* <div className="w-12 text-sm font-medium text-gray-600 text-right">
                            {row.rowName}
                          </div> */}
                          <div className="flex flex-wrap gap-1">
                            {row.seats.map((seat: any) => {
                              const status = getSeatStatus(seat.id);
                              const isSelected = selectedSeats.includes(
                                seat.id
                              );
                              const isAvailable = status === "available";
                              const canSelect =
                                isAvailable &&
                                (canSelectMoreSeats || isSelected) &&
                                isTicketSaleActive !== false; // Disable selection if sales not active

                              return (
                                <button
                                  key={seat.id}
                                  onClick={() =>
                                    handleSeatClick(seat.id, canSelect)
                                  }
                                  className={`
                                  w-8 h-8 text-xs font-medium rounded border transition-colors
                                  ${getSeatStatusColor(status, isSelected, canSelect)}
                                `}
                                  disabled={!canSelect}
                                  title={`Seat ${seat.seatNumber} - ${status}${!canSelect && isAvailable ? " (limit reached)" : ""}`}
                                >
                                  {seat.seatNumber}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {maxTicketsByOrder && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    Selected: {selectedSeats.length} / {maxTicketsByOrder}{" "}
                    tickets
                  </div>
                )}

                {selectedSeats.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No seats selected
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {getSelectedSeatDetails().map((seat) => (
                        <div
                          key={seat.seatId}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {seat.areaName} - {seat.rowName} - Seat{" "}
                            {seat.seatNumber}
                          </span>
                          <span>{formatCurrencyVND(seat.price)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold">
                      <span>Total ({selectedSeats.length} seats)</span>
                      <span>{formatCurrencyVND(calculateTotal())}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleProceedToPayment}
              disabled={
                selectedSeats.length === 0 ||
                isCreatingOrder ||
                isTicketSaleActive === false ||
                (showings.length > 0 &&
                  (!selectedShowingId || !!isShowingNotOnSale))
              }
              className="w-full"
              size="lg"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Order...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Message when no showing selected or showing not on sale */}
      {showings.length > 0 && !selectedShowingId && (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a Showing
            </h3>
            <p className="text-gray-600">
              Please choose a showing time above to view available seats.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
