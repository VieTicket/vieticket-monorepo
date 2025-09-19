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
import { previewSeatMapDataAction } from "@/lib/actions/organizer/process-seat-map-action";
import { loadSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
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
  });
  const [step, setStep] = useState(1);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
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
        try {
          const seatMapResult = await loadSeatMapAction(event.seatMapId);
          if (seatMapResult.success && seatMapResult.data) {
            setSelectedSeatMap(event.seatMapId);
            setOriginalSeatMapId(event.seatMapId);
            setSelectedSeatMapData({
              id: seatMapResult.data.id,
              name: seatMapResult.data.name,
              image: seatMapResult.data.image,
              createdBy: seatMapResult.data.createdBy,
              createdAt: seatMapResult.data.createdAt,
              updatedAt: seatMapResult.data.updatedAt,
            });

            // Get seat map preview data
            const previewResult = await previewSeatMapDataAction(
              event.seatMapId
            );
            if (previewResult.success && previewResult.data) {
              setSeatMapPreviewData(previewResult.data as SeatMapPreviewData);
            }

            setTicketingMode("seatmap");
          }
        } catch (error) {
          console.error("Error loading seat map data:", error);
          toast.error("Failed to load seat map data");
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

      setPosterPreview(event.posterUrl ?? null);
      setBannerPreview(event.bannerUrl ?? null);
    };

    loadEvent();
  }, [eventId]);

  // Track seat map changes
  useEffect(() => {
    if (!eventId) return;

    const hasChanges =
      selectedSeatMap !== originalSeatMapId || // Different seat map selected
      (originalSeatMapId && ticketingMode === "simple") || // Changed from seat map to simple
      (!originalSeatMapId && ticketingMode === "seatmap"); // Changed from simple to seat map

    setHasSeatMapChanges(hasChanges);
  }, [selectedSeatMap, originalSeatMapId, ticketingMode, eventId]);

  // Media upload handlers
  const handlePosterUpload = (response: UploadResponse) => {
    if (response.file) {
      const tempUrl = URL.createObjectURL(response.file);
      setPosterPreview(tempUrl);
    }
    setFormData((prev) => ({ ...prev, posterUrl: response.secure_url }));
    toast.success("Poster uploaded successfully!");
  };

  const handleBannerUpload = (response: UploadResponse) => {
    if (response.file) {
      const tempUrl = URL.createObjectURL(response.file);
      setBannerPreview(tempUrl);
    }
    setFormData((prev) => ({ ...prev, bannerUrl: response.secure_url }));
    toast.success("Banner uploaded successfully!");
  };

  // Seat map selection handler
  const handleSeatMapSelection = async (seatMap: SeatMapData) => {
    setSelectedSeatMap(seatMap.id);
    setSelectedSeatMapData(seatMap);
    setShowSeatMapModal(false);

    try {
      const result = await previewSeatMapDataAction(seatMap.id);
      if (result.success && result.data) {
        setSeatMapPreviewData(result.data as SeatMapPreviewData);
        toast.success(`Seat map "${seatMap.name}" selected successfully!`);
      } else {
        setSeatMapPreviewData(null);
        toast.error(result.error || "Failed to preview seat map data");
      }
    } catch (error) {
      console.error("Error previewing seat map:", error);
      setSeatMapPreviewData(null);
      toast.error("Failed to preview seat map data");
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

  // Form submission
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

    const form = new FormData(e.currentTarget);

    // Add seat map data if using seat map mode
    if (ticketingMode === "seatmap" && seatMapPreviewData) {
      form.append("seatMapData", JSON.stringify(seatMapPreviewData));
    }

    startTransition(async () => {
      try {
        const hasId = form.get("eventId");

        if (hasId) {
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
              console.log(
                "📄 TipTap onChange triggered, content length:",
                value.length
              );
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

              {/* Hidden form data inputs */}
              {ticketingMode === "simple" &&
                areas.map((area, index) => (
                  <div key={index}>
                    <input
                      type="hidden"
                      name={`areas[${index}][name]`}
                      value={area.name}
                    />
                    <input
                      type="hidden"
                      name={`areas[${index}][seatCount]`}
                      value={area.seatCount}
                    />
                    <input
                      type="hidden"
                      name={`areas[${index}][ticketPrice]`}
                      value={area.ticketPrice}
                    />
                  </div>
                ))}

              <input type="hidden" name="name" value={formData.name} />
              <input type="hidden" name="type" value={formData.type} />
              {/* Add showings data */}
              {showings.map((showing, index) => (
                <div key={index}>
                  <input
                    type="hidden"
                    name={`showings[${index}].name`}
                    value={showing.name}
                  />
                  <input
                    type="hidden"
                    name={`showings[${index}].startTime`}
                    value={showing.startTime}
                  />
                  <input
                    type="hidden"
                    name={`showings[${index}].endTime`}
                    value={showing.endTime}
                  />
                </div>
              ))}
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
              <input
                type="hidden"
                name="seatCount"
                value={formData.seatCount}
              />
              <input
                type="hidden"
                name="ticketPrice"
                value={formData.ticketPrice}
              />
              <input type="hidden" name="ticketingMode" value={ticketingMode} />
              {selectedSeatMap && (
                <input type="hidden" name="seatMapId" value={selectedSeatMap} />
              )}

              <Button
                type="submit"
                className="bg-blue-600 text-white"
                disabled={
                  isPending ||
                  (eventId === undefined &&
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
