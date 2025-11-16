"use client";

import { useState, useEffect, useTransition, Suspense, Fragment } from "react";
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
import { SeatMapSelectionModal } from "./components/seat-map-selection-modal";
import { EventDetailsStep } from "./components/event-details-step";
import { MediaUploadStep } from "./components/media-upload-step";
import { PreviewStep } from "./components/preview-step";
import { TicketingStep } from "./components/ticketing-step";
import type {
  EventFormData,
  Area,
  SeatMapData,
  SeatMapPreviewData,
  TicketingMode,
  UploadResponse,
} from "../../../../types/event-types";
import { ShowingFormData } from "@/types/showings";
import { useTranslations } from "next-intl";
import { ShowingWithAreas } from "@/types/showings";

export default function CreateEventPage() {
  return (
    <Suspense>
      <CreateEventPageInner />
    </Suspense>
  );
}

function CreateEventPageInner() {
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
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const t = useTranslations("organizer-dashboard.CreateEvent");
  const [areas, setAreas] = useState<Area[]>([
    { name: t("areaA"), seatCount: "", ticketPrice: "" },
  ]);
  const [ticketingMode, setTicketingMode] = useState<TicketingMode>("simple");
  const [selectedSeatMap, setSelectedSeatMap] = useState<string>("");
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);
  const [selectedSeatMapData, setSelectedSeatMapData] =
    useState<SeatMapData | null>(null);
  const [seatMapPreviewData, setSeatMapPreviewData] =
    useState<SeatMapPreviewData | null>(null);
  const [hasSeatMapChanges, setHasSeatMapChanges] = useState(false);
  const [confirmSeatMapUpdate, setConfirmSeatMapUpdate] = useState(false);
  const [originalSeatMapId, setOriginalSeatMapId] = useState<string>("");
  const [showings, setShowings] = useState<ShowingWithAreas[]>([
    {
      name: t("mainShowing"),
      startTime: "",
      endTime: "",
      areas: [],
    },
  ]);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Validation constants (configurable)
  const VALIDATION_CONFIG = {
    MIN_SHOWING_DURATION_MINUTES: 30,
    MAX_SHOWING_DURATION_HOURS: 24,
    MIN_TICKET_SALE_START_DAYS_BEFORE: 2,
    MIN_TICKET_SALE_END_DAYS_BEFORE: 1,
    MIN_TICKET_SALE_WINDOW_HOURS: 6,
    MAX_TICKET_SALE_WINDOW_DAYS: 90,
    MIN_BUFFER_BETWEEN_SHOWINGS_HOURS: 1,
  };

  // Helper function to get current time in Vietnam timezone
  const getCurrentVietnamTime = (): Date => {
    return new Date();
  };

  // Validation for individual showing
  const validateSingleShowing = (
    showing: ShowingWithAreas,
    index: number
  ): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const now = getCurrentVietnamTime();

    // Check required fields
    if (!showing.startTime) {
      errors[`showing-${index}-startTime`] = t("errors.startTimePast");
      return { valid: false, errors };
    }

    if (!showing.endTime) {
      errors[`showing-${index}-endTime`] = t("errors.endTimePast");
      return { valid: false, errors };
    }

    const startTime = new Date(showing.startTime);
    const endTime = new Date(showing.endTime);

    // Validate start time is not in the past
    if (startTime <= now) {
      errors[`showing-${index}-startTime`] = t("errors.startTimePast");
    }

    // Validate end time is after start time
    if (endTime <= startTime) {
      errors[`showing-${index}-endTime`] = t("errors.endTimeBeforeStart");
    } else {
      // Validate duration
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      const durationHours = durationMinutes / 60;

      if (durationMinutes < VALIDATION_CONFIG.MIN_SHOWING_DURATION_MINUTES) {
        errors[`showing-${index}-endTime`] = t(
          "errors.showingDurationTooShort"
        );
      }

      if (durationHours > VALIDATION_CONFIG.MAX_SHOWING_DURATION_HOURS) {
        errors[`showing-${index}-endTime`] = t("errors.showingDurationTooLong");
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Validation for ticket sale times
  const validateTicketSaleTimes = (
    showing: ShowingWithAreas,
    index: number
  ): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const now = getCurrentVietnamTime();

    // Check if ticket sale times are provided
    if (!showing.ticketSaleStart) {
      errors[`showing-${index}-ticketSaleStart`] = t(
        "errors.ticketSaleStartRequired"
      );
      return { valid: false, errors };
    }

    if (!showing.ticketSaleEnd) {
      errors[`showing-${index}-ticketSaleEnd`] = t(
        "errors.ticketSaleEndRequired"
      );
      return { valid: false, errors };
    }

    if (!showing.startTime) {
      return { valid: false, errors };
    }

    const ticketSaleStart = new Date(showing.ticketSaleStart);
    const ticketSaleEnd = new Date(showing.ticketSaleEnd);
    const showingStart = new Date(showing.startTime);

    // Validate ticket sale start is not in the past
    if (ticketSaleStart <= now) {
      errors[`showing-${index}-ticketSaleStart`] = t(
        "errors.ticketSaleStartPast"
      );
    }

    // Validate ticket sale end is after start
    if (ticketSaleEnd <= ticketSaleStart) {
      errors[`showing-${index}-ticketSaleEnd`] = t(
        "errors.ticketSaleEndAfterStart"
      );
    }

    // Validate ticket sale starts at least 2 days before showing
    const minSaleStart = new Date(showingStart);
    minSaleStart.setDate(
      minSaleStart.getDate() -
        VALIDATION_CONFIG.MIN_TICKET_SALE_START_DAYS_BEFORE
    );

    if (ticketSaleStart > minSaleStart) {
      errors[`showing-${index}-ticketSaleStart`] = t(
        "errors.ticketSaleStartTooLate"
      );
    }

    // Validate ticket sale ends at least 1 day before showing
    const maxSaleEnd = new Date(showingStart);
    maxSaleEnd.setDate(
      maxSaleEnd.getDate() - VALIDATION_CONFIG.MIN_TICKET_SALE_END_DAYS_BEFORE
    );

    if (ticketSaleEnd > maxSaleEnd) {
      errors[`showing-${index}-ticketSaleEnd`] = t(
        "errors.ticketSaleEndTooLate"
      );
    }

    // Validate ticket sale window duration
    if (ticketSaleStart && ticketSaleEnd && ticketSaleEnd > ticketSaleStart) {
      const saleWindowMs = ticketSaleEnd.getTime() - ticketSaleStart.getTime();
      const saleWindowHours = saleWindowMs / (1000 * 60 * 60);
      const saleWindowDays = saleWindowHours / 24;

      if (saleWindowHours < VALIDATION_CONFIG.MIN_TICKET_SALE_WINDOW_HOURS) {
        errors[`showing-${index}-ticketSaleStart`] = t(
          "errors.ticketSaleWindowTooShort"
        );
      }

      if (saleWindowDays > VALIDATION_CONFIG.MAX_TICKET_SALE_WINDOW_DAYS) {
        errors[`showing-${index}-ticketSaleEnd`] = t(
          "errors.ticketSaleWindowTooLong"
        );
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Validation for multiple showings (overlap and duplicates)
  const validateMultipleShowings = (
    showings: ShowingWithAreas[]
  ): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const validShowings = showings.filter((s) => s.startTime && s.endTime);

    if (validShowings.length <= 1) {
      return { valid: true, errors };
    }

    // Sort showings by start time
    const sortedShowings = [...validShowings].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Check for duplicate start times
    const startTimes = new Set<number>();

    for (let i = 0; i < sortedShowings.length; i++) {
      const startTime = new Date(sortedShowings[i].startTime).getTime();

      if (startTimes.has(startTime)) {
        // Find original index in unsorted array
        const originalIndex = showings.findIndex(
          (s) => s.startTime === sortedShowings[i].startTime
        );
        errors[`showing-${originalIndex}-startTime`] = t(
          "errors.duplicateShowingTime"
        );
      } else {
        startTimes.add(startTime);
      }
    }

    // Check for overlaps and insufficient buffer time
    for (let i = 0; i < sortedShowings.length - 1; i++) {
      const currentShowing = sortedShowings[i];
      const nextShowing = sortedShowings[i + 1];

      const currentEnd = new Date(currentShowing.endTime);
      const nextStart = new Date(nextShowing.startTime);

      const bufferMs = nextStart.getTime() - currentEnd.getTime();
      const bufferHours = bufferMs / (1000 * 60 * 60);

      if (bufferHours < VALIDATION_CONFIG.MIN_BUFFER_BETWEEN_SHOWINGS_HOURS) {
        // Find original index in unsorted array
        const nextOriginalIndex = showings.findIndex(
          (s) =>
            s.startTime === nextShowing.startTime &&
            s.endTime === nextShowing.endTime
        );
        errors[`showing-${nextOriginalIndex}-startTime`] = t(
          "errors.showingTimesOverlap"
        );
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Combined validation for all showings
  const validateAllShowings = (
    showings: ShowingWithAreas[]
  ): { valid: boolean; errors: Record<string, string> } => {
    const allErrors: Record<string, string> = {};

    // Check if at least one showing exists
    if (showings.length === 0 || !showings.some((s) => s.startTime)) {
      allErrors.showings = t("errors.showingRequired");
      return { valid: false, errors: allErrors };
    }

    // Validate each individual showing
    for (let i = 0; i < showings.length; i++) {
      if (showings[i].startTime || showings[i].endTime) {
        const showingValidation = validateSingleShowing(showings[i], i);
        Object.assign(allErrors, showingValidation.errors);

        const ticketSaleValidation = validateTicketSaleTimes(showings[i], i);
        Object.assign(allErrors, ticketSaleValidation.errors);
      }
    }

    // Validate multiple showings relationships
    const multipleShowingsValidation = validateMultipleShowings(showings);
    Object.assign(allErrors, multipleShowingsValidation.errors);

    return { valid: Object.keys(allErrors).length === 0, errors: allErrors };
  };

  // Load event data for editing
  useEffect(() => {
    if (!eventId) return;

    const loadEvent = async () => {
      try {
        const event = await fetchEventById(eventId);
        if (!event) return;

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
          console.log("📥 Loading existing seat map:", event.seatMapId);
          const gridDataResult = await getSeatMapGridDataAction(
            event.seatMapId
          );

          if (gridDataResult.success && gridDataResult.data) {
            setSelectedSeatMap(event.seatMapId);
            setOriginalSeatMapId(event.seatMapId);

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

            setSelectedSeatMapData(enrichedSeatMap);
            setSeatMapPreviewData(gridDataResult.data.preview);
            setTicketingMode("seatmap");
          }
        } else {
          // Load simple ticketing areas from showings
          if (event.showings?.length > 0) {
            const firstShowing = event.showings[0];
            if (firstShowing.areas?.length > 0) {
              setAreas(
                firstShowing.areas.map((area: any) => ({
                  name: area.name,
                  ticketPrice: area.price.toString(),
                  seatCount: area.seatCount?.toString() || "0",
                }))
              );
            }
          } else if (event.areas?.length > 0) {
            setAreas(
              event.areas.map((area: any) => ({
                name: area.name,
                ticketPrice: area.price.toString(),
                seatCount: area.rows?.[0]?.seats?.length.toString() || "0",
              }))
            );
          }
          setTicketingMode("simple");
        }

        // Load showings data if available
        if (event.showings?.length > 0) {
          setShowings(
            event.showings.map((showing: any) => {
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

              return {
                name: showing.name,
                startTime: isValidStartTime
                  ? startTime.toISOString().slice(0, 16)
                  : "",
                endTime: isValidEndTime
                  ? endTime.toISOString().slice(0, 16)
                  : "",
                ticketSaleStart: showing.ticketSaleStart
                  ? new Date(showing.ticketSaleStart).toISOString().slice(0, 16)
                  : "",
                ticketSaleEnd: showing.ticketSaleEnd
                  ? new Date(showing.ticketSaleEnd).toISOString().slice(0, 16)
                  : "",
                areas:
                  showing.areas?.map((area: any) => ({
                    name: area.name,
                    ticketPrice: area.price.toString(),
                    seatCount: area.seatCount?.toString() || "0",
                  })) || [],
              };
            })
          );
        }

        setPosterPreview(event.posterUrl ?? null);
        setBannerPreview(event.bannerUrl ?? null);
      } catch (error) {
        console.error("❌ Error loading event:", error);
        toast.error(t("toasts.failedLoadEvent"));
      }
    };

    loadEvent();
  }, [eventId]);

  // Track seat map changes
  useEffect(() => {
    if (!eventId) return;

    const hasChanges =
      selectedSeatMap !== originalSeatMapId ||
      (originalSeatMapId && ticketingMode === "simple") ||
      (!originalSeatMapId && ticketingMode === "seatmap");

    setHasSeatMapChanges(hasChanges);
  }, [selectedSeatMap, originalSeatMapId, ticketingMode, eventId]);

  // Media upload handlers
  const handlePosterUpload = (response: UploadResponse) => {
    setFormData((prev) => ({ ...prev, posterUrl: response.secure_url }));
    toast.success(t("toasts.posterUploaded"));
  };

  const handleBannerUpload = (response: UploadResponse) => {
    setFormData((prev) => ({ ...prev, bannerUrl: response.secure_url }));
    toast.success(t("toasts.bannerUploaded"));
  };

  // ✅ Corrected seat map selection handler
  const handleSeatMapSelection = async (seatMap: SeatMapData) => {
    console.log("📥 Processing seat map selection:", seatMap.name);

    try {
      const result = await getSeatMapGridDataAction(seatMap.id);

      if (result.success && result.data) {
        const enrichedSeatMap: SeatMapData = {
          ...seatMap,
          grids: result.data.gridData?.grids || [],
          defaultSeatSettings:
            result.data.gridData?.defaultSeatSettings || undefined,
        };

        setSelectedSeatMap(enrichedSeatMap.id);
        setSelectedSeatMapData(enrichedSeatMap);
        setSeatMapPreviewData(result.data.preview);
        setShowSeatMapModal(false);

        toast.success(
          t("toasts.selectedSeatMap", { name: enrichedSeatMap.name }),
          {
            description: t("toasts.selectedSeatMapDesc", {
              totalSeats: result.data.preview.totalSeats,
              areasCount: result.data.preview.areas.length,
            }),
          }
        );
      } else {
        console.error("❌ Failed to load seat map data:", result.error);
        toast.error(result.error || t("toasts.failedLoadSeatMap"));
      }
    } catch (error) {
      console.error("❌ Error processing seat map:", error);
      toast.error(t("toasts.seatMapLoadError"));
    }
  };

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
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic field validation
    if (!formData.name.trim()) {
      newErrors.name = t("errors.nameRequired");
    }
    if (!formData.location.trim()) {
      newErrors.location = t("errors.locationRequired");
    }
    if (!formData.description.trim()) {
      newErrors.description = t("errors.descriptionRequired");
    }

    // Max tickets validation
    if (formData.maxTicketsByOrder && formData.maxTicketsByOrder < 1) {
      newErrors.maxTicketsByOrder = t("errors.maxTicketsMin");
    }
    if (formData.maxTicketsByOrder && formData.maxTicketsByOrder > 20) {
      newErrors.maxTicketsByOrder = t("errors.maxTicketsMax");
    }

    // Comprehensive showings validation
    const showingsValidation = validateAllShowings(showings);
    Object.assign(newErrors, showingsValidation.errors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) {
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

    // Auto-calculate ticket sale times if showings are valid
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

    // Clear relevant errors and validate showings
    const showingsValidation = validateAllShowings(newShowings);

    setErrors((prev) => {
      const newErrors = { ...prev };

      // Clear old showing-related errors
      Object.keys(newErrors).forEach((key) => {
        if (
          key.startsWith("showing-") ||
          key === "showings" ||
          key === "ticketSaleStart" ||
          key === "ticketSaleEnd"
        ) {
          delete newErrors[key];
        }
      });

      // Add new validation errors
      Object.assign(newErrors, showingsValidation.errors);

      return newErrors;
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (eventId && hasSeatMapChanges && !confirmSeatMapUpdate) {
      toast.error(t("confirmSeatMapUpdate"));
      return;
    }

    // Comprehensive validation before submission
    const basicErrors: Record<string, string> = {};

    // Basic fields validation
    if (!formData.name.trim()) {
      basicErrors.name = t("errors.nameRequired");
    }
    if (!formData.location.trim()) {
      basicErrors.location = t("errors.locationRequired");
    }
    if (!formData.description.trim()) {
      basicErrors.description = t("errors.descriptionRequired");
    }

    // Max tickets validation
    if (formData.maxTicketsByOrder && formData.maxTicketsByOrder < 1) {
      basicErrors.maxTicketsByOrder = t("errors.maxTicketsMin");
    }
    if (formData.maxTicketsByOrder && formData.maxTicketsByOrder > 20) {
      basicErrors.maxTicketsByOrder = t("errors.maxTicketsMax");
    }

    // Comprehensive showings validation
    const showingsValidation = validateAllShowings(showings);
    Object.assign(basicErrors, showingsValidation.errors);

    if (Object.keys(basicErrors).length > 0) {
      // Clear old showing-related errors and set new ones
      setErrors((prev) => {
        const newErrors = { ...prev };

        // Clear old showing-related errors
        Object.keys(newErrors).forEach((key) => {
          if (key.startsWith("showing-") || key === "showings") {
            delete newErrors[key];
          }
        });

        // Add new validation errors
        Object.assign(newErrors, basicErrors);

        return newErrors;
      });

      toast.error(t("pleaseFixErrors"));
      return;
    }

    // Get form data from the actual form element to include hidden inputs
    const form = new FormData(e.currentTarget);

    // Add additional data that might not be in the form
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

    // Add showings data - convert times to UTC
    showings.forEach((showing, index) => {
      form.set(`showings[${index}].name`, showing.name);

      // Convert times to UTC before sending to server
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

    if (ticketingMode === "seatmap" && selectedSeatMap && selectedSeatMapData) {
      form.set("seatMapId", selectedSeatMap);
      form.set(
        "seatMapData",
        JSON.stringify({
          grids: selectedSeatMapData.grids || [],
          defaultSeatSettings: selectedSeatMapData.defaultSeatSettings,
        })
      );
    }
    // Note: Areas data is now handled by hidden inputs in ShowingsTicketing component

    startTransition(async () => {
      try {
        if (eventId) {
          await handleUpdateEvent(form);
          toast.success(t("toasts.eventUpdated"));
        } else {
          const eventResult = await handleCreateEvent(form);

          if (
            ticketingMode === "seatmap" &&
            selectedSeatMap &&
            eventResult?.eventId
          ) {
            toast.success(t("toasts.eventAndSeatMapCreated"));
          } else {
            toast.success(t("toasts.eventCreated"));
          }
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
            areas={areas}
            showings={showings}
            onInputChange={handleChange}
            onDescriptionChange={(value) => {
              setFormData({ ...formData, description: value });
            }}
            onShowingsChange={handleShowingsChange}
          />
        );
      case 2:
        return (
          <MediaUploadStep
            formData={formData}
            onPosterUpload={handlePosterUpload}
            onBannerUpload={handleBannerUpload}
            onUploadError={(error: Error) =>
              toast.error(t("toasts.uploadFailed", { message: error.message }))
            }
            onPosterRemove={() =>
              setFormData((prev) => ({ ...prev, posterUrl: "" }))
            }
            onBannerRemove={() =>
              setFormData((prev) => ({ ...prev, bannerUrl: "" }))
            }
            onPosterGenerated={(imageUrl) =>
              setFormData((prev) => ({ ...prev, posterUrl: imageUrl }))
            }
            onBannerGenerated={(imageUrl) =>
              setFormData((prev) => ({ ...prev, bannerUrl: imageUrl }))
            }
          />
        );
      case 3:
        return <PreviewStep formData={formData} showings={showings} />;
      case 4:
        return (
          <TicketingStep
            ticketingMode={ticketingMode}
            setTicketingMode={setTicketingMode}
            areas={areas}
            setAreas={setAreas}
            selectedSeatMap={selectedSeatMap}
            setSelectedSeatMap={setSelectedSeatMap}
            selectedSeatMapData={selectedSeatMapData}
            setSelectedSeatMapData={setSelectedSeatMapData}
            seatMapPreviewData={seatMapPreviewData}
            setSeatMapPreviewData={setSeatMapPreviewData}
            setShowSeatMapModal={setShowSeatMapModal}
            showings={showings}
            hasSeatMapChanges={hasSeatMapChanges}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">
        {eventId ? t("editEvent") : t("createEvent")}
      </h1>

      <StepProgressBar step={step} />
      <Separator className="mb-6" />

      <form onSubmit={onSubmit} className="space-y-6">
        {renderStep()}

        {step === 4 && (
          <div className="space-y-6">
            {eventId && hasSeatMapChanges && (
              <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">
                  {t("seatMapUpdateRequired")}
                </h4>
                <p className="text-sm text-orange-700 mb-3">{t("text1")}</p>
                <ul className="text-sm text-orange-700 mb-4 list-disc list-inside space-y-1">
                  <li>{t("text2")}</li>
                  <li>{t("text3")}</li>
                  <li>{t("text4")}</li>
                </ul>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="confirmSeatMapUpdate"
                    checked={confirmSeatMapUpdate}
                    onChange={(e) => setConfirmSeatMapUpdate(e.target.checked)}
                    className="rounded border-orange-300"
                  />
                  <label
                    htmlFor="confirmSeatMapUpdate"
                    className="text-sm text-orange-800"
                  >
                    {t("text5")}
                  </label>
                </div>
              </div>
            )}

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
                disabled={
                  isPending ||
                  (eventId !== null &&
                    hasSeatMapChanges &&
                    !confirmSeatMapUpdate)
                }
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
        <div className="flex justify-end mt-8 space-x-4">
          <Button
            variant="outline"
            onClick={() => {
              setStep(step - 1);
              scrollToTop();
            }}
            disabled={step === 1}
          >
            {t("goback")}
          </Button>
          <Button onClick={handleNextStep}>{t("saveandcontinue")}</Button>
        </div>
      )}

      <SeatMapSelectionModal
        open={showSeatMapModal}
        onOpenChange={setShowSeatMapModal}
        onSelect={handleSeatMapSelection}
        selectedSeatMapId={selectedSeatMap}
      />
    </div>
  );
}
