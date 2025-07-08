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
  const [errors] = useState<Record<string, string>>({});
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const [areas, setAreas] = useState([
    { name: "Area A", seatCount: "", ticketPrice: "" },
  ]);

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}{" "}
        {name === "name" || name === "location" || name === "description"
          ? "*"
          : ""}
      </Label>

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
        />
      )}

      {errors[name] && <p className="text-red-500 text-sm">{errors[name]}</p>}
    </div>
  );

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
              onChange={(v) => setFormData({ ...formData, description: v })}
              error={!!errors.description}
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
                    eventName={formData.name}
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
                      eventName={formData.name}
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
              }}
            />
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Ticketing</h2>
            <div className="space-y-4">
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
          </div>
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
          <Button onClick={() => setStep(step + 1)}>Save & Continue</Button>
        </div>
      )}
    </div>
  );
}
