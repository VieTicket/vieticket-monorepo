"use client";

import { useTicketData } from "@/hooks/use-ticket-data";
import { use, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyVND } from "@/lib/utils";
import { createOrderAction } from "@/lib/actions/customer/checkout-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Users, CreditCard, ArrowLeft } from "lucide-react";
import { loadSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import dynamic from "next/dynamic";
import { StageProvider } from "@/components/seat-map/providers/stage-provider";

const SeatMapCanvas = dynamic(
  () => import("@/components/seat-map/seat-map-canvas-customer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading seat map...</span>
      </div>
    ),
  }
);

interface SeatMapSeatSelectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

export default function SeatMapSeatSelectionPage({
  params,
  searchParams,
}: SeatMapSeatSelectionPageProps) {
  const { slug } = use(params);
  const { eventId } = use(searchParams);
  const router = useRouter();
  const t = useTranslations("event.seatSelection");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [seatMapData, setSeatMapData] = useState<any>(null);
  const [loadingSeatMap, setLoadingSeatMap] = useState(true);

  const { data: ticketData, isLoading, error } = useTicketData(eventId!);

  // Load seat map data
  useEffect(() => {
    const loadSeatMap = async () => {
      if (!ticketData?.data?.eventData?.seatMapId) return;

      try {
        setLoadingSeatMap(true);
        const result = await loadSeatMapAction(
          ticketData.data.eventData.seatMapId
        );

        if (result.success && result.data) {
          setSeatMapData(result.data);
        } else {
          toast.error(t("failedToLoadSeatMap"));
        }
      } catch (error) {
        console.error("Error loading seat map:", error);
        toast.error(t("errorLoadingSeatMap"));
      } finally {
        setLoadingSeatMap(false);
      }
    };

    if (ticketData?.data?.eventData?.seatMapId) {
      loadSeatMap();
    }
  }, [ticketData?.data?.eventData?.seatMapId]);

  const handleSeatClick = (seatId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  };

  const getSeatStatus = (seatId: string) => {
    const seatStatus = ticketData?.data?.seatStatus;
    if (!seatStatus) return "available";

    if (seatStatus.paidSeatIds.includes(seatId)) return "sold";
    if (seatStatus.activeHoldSeatIds.includes(seatId)) return "held";
    return "available";
  };

  const calculateTotal = () => {
    if (!ticketData?.data?.seatingStructure) return 0;

    let total = 0;
    for (const area of ticketData.data.seatingStructure) {
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
    if (!ticketData?.data?.seatingStructure) return [];

    const details: Array<{
      seatId: string;
      areaName: string;
      rowName: string;
      seatNumber: string;
      price: number;
    }> = [];

    for (const area of ticketData.data.seatingStructure) {
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
      toast.error(t("pleaseSelectAtLeastOneSeat"));
      return;
    }

    setIsCreatingOrder(true);
    try {
      const result = await createOrderAction(eventId!, selectedSeats);

      if (result.success && result.data) {
        toast.success("Order created successfully! Redirecting to payment...");
        window.location.href = result.data.vnpayURL;
      } else {
        toast.error(result.error?.message || t("failedToCreateOrder"));
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(t("unexpectedError"));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading || loadingSeatMap) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t("loadingSeatMap")}</p>
        </div>
      </div>
    );
  }

  if (error) {
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

  if (!ticketData?.data || !seatMapData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">{t("noSeatMapData")}</p>
            <Button onClick={() => router.back()}>{t("goBack")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { eventData, seatingStructure } = ticketData.data;
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t("selectYourSeats")}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{eventData.name}</span>
                <span>•</span>
                <span>{eventData.location}</span>
              </div>
            </div>
          </div>

          {/* Quick summary */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {selectedSeats.length} {t("seats")}
                {selectedSeats.length === 1 ? t("seatSelected") : t("seatsSelected")}
              </div>
              <div className="font-semibold">
                {formatCurrencyVND(calculateTotal())}
              </div>
            </div>

            <Button
              onClick={handleProceedToPayment}
              disabled={selectedSeats.length === 0 || isCreatingOrder}
              size="sm"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("creating")}
                </>
              ) : (
                t("proceedToCheckout")
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Seat Map Canvas */}
        <div className="flex-1 relative">
          <StageProvider>
            <SeatMapCanvas
              seatMapData={seatMapData}
              seatingStructure={seatingStructure}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              getSeatStatus={getSeatStatus}
            />
          </StageProvider>
        </div>

        {/* Order Summary Sidebar */}
        <div className="w-80 bg-white border-l shadow-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t("legend")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{t("available")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">{t("selected")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">{t("onHold")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm">{t("sold")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t("orderSummary")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {selectedSeats.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {t("clickOnAvailableSeats")}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {getSelectedSeatDetails().map((seat) => (
                        <div
                          key={seat.seatId}
                          className="flex justify-between text-sm bg-gray-50 p-2 rounded"
                        >
                          <span className="font-medium">{seat.areaName}</span>
                          <span className="text-gray-600">
                            {seat.rowName}-{seat.seatNumber}
                          </span>
                          <span>{formatCurrencyVND(seat.price)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t("total")} ({selectedSeats.length} {t("seats")})</span>
                      <span className="text-green-600">
                        {formatCurrencyVND(calculateTotal())}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {selectedSeats.length > 0 && (
              <Button
                onClick={handleProceedToPayment}
                disabled={isCreatingOrder}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
