"use client";

import { useTicketData } from "@/hooks/use-ticket-data";
import { use, useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { loadSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import * as PIXI from "pixi.js";

import {
  pixiApp,
  setPixiApp,
  setStage,
  setShapeContainer,
  setShapes,
  initializeAreaModeContainer,
} from "@/components/seat-map/variables";
import { recreateShape } from "@/components/seat-map/utils/undo-redo";
import { useSeatMapStore } from "@/components/seat-map/store/seat-map-store";
import { updateStageHitArea } from "@/components/seat-map/utils/stageTransform";
import { CanvasItem, AreaModeContainer } from "@/components/seat-map/types";
import { enterAreaMode } from "@/components/seat-map/events/area-mode-events";
import {
  createCustomerEventManager,
  getCustomerEventManager,
} from "@/components/seat-map/events/event-manager-customer";

interface SeatMapSeatSelectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

const SeatLegend = () => {
  const t = useTranslations("event.seatSelection");

  return (
    <Card className="bg-slate-900/95 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg text-white">
          {t("legend")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 sm:border-4 border-blue-500 bg-white rounded-full relative flex-shrink-0">
            <div className="absolute -inset-1 border border-blue-300 rounded-full opacity-60"></div>
          </div>
          <span className="text-xs sm:text-sm text-gray-300">
            {t("selected")}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-3 h-3 sm:w-4 sm:h-4 border border-yellow-500 bg-white rounded-full flex-shrink-0"></div>
          <span className="text-xs sm:text-sm text-gray-300">
            {t("onHold")}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-3 h-3 sm:w-4 sm:h-4 border border-red-500 bg-white rounded-full relative flex-shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <X className="w-2 h-2 sm:w-3 sm:h-3 text-red-500" />
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-300">{t("sold")}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const SeatInfoHover = ({ seatId }: { seatId: string }) => {
  const hoveredSeat = useMemo(
    () => useSeatMapStore.getState().customerFindSeatInfoById(seatId),
    [seatId]
  );

  if (!hoveredSeat) return null;

  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-slate-900/95 border border-slate-700/50 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm shadow-lg z-10">
      <div className="font-medium">{hoveredSeat.areaName}</div>
      <div className="text-gray-300">
        Row {hoveredSeat.rowName} • Seat {hoveredSeat.seatNumber}
      </div>
      <div className="text-green-400 font-semibold">
        {formatCurrencyVND(hoveredSeat.price)}
      </div>
    </div>
  );
};

const SelectedSeatsDisplay = ({
  selectedSeatsGrouped,
  onToggleSeat,
  onClearAll,
}: {
  selectedSeatsGrouped: Record<string, any[]>;
  onToggleSeat: (seatId: string) => void;
  onClearAll: () => void;
}) => {
  const t = useTranslations("event.seatSelection");

  return (
    <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
      {Object.entries(selectedSeatsGrouped).map(([areaName, seats]) => (
        <div
          key={areaName}
          className="border border-slate-700/50 rounded-lg p-2 sm:p-3 bg-slate-800/30"
        >
          <div className="font-medium mb-2 text-sm sm:text-base text-white">
            <div>
              {areaName} ({seats.length} seats)
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {seats.map((seat) => (
              <button
                key={seat.seatId}
                onClick={() => onToggleSeat(seat.seatId)}
                className="flex justify-between items-center gap-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/50 p-1.5 sm:p-2 rounded text-xs sm:text-sm text-white transition-colors"
              >
                <span>
                  R{seat.rowName} • S{seat.seatNumber}
                </span>
                <X className="w-3 h-3 text-violet-400" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function SeatMapSeatSelectionPage({
  params,
  searchParams,
}: SeatMapSeatSelectionPageProps) {
  const { slug } = use(params);
  const { eventId } = use(searchParams);
  const router = useRouter();
  const t = useTranslations("event.seatSelection");
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const touchStartY = useRef<number>(0);
  const [appState, setAppState] = useState({
    isCreatingOrder: false,
    loadingSeatMap: true,
    pixiInitialized: false,
    seatMapLoaded: false,
  });

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
    customerGetSelectedSeatsGroupedByArea,
  } = useSeatMapStore();

  const { data: ticketData, isLoading, error } = useTicketData(eventId!);

  const eventData = useMemo(() => ticketData?.data?.eventData, [ticketData]);
  const selectedSeatsInfo = useMemo(
    () => customer.customerSelectedSeatsInfo,
    [customer.customerSelectedSeatsInfo]
  );
  const orderSummary = useMemo(() => customerGetOrderSummary(), [customer]);
  const selectedSeatsGrouped = useMemo(
    () => customerGetSelectedSeatsGroupedByArea(),
    [customer]
  );

  // ✅ Handle mobile bottom sheet swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY.current;

      // Swipe down to close (at least 50px)
      if (deltaY > 50 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
      // Swipe up to open (at least 50px)
      else if (deltaY < -50 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    },
    [isSidebarOpen]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartY.current = 0;
  }, []);

  useEffect(() => {
    if (ticketData?.data && eventId) {
      try {
        const { eventData, seatingStructure, seatStatus } = ticketData.data;

        customerInitializeEventData({
          eventId,
          eventName: eventData.name,
          eventLocation: eventData.location || "",
          customerMaxSeatsAllowed: eventData.maxTicketsByOrder || 1,
          seatingStructure,
          seatStatusData: {
            paidSeatIds: seatStatus?.paidSeatIds || [],
            activeHoldSeatIds: seatStatus?.activeHoldSeatIds || [],
          },
        });

        customerSetSelectionLimits(1, eventData.maxTicketsByOrder || 1);
      } catch (error) {
        console.error("Failed to initialize event data:", error);
        toast.error("Failed to load event data");
      }
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

  const throttledResize = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 16);
    };
  }, [handleResize]);

  useEffect(() => {
    if (appState.pixiInitialized || !pixiContainerRef.current) return;

    let cancelled = false;

    const initPixi = async () => {
      try {
        const container = pixiContainerRef.current;
        if (!container) return;

        const initialWidth = container.clientWidth || 800;
        const initialHeight = container.clientHeight || 600;

        const app = new PIXI.Application();
        await app.init({
          width: initialWidth,
          height: initialHeight,
          backgroundColor: 0xffffff,
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

        const canvas = app.canvas;
        const preventZoom = (e: WheelEvent) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
          }
        };

        canvas.addEventListener("wheel", preventZoom, { passive: false });
        (canvas as any).__preventZoomCleanup = () => {
          canvas.removeEventListener("wheel", preventZoom);
        };

        setAppState((prev) => ({ ...prev, pixiInitialized: true }));
      } catch (error) {
        console.error("Failed to initialize PIXI:", error);
        toast.error("Failed to initialize seat map");
      }
    };

    const timer = setTimeout(initPixi, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerGetSeatStatus]);

  useEffect(() => {
    window.addEventListener("resize", throttledResize);

    let resizeObserver: ResizeObserver | null = null;
    if (pixiContainerRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(throttledResize);
      resizeObserver.observe(pixiContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", throttledResize);
      resizeObserver?.disconnect();
    };
  }, [throttledResize]);

  useEffect(() => {
    if (
      !eventData?.seatMapId ||
      !appState.pixiInitialized ||
      appState.seatMapLoaded
    ) {
      return;
    }

    let cancelled = false;

    const loadSeatMap = async () => {
      try {
        setAppState((prev) => ({ ...prev, loadingSeatMap: true }));

        const result = await loadSeatMapAction(eventData.seatMapId!);

        if (cancelled) return;

        if (result.success && result.data) {
          await restoreSeatMap(result.data);
          setAppState((prev) => ({
            ...prev,
            seatMapLoaded: true,
            loadingSeatMap: false,
          }));
        } else {
          throw new Error(result.error || "Failed to load seat map");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading seat map:", error);
          toast.error(t("errorLoadingSeatMap"));
          setAppState((prev) => ({ ...prev, loadingSeatMap: false }));
        }
      }
    };

    loadSeatMap();

    return () => {
      cancelled = true;
    };
  }, [
    eventData?.seatMapId,
    appState.pixiInitialized,
    appState.seatMapLoaded,
    t,
  ]);

  const restoreSeatMap = useCallback(
    async (seatMapData: any) => {
      if (!seatMapData.shapes || !Array.isArray(seatMapData.shapes)) {
        console.warn("No shapes found in seat map data");
        return;
      }

      try {
        setShapes([]);
        const recreatedShapes: CanvasItem[] = [];

        const batchSize = 10;
        for (let i = 0; i < seatMapData.shapes.length; i += batchSize) {
          const batch = seatMapData.shapes.slice(i, i + batchSize);

          const batchPromises = batch.map(async (shapeData: any) => {
            try {
              return await recreateShape(shapeData, false, false);
            } catch (error) {
              console.error("Failed to recreate shape:", shapeData.id, error);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);

          batchResults.forEach((recreatedShape) => {
            if (!recreatedShape) return;

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
              const eventManager = getCustomerEventManager();
              if (eventManager) {
                const seats: any[] = [];
                areaModeContainer.children.forEach((grid) => {
                  grid.children.forEach((row) => {
                    row.children.forEach((seat) => {
                      seats.push(seat);
                    });
                  });
                });

                const seatBatchSize = 50;
                for (let j = 0; j < seats.length; j += seatBatchSize) {
                  const seatBatch = seats.slice(j, j + seatBatchSize);

                  new Promise((resolve) => {
                    requestAnimationFrame(() => {
                      seatBatch.forEach((seat) => {
                        eventManager.addShapeEvents(seat);
                        eventManager.customerUpdateSeatVisuals(seat);
                      });
                      resolve(void 0);
                    });
                  });
                }
              }
            }

            recreatedShapes.push(recreatedShape);
          });

          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        setShapes(recreatedShapes);
        updateShapes(recreatedShapes, false, undefined, false);
        enterAreaMode();
      } catch (error) {
        console.error("Failed to restore seat map:", error);
        throw error;
      }
    },
    [updateShapes]
  );

  const customerHandleSeatClick = useCallback(
    (seatId: string, isAvailable: boolean) => {
      const isCurrentlySelected =
        customer.customerSelectedSeatIds.includes(seatId);

      if (isCurrentlySelected) {
        customerToggleSeatSelection(seatId);

        const eventManager = getCustomerEventManager();
        if (eventManager) {
          requestAnimationFrame(() => {
            eventManager.updateSeatStatus(seatId);
          });
        }
        return;
      }

      if (!isAvailable) {
        toast.warning("This seat is not available for selection.");
        return;
      }

      customerToggleSeatSelection(seatId);

      if (!customerCanSelectMoreSeats()) {
        customerToggleSeatSelection(seatId);
        toast.warning(
          "The number of selected seats has reached the maximum allowed."
        );
        return;
      }

      const eventManager = getCustomerEventManager();
      if (eventManager) {
        requestAnimationFrame(() => {
          eventManager.updateSeatStatus(seatId);
        });
      }
    },
    [
      customer.customerSelectedSeatIds,
      customerCanSelectMoreSeats,
      customerToggleSeatSelection,
    ]
  );

  const customerHandleClearAllSelections = useCallback(() => {
    customerClearAllSelections();

    const eventManager = getCustomerEventManager();
    if (eventManager) {
      requestAnimationFrame(() => {
        eventManager.updateAllSeatVisuals();
      });
    }

    toast.info("All selections cleared");
  }, [customerClearAllSelections]);

  const customerHandleProceedToPayment = useCallback(async () => {
    const validation = customerValidateSelection();
    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    setAppState((prev) => ({ ...prev, isCreatingOrder: true }));

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
      setAppState((prev) => ({ ...prev, isCreatingOrder: false }));
    }
  }, [customerValidateSelection, eventId, customer.customerSelectedSeatIds, t]);

  const isMainLoading = useMemo(
    () => isLoading || appState.loadingSeatMap || !appState.pixiInitialized,
    [isLoading, appState.loadingSeatMap, appState.pixiInitialized]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-900/95">
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Seat Map Canvas */}
        <div
          className="flex-1 relative bg-slate-900/95"
          style={{ minHeight: "100vh" }}
        >
          <div
            ref={pixiContainerRef}
            className="w-full h-full absolute inset-0"
            style={{ touchAction: "none" }}
          />

          {/* Hover Info - Optimized for Mobile */}
          {customer.customerHoveredSeatId && (
            <SeatInfoHover seatId={customer.customerHoveredSeatId} />
          )}

          {/* Mobile Legend - Floating */}
          <div className="md:hidden absolute bottom-24 right-4 z-10">
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-lg p-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 bg-white rounded-full"></div>
                  <span className="text-gray-300">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-yellow-500 bg-white rounded-full"></div>
                  <span className="text-gray-300">On Hold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-red-500 bg-white rounded-full relative">
                    <X className="w-2 h-2 text-red-500 absolute inset-0 m-auto" />
                  </div>
                  <span className="text-gray-300">Sold</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar - Desktop */}
        <div className="hidden md:block w-80 bg-slate-900/95 border-l border-slate-700/50 shadow-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            <SeatLegend />

            {/* Selected Seats */}
            <Card className="bg-slate-900/95 border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-white">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {t("Tickets")}
                  </div>
                  {selectedSeatsInfo.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={customerHandleClearAllSelections}
                      className="text-xs text-gray-400 hover:text-red-400 hover:bg-violet-500/20"
                    >
                      {t("clearAll")}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>{t("selectedSeats")}</span>
                    <span className="font-medium text-white">
                      {selectedSeatsInfo.length} /{" "}
                      {customer.customerMaxSeatsAllowed}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(selectedSeatsInfo.length / customer.customerMaxSeatsAllowed) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {orderSummary.totalSeats === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">
                    {t("clickOnAvailableSeats")}
                  </p>
                ) : (
                  <>
                    <SelectedSeatsDisplay
                      selectedSeatsGrouped={selectedSeatsGrouped}
                      onToggleSeat={customerToggleSeatSelection}
                      onClearAll={customerHandleClearAllSelections}
                    />

                    <Separator className="bg-slate-700/50" />

                    <div className="flex justify-between font-semibold text-lg text-white">
                      <span>{t("total")}</span>
                      <span className="text-green-400">
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
                disabled={appState.isCreatingOrder}
                className="w-full bg-yellow-300 hover:bg-yellow-400 text-gray-900 font-semibold"
                size="lg"
              >
                {appState.isCreatingOrder ? (
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

        {/* Mobile Bottom Sheet with Swipe Gestures */}
        <div
          className={`md:hidden fixed inset-x-0 bottom-0 z-30 bg-slate-900/95 border-t border-slate-700/50 shadow-2xl rounded-t-2xl transition-transform duration-300 ${
            isSidebarOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]"
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Drag Handle */}
            <div
              className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto cursor-pointer"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Quick Summary Bar */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <div className="flex items-center gap-3">
                <div className="text-white">
                  <div className="text-sm font-medium">
                    {selectedSeatsInfo.length} Seat
                    {selectedSeatsInfo.length !== 1 ? "s" : ""} Selected
                  </div>
                  <div className="text-xs text-gray-400">
                    {selectedSeatsInfo.length} /{" "}
                    {customer.customerMaxSeatsAllowed} max
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-400">
                    {formatCurrencyVND(orderSummary.total)}
                  </div>
                </div>
                {isSidebarOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isSidebarOpen && (
              <>
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(selectedSeatsInfo.length / customer.customerMaxSeatsAllowed) * 100}%`,
                    }}
                  />
                </div>

                {orderSummary.totalSeats === 0 ? (
                  <p className="text-gray-400 text-center py-6 text-sm">
                    {t("clickOnAvailableSeats")}
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base text-white">
                        Selected Seats
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={customerHandleClearAllSelections}
                        className="text-xs text-red-400 hover:bg-violet-500/20 hover:text-red-300"
                      >
                        Clear All
                      </Button>
                    </div>

                    <SelectedSeatsDisplay
                      selectedSeatsGrouped={selectedSeatsGrouped}
                      onToggleSeat={customerToggleSeatSelection}
                      onClearAll={customerHandleClearAllSelections}
                    />

                    <Separator className="bg-slate-700/50" />

                    <div className="flex justify-between items-center font-semibold text-lg text-white">
                      <span>{t("total")}</span>
                      <span className="text-green-400 text-xl">
                        {formatCurrencyVND(orderSummary.total)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Checkout Button */}
            {selectedSeatsInfo.length > 0 && (
              <Button
                onClick={customerHandleProceedToPayment}
                disabled={appState.isCreatingOrder}
                className="w-full bg-yellow-300 hover:bg-yellow-400 text-gray-900 font-semibold"
                size="lg"
              >
                {appState.isCreatingOrder ? (
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
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center px-4">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mx-auto mb-4 text-violet-500" />
              <p className="text-white font-medium text-sm sm:text-base">
                {isLoading && "Loading event data..."}
                {!isLoading && appState.loadingSeatMap && "Loading seat map..."}
                {!isLoading &&
                  !appState.loadingSeatMap &&
                  !appState.pixiInitialized &&
                  "Initializing seat map..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
