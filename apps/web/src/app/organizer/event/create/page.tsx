"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
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
import {
  loadSeatMapAction,
  getSeatMapGridDataAction,
} from "@/lib/actions/organizer/seat-map-actions";
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
    startTime: "",
    endTime: "",
  });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const [areas, setAreas] = useState<Area[]>([
    { name: "Area A", seatCount: "", ticketPrice: "" },
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
  const [showings, setShowings] = useState<ShowingFormData[]>([
    {
      name: "Main Showing",
      startTime: "",
      endTime: "",
    },
  ]);

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
          startTime: event.startTime
            ? new Date(event.startTime).toISOString().slice(0, 16)
            : "",
          endTime: event.endTime
            ? new Date(event.endTime).toISOString().slice(0, 16)
            : "",
          location: event.location ?? "",
          description: event.description ?? "",
          posterUrl: event.posterUrl ?? "",
          bannerUrl: event.bannerUrl ?? "",
          seatCount: "",
          ticketPrice: "",
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

            console.log("✅ Seat map loaded successfully:", {
              name: enrichedSeatMap.name,
              grids: enrichedSeatMap.grids?.length,
              totalSeats: gridDataResult.data.preview.totalSeats,
            });
          }
        } else {
          // Load simple ticketing areas
          if (event.areas?.length > 0) {
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
      } catch (error) {
        console.error("❌ Error loading event:", error);
        toast.error("Failed to load event data");
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
    toast.success("Poster uploaded successfully!");
  };

  const handleBannerUpload = (response: UploadResponse) => {
    setFormData((prev) => ({ ...prev, bannerUrl: response.secure_url }));
    toast.success("Banner uploaded successfully!");
  };

  // ✅ Corrected seat map selection handler
  const handleSeatMapSelection = async (seatMap: SeatMapData) => {
    console.log("📥 Processing seat map selection:", seatMap.name);

    try {
      // ✅ Extract grid data from the seat map
      const result = await getSeatMapGridDataAction(seatMap.id);

      if (result.success && result.data) {
        const enrichedSeatMap: SeatMapData = {
          ...seatMap,
          grids: result.data.gridData?.grids || [],
          defaultSeatSettings:
            result.data.gridData?.defaultSeatSettings || undefined,
        };

        console.log("✅ Seat map data enriched:", {
          grids: enrichedSeatMap.grids?.length || 0,
          hasDefaultSettings: !!enrichedSeatMap.defaultSeatSettings,
          totalSeats: result.data.preview.totalSeats,
        });

        setSelectedSeatMap(enrichedSeatMap.id);
        setSelectedSeatMapData(enrichedSeatMap);
        setSeatMapPreviewData(result.data.preview);
        setShowSeatMapModal(false);

        toast.success(`Selected seat map: ${enrichedSeatMap.name}`, {
          description: `${result.data.preview.totalSeats} seats in ${result.data.preview.areas.length} areas`,
        });
      } else {
        console.error("❌ Failed to load seat map data:", result.error);
        toast.error(result.error || "Failed to load seat map details");
      }
    } catch (error) {
      console.error("❌ Error processing seat map:", error);
      toast.error("An error occurred while loading the seat map");
    }
  };

  // Validation functions
  const validateDateTime = (name: string, value: string) => {
    const now = new Date();
    const inputDate = new Date(value);
    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    const ticketSaleStart = new Date(formData.ticketSaleStart);

    let error = "";

    switch (name) {
      case "startTime":
        if (inputDate < now) {
          error = "Start time cannot be in the past";
        }
        break;
      case "endTime":
        if (inputDate < now) {
          error = "End time cannot be in the past";
        } else if (formData.startTime && inputDate <= startTime) {
          error = "End time must be after start time";
        }
        break;
      case "ticketSaleStart":
        if (inputDate < now) {
          error = "Ticket sale start cannot be in the past";
        } else if (formData.endTime && inputDate > endTime) {
          error = "Ticket sale start must be before event end time";
        }
        break;
      case "ticketSaleEnd":
        if (formData.ticketSaleStart && inputDate < ticketSaleStart) {
          error = "Ticket sale end must be after ticket sale start";
        } else if (formData.endTime && inputDate > endTime) {
          error = "Ticket sale end must be before event end time";
        }
        break;
    }

    return error;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (
      ["startTime", "endTime", "ticketSaleStart", "ticketSaleEnd"].includes(
        name
      )
    ) {
      const error = validateDateTime(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));

      if (!error) {
        const relatedErrors: Record<string, string[]> = {
          startTime: ["endTime"],
          endTime: ["ticketSaleStart", "ticketSaleEnd"],
          ticketSaleStart: ["ticketSaleEnd"],
          ticketSaleEnd: [],
        };

        const fieldsToRevalidate = relatedErrors[name] || [];
        fieldsToRevalidate.forEach((field) => {
          const fieldValue =
            name === field ? value : formData[field as keyof typeof formData];
          if (fieldValue) {
            const fieldError = validateDateTime(field, fieldValue);
            setErrors((prev) => ({ ...prev, [field]: fieldError }));
          }
        });
      }
    }
  };

  // ✅ Form submission - Build FormData from state
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if seat map update confirmation is needed
    if (eventId && hasSeatMapChanges && !confirmSeatMapUpdate) {
      toast.error("Please confirm seat map update to proceed.");
      return;
    }

    const dateTimeFields = [
      "startTime",
      "endTime",
      "ticketSaleStart",
      "ticketSaleEnd",
    ];
    const newErrors: Record<string, string> = {};

    dateTimeFields.forEach((field) => {
      const value = formData[field as keyof typeof formData];
      if (value) {
        const error = validateDateTime(field, value);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    // ✅ Build FormData from state instead of e.currentTarget
    const form = new FormData();

    // Add event ID if updating
    if (eventId) {
      form.append("eventId", eventId);
    }

    // Add basic event data
    form.append("name", formData.name);
    form.append("type", formData.type);
    form.append("ticketSaleStart", formData.ticketSaleStart);
    form.append("ticketSaleEnd", formData.ticketSaleEnd);
    form.append("location", formData.location);
    form.append("description", formData.description);
    form.append("posterUrl", formData.posterUrl);
    form.append("bannerUrl", formData.bannerUrl);
    form.append("ticketingMode", ticketingMode);

    // ✅ Add showings data
    showings.forEach((showing, index) => {
      form.append(`showings[${index}].name`, showing.name);
      form.append(`showings[${index}].startTime`, showing.startTime);
      form.append(`showings[${index}].endTime`, showing.endTime);
    });

    // ✅ Add ticketing configuration based on mode
    if (ticketingMode === "seatmap" && selectedSeatMap && selectedSeatMapData) {
      form.append("seatMapId", selectedSeatMap);
      form.append(
        "seatMapData",
        JSON.stringify({
          grids: selectedSeatMapData.grids || [],
          defaultSeatSettings: selectedSeatMapData.defaultSeatSettings,
        })
      );
    } else {
      // Simple ticketing mode - add areas
      areas.forEach((area, index) => {
        form.append(`areas[${index}][name]`, area.name);
        form.append(`areas[${index}][seatCount]`, area.seatCount);
        form.append(`areas[${index}][ticketPrice]`, area.ticketPrice);
      });
    }

    console.log("📤 Submitting form data:", {
      eventId: eventId || "new",
      ticketingMode,
      showingsCount: showings.length,
      areasCount: ticketingMode === "simple" ? areas.length : 0,
      seatMapId: ticketingMode === "seatmap" ? selectedSeatMap : null,
      gridsCount:
        ticketingMode === "seatmap" ? selectedSeatMapData?.grids?.length : 0,
    });

    startTransition(async () => {
      try {
        if (eventId) {
          await handleUpdateEvent(form);
          toast.success("✅ Event updated successfully!");
        } else {
          const eventResult = await handleCreateEvent(form);

          if (
            ticketingMode === "seatmap" &&
            selectedSeatMap &&
            eventResult?.eventId
          ) {
            toast.success("🎉 Event and seat map created successfully!");
          } else {
            toast.success("🎉 Event created successfully!");
          }
        }

        router.push("/organizer");
      } catch (err) {
        toast.error("Something went wrong while creating the event.");
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
            onShowingsChange={setShowings}
          />
        );
      case 2:
        return (
          <MediaUploadStep
            formData={formData}
            onPosterUpload={handlePosterUpload}
            onBannerUpload={handleBannerUpload}
            onUploadError={(error: Error) =>
              toast.error(`Upload failed: ${error.message}`)
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
        {eventId ? "Edit Event" : "Create a New Event"}
      </h1>

      <StepProgressBar step={step} />
      <Separator className="mb-6" />

      <form onSubmit={onSubmit} className="space-y-6">
        {renderStep()}

        {step === 4 && (
          <div className="space-y-6">
            {/* Seat Map Update Confirmation */}
            {eventId && hasSeatMapChanges && (
              <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">
                  ⚠️ Seat Map Update Required
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  You have made changes to the seating configuration. This will:
                </p>
                <ul className="text-sm text-orange-700 mb-4 list-disc list-inside space-y-1">
                  <li>Delete all existing seat assignments and bookings</li>
                  <li>Recreate the entire seating structure</li>
                  <li>This operation cannot be undone</li>
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
                    I understand and confirm the seat map update
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-8 space-x-4">
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Go back
              </Button>
              {eventId && (
                <input type="hidden" name="eventId" value={eventId} />
              )}

              {/* ✅ Hidden form data inputs - Basic event info only */}
              <input type="hidden" name="name" value={formData.name} />
              <input type="hidden" name="type" value={formData.type} />
              <input
                type="hidden"
                name="ticketSaleStart"
                value={formData.ticketSaleStart}
              />
              <input
                type="hidden"
                name="ticketSaleEnd"
                value={formData.ticketSaleEnd}
              />
              <input type="hidden" name="location" value={formData.location} />
              <input
                type="hidden"
                name="description"
                value={formData.description}
              />
              <input
                type="hidden"
                name="posterUrl"
                value={formData.posterUrl}
              />
              <input
                type="hidden"
                name="bannerUrl"
                value={formData.bannerUrl}
              />
              <input type="hidden" name="ticketingMode" value={ticketingMode} />

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
                    ? "Updating..."
                    : "Creating..."
                  : eventId
                    ? "Update Event"
                    : "🎉 Create Event"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {step < 4 && (
        <div className="flex justify-end mt-8 space-x-4">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Go back
          </Button>
          <Button
            onClick={() => {
              if (step === 1) {
                const dateTimeFields = [
                  "startTime",
                  "endTime",
                  "ticketSaleStart",
                  "ticketSaleEnd",
                ];
                const newErrors: Record<string, string> = {};

                dateTimeFields.forEach((field) => {
                  const value = formData[field as keyof typeof formData];
                  if (value) {
                    const error = validateDateTime(field, value);
                    if (error) {
                      newErrors[field] = error;
                    }
                  }
                });

                if (Object.keys(newErrors).length > 0) {
                  setErrors((prev) => ({ ...prev, ...newErrors }));
                  toast.error(
                    "Please fix the date/time validation errors before continuing."
                  );
                  return;
                }
              }

              setStep(step + 1);
            }}
          >
            Save & Continue
          </Button>
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
