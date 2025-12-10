"use client";

import { useTranslations } from "next-intl";
import { useTicketData, useShowingTicketData } from "@/hooks/use-ticket-data";
import { use, useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyVND } from "@/lib/utils";
import { createGAOrderAction } from "@/lib/actions/customer/checkout-actions";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface SeatSelectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventId?: string; showingId?: string }>;
}

export default function SeatSelectionPage({
  searchParams,
}: SeatSelectionPageProps) {
  const t = useTranslations("event.seatSelection");
  const { eventId, showingId } = use(searchParams);
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [selectedShowingId, setSelectedShowingId] = useState<string>(
    showingId || ""
  );
  const [gaQuantities, setGaQuantities] = useState<Record<string, number>>({});

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
    : eventTicketData?.data?.seatStatus;
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
    : eventTicketData?.data?.seatingStructure;

  // Get showings from event data
  const showings = eventTicketData?.data?.showings || [];
  const maxTicketsByOrder = eventData?.maxTicketsByOrder;
  const isGeneralAdmission = !eventData?.seatMapId;

  const gaAreas = useMemo(
    () => (isGeneralAdmission ? seatingStructure || [] : []),
    [isGeneralAdmission, seatingStructure]
  );

  useEffect(() => {
    if (gaAreas.length === 0) return;
    setGaQuantities((prev) => {
      const next = { ...prev };
      gaAreas.forEach((area: any) => {
        if (next[area.id] === undefined) {
          next[area.id] = 0;
        }
      });
      return next;
    });
  }, [gaAreas]);

  const areaAvailability = useMemo(() => {
    const availability: Record<string, number> = {};
    gaAreas.forEach((area: any) => {
      let seatCount = 0;
      area.rows?.forEach((row: any) => {
        row.seats?.forEach((seat: any) => {
          const isUnavailable =
            seatStatus?.paidSeatIds?.includes(seat.id) ||
            seatStatus?.activeHoldSeatIds?.includes(seat.id);
          if (!isUnavailable) seatCount += 1;
        });
      });
      availability[area.id] = seatCount;
    });
    return availability;
  }, [gaAreas, seatStatus]);

  const totalSelectedGA = useMemo(
    () => Object.values(gaQuantities).reduce((sum, qty) => sum + qty, 0),
    [gaQuantities]
  );

  const exceedsMaxTickets =
    maxTicketsByOrder != null && totalSelectedGA > maxTicketsByOrder;

  const resolvedShowingId =
    selectedShowingId ||
    showingId ||
    (showings.length === 1 ? showings[0].id : "");
  const canShowContent = showings.length === 0 || !!resolvedShowingId;
  const proceedDisabled =
    isCreatingOrder ||
    isTicketSaleActive === false ||
    !canShowContent ||
    !!isShowingNotOnSale ||
    totalSelectedGA === 0 ||
    exceedsMaxTickets ||
    gaAreas.some(
      (area: any) =>
        (gaQuantities[area.id] || 0) >
        (areaAvailability[area.id] ?? Number.MAX_SAFE_INTEGER)
    );

  const handleShowingChange = (newShowingId: string) => {
    setSelectedShowingId(newShowingId);
  };

  const handleProceedToPayment = async () => {
    const targetShowingId =
      selectedShowingId ||
      showingId ||
      (showings.length === 1 ? showings[0].id : "");

    if (isGeneralAdmission) {
      if (!targetShowingId) {
        toast.error(t("selectShowingFirst"));
        return;
      }
      if (totalSelectedGA === 0) {
        toast.error("Please select at least one ticket");
        return;
      }
      if (exceedsMaxTickets) {
        toast.error(
          `Cannot select more than ${maxTicketsByOrder} tickets per order`
        );
        return;
      }

      setIsCreatingOrder(true);
      try {
        const areaPayload = Object.entries(gaQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([areaId, quantity]) => ({ areaId, quantity }));

        const result = await createGAOrderAction(
          eventId!,
          targetShowingId,
          areaPayload
        );

        if (result.success && result.data) {
          toast.success("Order created successfully! Redirecting to payment...");
          window.location.href = result.data.vnpayURL;
        } else {
          toast.error(result.error?.message || "Failed to create order");
        }
      } catch (error) {
        console.error("Error creating GA order:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setIsCreatingOrder(false);
      }
      return;
    }

  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t("loading")}</p>
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
              {t("errorLoadingTickets")} {error.message}
            </p>
            <Button onClick={() => router.back()}>{t("goBack")}</Button>
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
          {t("title")}
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
              {t("selectShowing")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedShowingId}
              onValueChange={handleShowingChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectShowing")} />
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

      {isGeneralAdmission && canShowContent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  General Admission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {gaAreas.map((area: any) => (
                    <div
                      key={area.id}
                      className="p-3 rounded-lg border border-gray-100"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{area.name}</p>
                          <p className="text-sm text-gray-600">
                            {formatCurrencyVND(area.price)}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          Available: {areaAvailability[area.id] ?? 0}
                        </div>
                      </div>
                      <div className="mt-3">
                        <label
                          htmlFor={`ga-quantity-${area.id}`}
                          className="sr-only"
                        >
                          Quantity for {area.name}
                        </label>
                        <Input
                          id={`ga-quantity-${area.id}`}
                          type="number"
                          min={0}
                          max={areaAvailability[area.id] ?? undefined}
                          value={gaQuantities[area.id] || 0}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            if (Number.isNaN(next)) return;
                            const maxAvail = areaAvailability[area.id] ?? next;
                            const clamped = Math.max(
                              0,
                              Math.min(next, maxAvail)
                            );
                            setGaQuantities((prev) => ({
                              ...prev,
                              [area.id]: clamped,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t("orderSummary")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {maxTicketsByOrder && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {t("selected")}: {totalSelectedGA} / {maxTicketsByOrder}{" "}
                    {t("tickets")}
                  </div>
                )}
                <div className="space-y-2">
                  {gaAreas
                    .filter((area: any) => (gaQuantities[area.id] || 0) > 0)
                    .map((area: any) => (
                      <div
                        key={area.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {area.name} x {gaQuantities[area.id]}
                        </span>
                        <span>
                          {formatCurrencyVND(
                            (gaQuantities[area.id] || 0) * area.price
                          )}
                        </span>
                      </div>
                    ))}
                  {totalSelectedGA === 0 && (
                    <p className="text-gray-500 text-center py-2">
                      No tickets selected
                    </p>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>
                    {t("totalAmount")} ({totalSelectedGA} tickets)
                  </span>
                  <span>
                    {formatCurrencyVND(
                      gaAreas.reduce(
                        (sum: number, area: any) =>
                          sum + (gaQuantities[area.id] || 0) * area.price,
                        0
                      )
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleProceedToPayment}
              disabled={proceedDisabled}
              className="w-full"
              size="lg"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("creatingOrder")}
                </>
              ) : (
                t("proceedToCheckout")
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Message when no showing selected or showing not on sale */}
      {showings.length > 0 && !resolvedShowingId && (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("selectShowing")}
            </h3>
            <p className="text-gray-600">
              {t("selectShowingFirst")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
