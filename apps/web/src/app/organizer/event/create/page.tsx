"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { handleCreateEvent, handleUpdateEvent } from "./action";
import { StepProgressBar } from "@/components/create-event/progress-bar";
import TiptapEditorInput from "@/components/TiptapEditorInput";
import { PreviewEvent } from "@/components/create-event/preview";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";
import { slugify } from "@/lib/utils";
import { FileUploader } from "@/components/ui/file-uploader";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchEventById } from "./action";
import { AIImageGenerator } from "@/components/ai/AIImageGenerator";
import Link from "next/link";

// Mock data for seat maps - should be replaced with actual API call
const MOCK_PUBLISHED_SEATMAPS = [
  {
    id: "pub1",
    name: "Main Stadium",
    updatedAt: "2025-07-01T10:00:00Z",
  },
  {
    id: "pub2",
    name: "Conference Hall",
    updatedAt: "2025-06-28T15:30:00Z",
  },
  {
    id: "pub3",
    name: "Jazz Theater",
    updatedAt: "2025-06-25T09:45:00Z",
  },
  {
    id: "pub4",
    name: "Stadium Section A",
    updatedAt: "2025-06-20T11:20:00Z",
  },
];

export default function CreateEventPage() {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    ticketSaleStart: "",
    ticketSaleEnd: "",
    startTime: "",
    endTime: "",
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
  const [areas, setAreas] = useState([
    { name: "Area A", seatCount: "", ticketPrice: "" },
  ]);
  const [ticketingMode, setTicketingMode] = useState<"simple" | "seatmap">(
    "simple"
  );
  const [selectedSeatMap, setSelectedSeatMap] = useState<string>("");

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
        seatCount: "", // Bỏ dùng, xử lý theo areas riêng
        ticketPrice: "", // Bỏ dùng, xử lý theo areas riêng
      });

      // 👇 Cập nhật danh sách areas từ dữ liệu
      if (event.areas?.length > 0) {
        setAreas(
          event.areas.map((area) => ({
            name: area.name,
            ticketPrice: area.price.toString(),
            seatCount: area.rows?.[0]?.seats?.length.toString() || "0",
          }))
        );
      }

      // 👇 Cập nhật preview (nếu cần)
      setPosterPreview(event.posterUrl ?? null);
      setBannerPreview(event.bannerUrl ?? null);
    };

    loadEvent();
  }, [eventId]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all datetime fields before submission
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

    // If there are validation errors, show them and don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const hasId = form.get("eventId");
        if (hasId) {
          await handleUpdateEvent(form);
          toast.success("✅ Event updated successfully!");
        } else {
          await handleCreateEvent(form);
          toast.success("🎉 Event created successfully!");
        }

        router.push("/organizer"); // redirect to organizer dashboard
      } catch (err) {
        toast.error("Something went wrong while creating the event.");
        console.error(err);
      }
    });
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

    // Update form data
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate datetime fields
    if (
      ["startTime", "endTime", "ticketSaleStart", "ticketSaleEnd"].includes(
        name
      )
    ) {
      const error = validateDateTime(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));

      // Clear related field errors when fixing a field
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
            setErrors((prev) => ({
              ...prev,
              [field]: fieldError,
            }));
          }
        });
      }
    }
  };

  // Handle poster upload success
  const handlePosterUpload = (response: any) => {
    if (response.file) {
      const tempUrl = URL.createObjectURL(response.file);
      setPosterPreview(tempUrl); // Preview tạm
    }

    setFormData((prev) => ({ ...prev, posterUrl: response.secure_url }));
    toast.success("Poster uploaded successfully!");
  };

  const handleBannerUpload = (response: any) => {
    if (response.file) {
      const tempUrl = URL.createObjectURL(response.file);
      setBannerPreview(tempUrl); // Preview tạm
    }

    setFormData((prev) => ({ ...prev, bannerUrl: response.secure_url }));
    toast.success("Banner uploaded successfully!");
  };

  // Handle upload errors
  const handleUploadError = (error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  };

  const renderField = (
    name: keyof typeof formData,
    label: string,
    type: string = "text",
    options?: string[]
  ) => {
    // Helper function to get minimum datetime for fields
    const getMinDateTime = (fieldName: string) => {
      const now = new Date();
      const currentDateTime = now.toISOString().slice(0, 16);

      switch (fieldName) {
        case "startTime":
        case "ticketSaleStart":
          return currentDateTime;
        case "endTime":
          return formData.startTime || currentDateTime;
        case "ticketSaleEnd":
          return formData.ticketSaleStart || currentDateTime;
        default:
          return currentDateTime;
      }
    };

    // Helper function to get maximum datetime for fields
    const getMaxDateTime = (fieldName: string) => {
      switch (fieldName) {
        case "ticketSaleStart":
        case "ticketSaleEnd":
          return formData.endTime || undefined;
        default:
          return undefined;
      }
    };

    // Show date hint for end time when start time is selected
    const getDateHint = (fieldName: string) => {
      if (fieldName === "endTime" && formData.startTime) {
        const startDate = new Date(formData.startTime);
        return `Start: ${startDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
      return null;
    };

    const dateHint = getDateHint(name);

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={name}>
            {label}{" "}
            {name === "name" || name === "location" || name === "description"
              ? "*"
              : ""}
          </Label>
          {dateHint && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md whitespace-nowrap">
              💡 {dateHint}
            </span>
          )}
        </div>

        {type === "select" && options ? (
          <select
            id={name}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 ${
              errors[name] ? "border-red-500" : ""
            }`}
            required={
              name === "name" || name === "location" || name === "description"
            }
          >
            <option value="">-- Category --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={name}
            name={name}
            type={type}
            value={formData[name]}
            onChange={handleChange}
            className={errors[name] ? "border-red-500" : ""}
            required={
              name === "name" || name === "location" || name === "description"
            }
            min={type === "datetime-local" ? getMinDateTime(name) : undefined}
            max={type === "datetime-local" ? getMaxDateTime(name) : undefined}
          />
        )}

        {errors[name] && (
          <p className="text-red-500 text-xs mt-1">{errors[name]}</p>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Edit Step
        return (
          <>
            <h2 className="text-xl font-semibold mb-4">Event Details</h2>
            {renderField("name", "Event Title", "text")}
            {renderField("type", "Event Category", "select", [
              "Workshop",
              "Concert",
              "Webinar",
              "Music",
              "Sports",
              "Art",
              "Comedy",
              "Food",
              "Conference",
            ])}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                {renderField("startTime", "Start Time", "datetime-local")}
                {renderField("endTime", "End Time", "datetime-local")}
                {renderField(
                  "ticketSaleStart",
                  "Ticket Sale Start",
                  "datetime-local"
                )}
                {renderField(
                  "ticketSaleEnd",
                  "Ticket Sale End",
                  "datetime-local"
                )}
              </div>
            </div>
            {renderField("location", "Where will your event take place?")}

            <TiptapEditorInput
              value={formData.description}
              onChange={(v) => {
                console.log(
                  "📄 TipTap onChange triggered, content length:",
                  v.length
                );
                setFormData({ ...formData, description: v });
              }}
              error={!!errors.description}
              eventData={{
                name: formData.name,
                type: formData.type,
                startTime: formData.startTime,
                endTime: formData.endTime,
                location: formData.location,
                ticketSaleStart: formData.ticketSaleStart,
                ticketSaleEnd: formData.ticketSaleEnd,
                ticketPrice: areas[0]?.ticketPrice || "", // Get price from first area
              }}
            />
          </>
        );
      case 2: // Banner Step
        return (
          <div className="space-y-8">
            {/* Poster Upload Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Event Poster
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Recommended: 600x800px or 3:4 ratio)
                </span>
              </Label>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Manual Upload */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Upload Your Own
                  </h3>
                  <div className="relative w-full aspect-[3/4] border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {formData.posterUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.posterUrl}
                          alt="Event poster preview"
                          className="w-full h-full object-cover"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <FileUploader
                          onUploadSuccess={handlePosterUpload}
                          onUploadError={handleUploadError}
                          folder="event-posters"
                          mode="dropzone"
                          buttonLabel="Upload Poster"
                          className="h-[100%]"
                        />
                      </div>
                    )}
                  </div>

                  {formData.posterUrl && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, posterUrl: "" }))
                        }
                      >
                        Remove Poster
                      </Button>
                    </div>
                  )}
                </div>

                {/* AI Generation */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Generate with AI
                  </h3>
                  <AIImageGenerator
                    type="poster"
                    onImageGenerated={(imageUrl) =>
                      setFormData((prev) => ({
                        ...prev,
                        posterUrl: imageUrl,
                      }))
                    }
                    eventType={formData.type}
                  />
                </div>
              </div>
            </div>

            {/* Banner Upload Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Event Banner
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Recommended: 1280x720px or 16:9 ratio)
                </span>
              </Label>

              <div className="space-y-6">
                {/* Manual Upload */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Upload Your Own
                  </h3>
                  <div className="relative w-full aspect-[16/9] border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {formData.bannerUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.bannerUrl}
                          alt="Event banner preview"
                          className="w-full h-full object-cover"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <FileUploader
                          onUploadSuccess={handleBannerUpload}
                          onUploadError={handleUploadError}
                          folder="event-banners"
                          mode="dropzone"
                          buttonLabel="Upload Banner"
                          className="h-[100%]"
                        />
                      </div>
                    )}
                  </div>

                  {formData.bannerUrl && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, bannerUrl: "" }))
                        }
                      >
                        Remove Banner
                      </Button>
                    </div>
                  )}
                </div>

                {/* AI Generation for Banner */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Generate Banner with AI
                  </h3>
                  <div className="w-full">
                    <AIImageGenerator
                      type="banner"
                      onImageGenerated={(imageUrl) =>
                        setFormData((prev) => ({
                          ...prev,
                          bannerUrl: imageUrl,
                        }))
                      }
                      eventType={formData.type}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Review Step
        return (
          <div className="bg-white shadow-none rounded-none w-full py-0">
            <PreviewEvent
              data={{
                ...formData,
                slug: `${slugify(formData.name)}-preview`,
                organizer: null,
                areas: [],
                isPreview: true,
              }}
            />
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Ticketing & Seating</h2>

            {/* Mode Selection */}
            <div className="space-y-4 mb-6">
              <Label className="text-base font-medium">
                Choose Ticketing Mode
              </Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTicketingMode("simple")}
                  className={`flex-1 p-4 border rounded-lg text-left transition-colors ${
                    ticketingMode === "simple"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium mb-2">Simple Ticketing</div>
                  <div className="text-sm text-gray-600">
                    Create tickets with basic area pricing (no specific seat
                    selection)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketingMode("seatmap")}
                  className={`flex-1 p-4 border rounded-lg text-left transition-colors ${
                    ticketingMode === "seatmap"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium mb-2">Seat Map Ticketing</div>
                  <div className="text-sm text-gray-600">
                    Use a pre-designed seat map with specific seat selection
                  </div>
                </button>
              </div>
            </div>

            {/* Content based on selected mode */}
            {ticketingMode === "simple" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ticket Areas</h3>
                {areas.map((area, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 items-end border p-4 rounded-lg relative"
                  >
                    <div className="space-y-1">
                      <Label htmlFor={`area-name-${index}`}>Area Name</Label>
                      <Input
                        id={`area-name-${index}`}
                        type="text"
                        name={`areas[${index}][name]`}
                        placeholder="e.g. VIP, Standard"
                        value={area.name}
                        onChange={(e) =>
                          setAreas((prev) =>
                            prev.map((a, i) =>
                              i === index ? { ...a, name: e.target.value } : a
                            )
                          )
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`area-seatCount-${index}`}>
                        Seat Count
                      </Label>
                      <Input
                        id={`area-seatCount-${index}`}
                        type="number"
                        name={`areas[${index}][seatCount]`}
                        placeholder="e.g. 100"
                        value={area.seatCount}
                        min={1}
                        onChange={(e) =>
                          setAreas((prev) =>
                            prev.map((a, i) =>
                              i === index
                                ? { ...a, seatCount: e.target.value }
                                : a
                            )
                          )
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`area-ticketPrice-${index}`}>
                        Ticket Price (VND)
                      </Label>
                      <Input
                        id={`area-ticketPrice-${index}`}
                        type="number"
                        name={`areas[${index}][ticketPrice]`}
                        placeholder="e.g. 50000"
                        step="10000"
                        min={0}
                        value={area.ticketPrice}
                        onChange={(e) =>
                          setAreas((prev) =>
                            prev.map((a, i) =>
                              i === index
                                ? { ...a, ticketPrice: e.target.value }
                                : a
                            )
                          )
                        }
                        required
                      />
                    </div>

                    {/* Xoá khu vực */}
                    {areas.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAreas((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="absolute top-2 right-2 text-red-500 text-sm"
                      >
                        🗑 Remove
                      </button>
                    )}
                  </div>
                ))}

                {/* Thêm khu vực mới */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAreas((prev) => [
                      ...prev,
                      {
                        name: `Area ${String.fromCharCode(65 + prev.length)}`,
                        seatCount: "",
                        ticketPrice: "",
                      },
                    ])
                  }
                >
                  + Add Area
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Select Seat Map</h3>

                <div className="space-y-2">
                  <Label htmlFor="seatmap-select">Choose a Seat Map</Label>
                  <select
                    id="seatmap-select"
                    name="selectedSeatMap"
                    value={selectedSeatMap}
                    onChange={(e) => setSelectedSeatMap(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                    required
                  >
                    <option value="">-- Select a seat map --</option>
                    {MOCK_PUBLISHED_SEATMAPS.map((seatMap) => (
                      <option key={seatMap.id} value={seatMap.id}>
                        {seatMap.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">
                      Don&apos;t have a seat map? Create one first.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/organizer/seat-map">Manage Seat Maps</Link>
                  </Button>
                </div>

                {selectedSeatMap && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium mb-2">
                      Selected Seat Map Preview
                    </h4>
                    {(() => {
                      const selectedMap = MOCK_PUBLISHED_SEATMAPS.find(
                        (map) => map.id === selectedSeatMap
                      );
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {selectedMap?.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              Updated:{" "}
                              {selectedMap &&
                                new Date(
                                  selectedMap.updatedAt
                                ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-gray-500">
                              Seat map preview will be shown here
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Hidden input for form submission */}
                <input type="hidden" name="seatMapId" value={selectedSeatMap} />
              </div>
            )}

            {/* Hidden input for ticketing mode */}
            <input type="hidden" name="ticketingMode" value={ticketingMode} />
          </div>
        );

      default:
        return null;
    }
  };

  // Debug logging for formData changes
  useEffect(() => {
    console.log(
      "🔍 FormData.description updated:",
      formData.description.length,
      "chars"
    );
  }, [formData.description]);

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
          <div className="flex justify-end mt-8 space-x-4">
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Go back
            </Button>
            {eventId && <input type="hidden" name="eventId" value={eventId} />}
            {areas.map((area, index) => (
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
            <input type="hidden" name="startTime" value={formData.startTime} />
            <input type="hidden" name="endTime" value={formData.endTime} />
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
            <input type="hidden" name="posterUrl" value={formData.posterUrl} />
            <input type="hidden" name="bannerUrl" value={formData.bannerUrl} />
            <input type="hidden" name="seatCount" value={formData.seatCount} />
            <input
              type="hidden"
              name="ticketPrice"
              value={formData.ticketPrice}
            />
            <Button
              type="submit"
              className="bg-blue-600 text-white"
              disabled={isPending}
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
              // Validate step 1 before proceeding
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
    </div>
  );
}
