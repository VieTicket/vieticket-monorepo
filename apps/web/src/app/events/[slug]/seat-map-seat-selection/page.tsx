"use client";

import { useTicketData } from "@/hooks/use-ticket-data";
import { use, useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyVND } from "@/lib/utils";
import { createOrderAction } from "@/lib/actions/customer/checkout-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  CreditCard,
  ArrowLeft,
  X,
  ArrowRight,
} from "lucide-react";
import { loadSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import * as PIXI from "pixi.js";

import {
  pixiApp,
  setPixiApp,
  setStage,
  setShapeContainer,
  resetVariables,
  setShapes,
  initializeAreaModeContainer,
} from "@/components/seat-map/variables";
import { destroySelectionTransform } from "@/components/seat-map/events/transform-events";
import { recreateShape } from "@/components/seat-map/utils/undo-redo";
import { useSeatMapStore } from "@/components/seat-map/store/seat-map-store";
import { updateStageHitArea } from "@/components/seat-map/utils/stageTransform";
import { destroyGuideLines } from "@/components/seat-map/guide-lines";
import { CanvasItem, AreaModeContainer } from "@/components/seat-map/types";
import { enterAreaMode } from "@/components/seat-map/events/area-mode-events";
import {
  createCustomerEventManager,
  destroyCustomerEventManager,
  getCustomerEventManager,
} from "@/components/seat-map/events/event-manager-customer";

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
  const pixiContainerRef = useRef<HTMLDivElement>(null);

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [seatMapData, setSeatMapData] = useState<any>(null);
  const [loadingSeatMap, setLoadingSeatMap] = useState(true);
  const [pixiInitialized, setPixiInitialized] = useState(false);

  const {
    customer,
    customerInitializeEventData,
    customerToggleSeatSelection,
    customerGetSeatStatus,
    customerGetOrderSummary,
    customerSetSelectionLimits,
    customerCanSelectMoreSeats,
    customerValidateSelection,
    customerClearAllSelections,
    updateShapes,
  } = useSeatMapStore();

  const { data: ticketData, isLoading, error } = useTicketData(eventId!);

  useEffect(() => {
    if (ticketData?.data && eventId) {
      const { eventData, seatingStructure, seatStatus } = ticketData.data;

      customerInitializeEventData({
        eventId,
        eventName: eventData.name,
        eventLocation: eventData.location || "",
        seatingStructure,
        seatStatusData: {
          paidSeatIds: seatStatus?.paidSeatIds || [],
          activeHoldSeatIds: seatStatus?.activeHoldSeatIds || [],
        },
      });

      customerSetSelectionLimits(1, 8);
    }
  }, [
    ticketData,
    eventId,
    customerInitializeEventData,
    customerSetSelectionLimits,
  ]);

  const handleResize = useCallback(() => {
    if (pixiApp && pixiContainerRef.current) {
      const container = pixiContainerRef.current;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      pixiApp.renderer.resize(newWidth, newHeight);
      updateStageHitArea();
    }
  }, []);

  // Initialize PIXI application
  useEffect(() => {
    let cancelled = false;

    const initPixi = async () => {
      if (!pixiContainerRef.current) {
        return;
      }

      if (pixiApp || pixiInitialized) {
        return;
      }

      const container = pixiContainerRef.current;
      const initialWidth = container.clientWidth || 800;
      const initialHeight = container.clientHeight || 600;

      const app = new PIXI.Application();
      await app.init({
        width: initialWidth,
        height: initialHeight,
        backgroundColor: 0xf8f9fa,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (cancelled) return;

      container.appendChild(app.canvas as HTMLCanvasElement);
      setPixiApp(app);

      const stageContainer = new PIXI.Container();
      app.stage.addChild(stageContainer);
      setStage(stageContainer);

      const shapesContainer = new PIXI.Container();
      stageContainer.addChild(shapesContainer);
      setShapeContainer(shapesContainer);

      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      createCustomerEventManager(
        customerHandleSeatClick,
        customerGetSeatStatus
      );

      initializeAreaModeContainer();
      setPixiInitialized(true);

      const canvas = app.canvas;
      const preventZoom = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      canvas.addEventListener("wheel", preventZoom, { passive: false });
      (canvas as any).__preventZoomCleanup = () => {
        canvas.removeEventListener("wheel", preventZoom);
      };
    };

    const timer = setTimeout(initPixi, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerGetSeatStatus]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (pixiContainerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(pixiContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [handleResize]);

  useEffect(() => {
    const loadSeatMap = async () => {
      if (!ticketData?.data?.eventData?.seatMapId || !pixiInitialized) {
        return;
      }

      try {
        setLoadingSeatMap(true);

        const result = await loadSeatMapAction(
          ticketData.data.eventData.seatMapId
        );
        if (result.success && result.data) {
          setSeatMapData(result.data);
          await restoreSeatMap(result.data);
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

    loadSeatMap();
  }, [ticketData?.data?.eventData?.seatMapId, pixiInitialized]);

  const restoreSeatMap = async (seatMapData: any) => {
    if (!seatMapData.shapes || !Array.isArray(seatMapData.shapes)) {
      console.warn("No shapes found in seat map data");
      return;
    }

    try {
      setShapes([]);
      const recreatedShapes: CanvasItem[] = [];

      for (const shapeData of seatMapData.shapes) {
        try {
          const recreatedShape = await recreateShape(shapeData, false, false);

          if (pixiApp?.stage && recreatedShape.graphics) {
            const shapeContainer = pixiApp.stage.children
              .find((child) => child instanceof PIXI.Container)
              ?.children.find(
                (child) => child instanceof PIXI.Container
              ) as PIXI.Container;

            if (shapeContainer) {
              shapeContainer.addChild(recreatedShape.graphics);
            }
          }

          if (recreatedShape.id === "area-mode-container-id") {
            const areaModeContainer = recreatedShape as AreaModeContainer;
            areaModeContainer.children.forEach((grid) => {
              grid.children.forEach((row) => {
                row.children.forEach((seat) => {
                  getCustomerEventManager()?.addShapeEvents(seat);
                });
              });
            });
          }

          recreatedShapes.push(recreatedShape);
        } catch (error) {
          console.error("Failed to recreate shape:", shapeData.id, error);
        }
      }

      updateShapes(recreatedShapes, false, undefined, false);
      enterAreaMode();
    } catch (error) {
      console.error("Failed to restore seat map:", error);
    }
  };

  const customerHandleSeatClick = (seatId: string, isAvailable: boolean) => {
    if (!isAvailable) {
      return;
    }

    const isCurrentlySelected =
      customer.customerSelectedSeatIds.includes(seatId);
    if (!isCurrentlySelected && !customerCanSelectMoreSeats()) {
      toast.warning(
        `The number of selected seats has reached the maximum allowed.`
      );
      return;
    }

    const wasSelected = customerToggleSeatSelection(seatId);

    const eventManager = getCustomerEventManager();
    if (eventManager) {
      eventManager.updateSeatStatus(seatId);
    }

    if (wasSelected) {
      const seatInfo = customer.customerSelectedSeatsInfo.find(
        (s) => s.seatId === seatId
      );
    }
  };

  const customerHandleClearAllSelections = () => {
    customerClearAllSelections();

    const eventManager = getCustomerEventManager();
    if (eventManager) {
      eventManager.updateAllSeatVisuals();
    }

    toast.info("All selections cleared");
  };

  const customerHandleProceedToPayment = async () => {
    const validation = customerValidateSelection();
    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    setIsCreatingOrder(true);
    try {
      const result = await createOrderAction(
        eventId!,
        customer.customerSelectedSeatIds
      );

      if (result.success && result.data) {
        toast.success("Order created successfully! Redirecting to payment...");
        window.location.href = result.data.vnpayURL;
      } else {
        toast.error(result.error?.message || t("failedToCreateOrder"));
      }
    } catch (error) {
      toast.error(t("unexpectedError"));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const isMainLoading = isLoading || loadingSeatMap || !pixiInitialized;
  const eventData = ticketData?.data?.eventData;

  const selectedSeatsInfo = customer.customerSelectedSeatsInfo;
  const orderSummary = customerGetOrderSummary();
  const selectedSeatsGrouped = useSeatMapStore(
    (state) => state.customerGetSelectedSeatsGroupedByArea
  )();

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
                <span>{eventData?.name || "Loading..."}</span>
                <span>•</span>
                <span>{eventData?.location || "Loading..."}</span>
              </div>
            </div>
          </div>

          {/* Quick summary */}
          <div className="flex items-center gap-4">
            <Button
              className="bg-yellow-300 hover:bg-yellow-400 text-gray-900 font-semibold"
              onClick={customerHandleProceedToPayment}
              disabled={selectedSeatsInfo.length === 0 || isCreatingOrder}
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Seat Map Canvas */}
        <div className="flex-1 relative">
          <div
            ref={pixiContainerRef}
            className="w-full h-full absolute inset-0"
            style={{
              touchAction: "none",
            }}
          />

          {/* ✅ Customer selection info overlay */}
          {customer.customerHoveredSeatId && (
            <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
              {(() => {
                const hoveredSeat = useSeatMapStore
                  .getState()
                  .customerFindSeatInfoById(customer.customerHoveredSeatId!);
                return hoveredSeat ? (
                  <div>
                    <div className="font-medium">{hoveredSeat.areaName}</div>
                    <div>
                      Row {hoveredSeat.rowName} • Seat {hoveredSeat.seatNumber}
                    </div>
                    <div className="text-green-400">
                      {formatCurrencyVND(hoveredSeat.price)}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="w-80 bg-white border-l shadow-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("legend")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-4 border-blue-500 bg-white rounded-full relative">
                    <div className="absolute -inset-1 border border-blue-300 rounded-full opacity-60"></div>
                  </div>
                  <span className="text-sm">{t("selected")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-yellow-500 bg-white rounded-full"></div>
                  <span className="text-sm">{t("onHold")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-red-500 bg-white rounded-full relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <X className="w-3 h-3 text-red-500" />
                    </div>
                  </div>
                  <span className="text-sm">{t("sold")}</span>
                </div>
              </CardContent>
            </Card>

            {/* ✅ Selected Seats by Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t("Tickets")}
                  {selectedSeatsInfo.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={customerHandleClearAllSelections}
                      className="text-xs text-gray-500 hover:text-red-500"
                    >
                      {t("clearAll")}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("selectedSeats")}</span>
                    <span className="font-medium">
                      {selectedSeatsInfo.length} /{" "}
                      {customer.customerMaxSeatsAllowed}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(selectedSeatsInfo.length / customer.customerMaxSeatsAllowed) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                {orderSummary.totalSeats === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {t("clickOnAvailableSeats")}
                  </p>
                ) : (
                  <>
                    {/* ✅ Group by area */}
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {Object.entries(selectedSeatsGrouped).map(
                        ([areaName, seats]) => (
                          <div
                            key={areaName}
                            className="border border-gray-200 rounded-lg p-3"
                          >
                            <div className="font-medium mb-2">
                              <div>
                                {areaName} ({seats.length} seats)
                              </div>
                              <span></span>
                            </div>
                            <div className="space-y-2">
                              {seats.map((seat) => (
                                <div
                                  key={seat.seatId}
                                  className="flex justify-between items-center bg-blue-50/50 p-2 rounded"
                                >
                                  <span className="text-sm">
                                    Row {seat.rowName} • Seat {seat.seatNumber}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        customerToggleSeatSelection(seat.seatId)
                                      }
                                      className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t("total")}</span>
                      <span className="text-green-600">
                        {formatCurrencyVND(orderSummary.total)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {orderSummary.totalSeats > 0 && (
              <Button
                onClick={customerHandleProceedToPayment}
                disabled={isCreatingOrder}
                className="w-full bg-yellow-300 hover:bg-yellow-400 text-gray-900 font-semibold"
                size="lg"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t("creatingOrder")}
                  </>
                ) : (
                  <>
                    {t("proceedToCheckout")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {isMainLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-700 font-medium">
                {isLoading && "Loading event data..."}
                {!isLoading && loadingSeatMap && "Loading seat map..."}
                {!isLoading &&
                  !loadingSeatMap &&
                  !pixiInitialized &&
                  "Initializing seat map..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
