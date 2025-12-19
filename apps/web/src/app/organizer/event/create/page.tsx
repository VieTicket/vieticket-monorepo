"use client";

import {
  useState,
  useEffect,
  useTransition,
  Suspense,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  handleCreateEvent,
  handleUpdateEvent,
  fetchEventById,
} from "../../../../lib/actions/organizer/events-action";
import { StepProgressBar } from "@/components/create-event/progress-bar";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getSeatMapGridDataAction } from "@/lib/actions/organizer/seat-map-actions";
import { EventDetailsStep } from "./components/event-details-step";
import { MediaUploadStep } from "./components/media-upload-step";
import { PreviewStep } from "./components/preview-step";
import { TicketingStep } from "./components/ticketing-step";
import type {
  EventFormData,
  SeatMapData,
  TicketingMode,
} from "../../../../types/event-types";
import { useTranslations } from "next-intl";
import { ShowingWithAreas } from "@/types/showings";
import { useAutoSave, useDraftRecovery } from "@/hooks/useAutoSave";
import { useEventValidation } from "./components/use-event-validations";
import { DraftRecoveryDialog } from "@/components/create-event/draft-recovery-dialog";
import {
  clearExpiredDrafts,
  type EventDraftData,
} from "@/lib/utils/draft-storage";
import { AutoSaveIndicator } from "@/components/ui/auto-save-indicator";

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full sm:w-11/12 md:w-5/6 lg:w-3/4 xl:max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-20 py-6 sm:py-8 lg:py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-2 bg-gray-200 rounded w-full mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <CreateEventPageInner />
    </Suspense>
  );
}

function CreateEventPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const t = useTranslations("organizer-dashboard.CreateEvent");
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    type: "",
    ticketSaleStart: "",
    ticketSaleEnd: "",
    location: "",
    description: "",
    posterUrl: "",
    bannerUrl: "",
    seatCount: "",
    ticketPrice: "",
    maxTicketsByOrder: undefined,
    startTime: "",
    endTime: "",
  });

  const [showings, setShowings] = useState<ShowingWithAreas[]>([
    {
      name: t("mainShowing"),
      startTime: "",
      endTime: "",
      areas: [],
      seatMapId: "",
    },
  ]);

  const [ticketingMode, setTicketingMode] = useState<TicketingMode>("simple");
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [originalSeatMapId, setOriginalSeatMapId] = useState<string>("");
  const [step, setStep] = useState(1);

  const {
    errors,
    validateStep1,
    validateForSubmission,
    clearFieldError,
    updateShowingErrors,
  } = useEventValidation();

  const {
    hasSavedDraft,
    loadDraft,
    clearSavedDraft,
    forceSave,
    saveStatus,
    lastSaved,
  } = useAutoSave({
    formData,
    areas: [],
    showings,
    ticketingMode,
    selectedSeatMap: seatMapData?.id || "",
    selectedSeatMapData: seatMapData,
    seatMapPreviewData: null,
    step,
    posterPreview: formData.posterUrl,
    bannerPreview: formData.bannerUrl,
    eventId,
    autoSaveEnabled: !eventId,
  });

  const restoreDraftData = useCallback((draftData: EventDraftData) => {
    setFormData(draftData.formData);
    setShowings(draftData.showings);
    setTicketingMode(draftData.ticketingMode);
    setStep(draftData.step);

    if (draftData.selectedSeatMapData) {
      setSeatMapData(draftData.selectedSeatMapData);
    }
  }, []);

  const { showDraftRecovery, draftData, acceptDraft, rejectDraft } =
    useDraftRecovery({
      onRestore: (draftData) => {
        restoreDraftData(draftData);
        toast.success("Đã khôi phục bản nháp thành công!", {
          description: "Tất cả dữ liệu đã nhập trước đó đã được phục hồi.",
        });
      },
      eventId,
      t,
    });

  useEffect(() => {
    clearExpiredDrafts();
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const loadEvent = async () => {
      try {
        const result = await fetchEventById(eventId);
        if (!result.success || !result.data) {
          toast.error("Event not found");
          return;
        }

        const event = result.data;

        setFormData({
          name: event.name ?? "",
          type: event.type ?? "",
          ticketSaleStart: event.ticketSaleStart
            ? new Date(event.ticketSaleStart).toISOString().slice(0, 16)
            : "",
          ticketSaleEnd: event.ticketSaleEnd
            ? new Date(event.ticketSaleEnd).toISOString().slice(0, 16)
            : "",
          location: event.location ?? "",
          description: event.description ?? "",
          posterUrl: event.posterUrl ?? "",
          bannerUrl: event.bannerUrl ?? "",
          maxTicketsByOrder: event.maxTicketsByOrder ?? undefined,
          seatCount: "",
          ticketPrice: "",
          startTime: "",
          endTime: "",
        });

        if (event.seatMapId) {
          const gridDataResult = await getSeatMapGridDataAction(
            event.seatMapId
          );

          if (gridDataResult.success && gridDataResult.data) {
            const enrichedSeatMap: SeatMapData = {
              id: gridDataResult.data.seatMap.id,
              name: gridDataResult.data.seatMap.name,
              image: gridDataResult.data.seatMap.image,
              createdBy: gridDataResult.data.seatMap.createdBy,
              publicity: gridDataResult.data.seatMap.publicity,
              createdAt: gridDataResult.data.seatMap.createdAt,
              updatedAt: gridDataResult.data.seatMap.updatedAt,
              grids: gridDataResult.data.gridData?.grids || [],
              defaultSeatSettings:
                gridDataResult.data.gridData?.defaultSeatSettings || undefined,
            };

            setSeatMapData(enrichedSeatMap);
            setOriginalSeatMapId(event.seatMapId);
            setTicketingMode("seatmap");
          }
        } else {
          setTicketingMode("simple");
        }

        if (event.showings?.length > 0) {
          const processedShowings = event.showings.map((showing: any) => {
            const startTime = showing.startTime
              ? new Date(showing.startTime)
              : new Date();
            const endTime = showing.endTime
              ? new Date(showing.endTime)
              : new Date();

            const isValidStartTime =
              startTime instanceof Date && !isNaN(startTime.getTime());
            const isValidEndTime =
              endTime instanceof Date && !isNaN(endTime.getTime());

            let ticketSaleStartValue = "";
            let ticketSaleEndValue = "";

            if (showing.ticketSaleStart) {
              ticketSaleStartValue = new Date(showing.ticketSaleStart)
                .toISOString()
                .slice(0, 16);
            } else if (isValidStartTime) {
              const defaultStart = new Date(startTime);
              defaultStart.setDate(defaultStart.getDate() - 7);
              ticketSaleStartValue = defaultStart.toISOString().slice(0, 16);
            }

            if (showing.ticketSaleEnd) {
              ticketSaleEndValue = new Date(showing.ticketSaleEnd)
                .toISOString()
                .slice(0, 16);
            } else if (isValidStartTime) {
              const defaultEnd = new Date(startTime);
              defaultEnd.setHours(defaultEnd.getHours() - 1);
              ticketSaleEndValue = defaultEnd.toISOString().slice(0, 16);
            }

            const processedAreas =
              showing.areas?.map((area: any) => {
                let calculatedSeatCount = 0;
                if (area.rows) {
                  area.rows.forEach((row: any) => {
                    if (row.seats) {
                      calculatedSeatCount += row.seats.length;
                    }
                  });
                }

                return {
                  name: area.name,
                  ticketPrice: area.price.toString(),
                  seatCount:
                    calculatedSeatCount > 0
                      ? calculatedSeatCount.toString()
                      : "0",
                };
              }) || [];

            return {
              name: showing.name,
              startTime: isValidStartTime
                ? startTime.toISOString().slice(0, 16)
                : "",
              endTime: isValidEndTime ? endTime.toISOString().slice(0, 16) : "",
              ticketSaleStart: ticketSaleStartValue,
              ticketSaleEnd: ticketSaleEndValue,
              areas: processedAreas,
              seatMapId: showing.seatMapId || "",
            };
          });

          setShowings(processedShowings);
        }
      } catch (error) {
        console.error("Error loading event:", error);
        toast.error(t("toasts.failedLoadEvent"));
      }
    };

    loadEvent();
  }, [eventId, t]);

  const hasSeatMapChanges =
    eventId &&
    ((seatMapData?.id && seatMapData.id !== originalSeatMapId) ||
      (originalSeatMapId && ticketingMode === "simple") ||
      (!originalSeatMapId && ticketingMode === "seatmap"));

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "maxTicketsByOrder") {
      const numValue = value === "" ? undefined : parseInt(value) || undefined;
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "maxTicketsByOrder" && errors[name]) {
      clearFieldError(name);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1(formData, showings)) {
        toast.error(t("pleaseFixErrors"));
        scrollToTop();
        return;
      }
    }
    setStep(step + 1);
    scrollToTop();
  };

  const handleShowingsChange = (newShowings: ShowingWithAreas[]) => {
    setShowings(newShowings);

    if (newShowings.length > 0) {
      const validShowings = newShowings.filter((s) => s.startTime);

      if (validShowings.length > 0) {
        const sortedShowings = validShowings.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        const earliestShowing = sortedShowings[0];

        const ticketSaleStart = new Date(earliestShowing.startTime);
        ticketSaleStart.setDate(ticketSaleStart.getDate() - 7);

        const ticketSaleEnd = new Date(earliestShowing.startTime);
        ticketSaleEnd.setHours(ticketSaleEnd.getHours() - 1);

        setFormData((prev) => ({
          ...prev,
          ticketSaleStart: ticketSaleStart.toISOString().slice(0, 16),
          ticketSaleEnd: ticketSaleEnd.toISOString().slice(0, 16),
        }));
      }
    }

    updateShowingErrors(newShowings);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateForSubmission(formData, showings);
    if (!validation.valid) {
      toast.error(t("pleaseFixErrors"));
      return;
    }

    const form = new FormData(e.currentTarget);

    if (eventId) {
      form.set("eventId", eventId);
    }

    form.set("name", formData.name);
    form.set("type", formData.type);
    form.set("ticketSaleStart", formData.ticketSaleStart);
    form.set("ticketSaleEnd", formData.ticketSaleEnd);
    form.set("location", formData.location);
    form.set("description", formData.description);
    form.set("posterUrl", formData.posterUrl);
    form.set("bannerUrl", formData.bannerUrl);
    form.set("ticketingMode", ticketingMode);
    form.set("maxTicketsByOrder", formData.maxTicketsByOrder?.toString() || "");

    showings.forEach((showing, index) => {
      form.set(`showings[${index}].name`, showing.name);

      if (showing.startTime) {
        const startTimeUTC = new Date(showing.startTime).toISOString();
        form.set(`showings[${index}].startTime`, startTimeUTC);
      }

      if (showing.endTime) {
        const endTimeUTC = new Date(showing.endTime).toISOString();
        form.set(`showings[${index}].endTime`, endTimeUTC);
      }

      if (showing.ticketSaleStart) {
        const ticketSaleStartUTC = new Date(
          showing.ticketSaleStart
        ).toISOString();
        form.set(`showings[${index}].ticketSaleStart`, ticketSaleStartUTC);
      }

      if (showing.ticketSaleEnd) {
        const ticketSaleEndUTC = new Date(showing.ticketSaleEnd).toISOString();
        form.set(`showings[${index}].ticketSaleEnd`, ticketSaleEndUTC);
      }
    });

    if (ticketingMode === "seatmap" && seatMapData) {
      form.set("seatMapId", seatMapData.id);
      form.set(
        "seatMapData",
        JSON.stringify({
          grids: seatMapData.grids || [],
          defaultSeatSettings: seatMapData.defaultSeatSettings,
        })
      );
    }

    startTransition(async () => {
      try {
        if (eventId) {
          const result = await handleUpdateEvent(form);
          if (result.success) {
            toast.success(t("toasts.eventUpdated"));
          } else {
            toast.error(result.error || "Failed to update event");
            return;
          }
        } else {
          await handleCreateEvent(form);
          toast.success(
            ticketingMode === "seatmap" && seatMapData
              ? t("toasts.eventAndSeatMapCreated")
              : t("toasts.eventCreated")
          );
        }

        if (!eventId) {
          clearSavedDraft();
        }

        router.push("/organizer");
      } catch (err) {
        toast.error(t("toasts.createEventFailed"));
        console.error(err);
      }
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <EventDetailsStep
            formData={formData}
            errors={errors}
            showings={showings}
            onInputChange={handleChange}
            onDescriptionChange={(value) => {
              setFormData({ ...formData, description: value });

              if (errors.description) {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = value;
                const textContent =
                  tempDiv.textContent || tempDiv.innerText || "";

                if (value.trim() && textContent.length <= 5000) {
                  clearFieldError("description");
                }
              }
            }}
            onShowingsChange={handleShowingsChange}
          />
        );
      case 2:
        return (
          <MediaUploadStep formData={formData} onFormDataChange={setFormData} />
        );
      case 3:
        return <PreviewStep formData={formData} showings={showings} />;
      case 4:
        return (
          <TicketingStep
            ticketingMode={ticketingMode}
            setTicketingMode={setTicketingMode}
            seatMapData={seatMapData}
            setSeatMapData={setSeatMapData}
            showings={showings}
            hasSeatMapChanges={hasSeatMapChanges}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full sm:w-11/12 md:w-5/6 lg:w-3/4 xl:max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-20 py-6 sm:py-8 lg:py-12">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">
          {eventId ? t("editEvent") : t("createEvent")}
        </h1>

        {!eventId && (
          <AutoSaveIndicator
            status={saveStatus}
            lastSaved={lastSaved || undefined}
            className="hidden sm:flex"
          />
        )}
      </div>

      <StepProgressBar step={step} />
      <Separator className="mb-4 sm:mb-6" />

      <form
        onSubmit={onSubmit}
        id="event-form"
        className="space-y-4 sm:space-y-6"
      >
        {renderStep()}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex justify-end mt-8 space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(step - 1);
                  scrollToTop();
                }}
              >
                {t("goback")}
              </Button>

              <Button
                type="submit"
                className="bg-blue-600 text-white"
                disabled={isPending}
              >
                {isPending
                  ? eventId
                    ? t("updating")
                    : t("creating")
                  : eventId
                    ? t("updateEvent")
                    : t("createEventt")}
              </Button>
            </div>
          </div>
        )}
      </form>

      {step < 4 && (
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mt-4 sm:mt-6 lg:mt-8">
          <Button
            variant="outline"
            onClick={() => {
              setStep(step - 1);
              scrollToTop();
            }}
            disabled={step === 1}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {t("goback")}
          </Button>
          <Button
            onClick={handleNextStep}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {t("saveandcontinue")}
          </Button>
        </div>
      )}

      <DraftRecoveryDialog
        open={showDraftRecovery}
        onOpenChange={() => {}}
        draftData={draftData}
        onRestore={acceptDraft}
        onDiscard={rejectDraft}
        t={t}
      />
    </div>
  );
}
