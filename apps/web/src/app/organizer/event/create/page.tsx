"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { handleCreateEvent } from "./action";
import { StepProgressBar } from "@/components/create-event/progress-bar";
import TiptapEditorInput from "@/components/TiptapEditorInput";
import { PreviewEvent } from "@/components/create-event/preview";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";
import { slugify } from "@/lib/utils";
import { FileUploader } from "@/components/ui/file-uploader";

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
  const [errors] = useState<Record<string, string>>({});
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await handleCreateEvent(form);
        toast.success("🎉 Event created successfully!");
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
    setFormData((prev) => ({ ...prev, posterUrl: response.secure_url }));
    toast.success("Poster uploaded successfully!");
  };

  // Handle banner upload success
  const handleBannerUpload = (response: any) => {
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
          className={`w-full border rounded px-3 py-2 ${errors[name] ? "border-red-500" : ""
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
                {renderField("ticketSaleStart", "Ticket Sale Start", "datetime-local")}
                {renderField("ticketSaleEnd", "Ticket Sale End", "datetime-local")}
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
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">📸 Event Images</h2>
            
            {/* Poster Upload Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Event Poster
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Recommended: 400x600px or 2:3 ratio)
                </span>
              </Label>
              {formData.posterUrl ? (
                <div className="space-y-3">
                  <div className="relative w-48 h-72 border rounded-lg overflow-hidden">
                    <img
                      src={formData.posterUrl}
                      alt="Event poster preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, posterUrl: "" }))}
                    >
                      Remove Poster
                    </Button>
                  </div>
                </div>
              ) : (
                <FileUploader
                  onUploadSuccess={handlePosterUpload}
                  onUploadError={handleUploadError}
                  folder="event-posters"
                  mode="dropzone"
                  buttonLabel="Upload Poster"
                />
              )}
            </div>

            {/* Banner Upload Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Event Banner
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Recommended: 1200x400px or 3:1 ratio)
                </span>
              </Label>
              {formData.bannerUrl ? (
                <div className="space-y-3">
                  <div className="relative w-full max-w-2xl h-48 border rounded-lg overflow-hidden">
                    <img
                      src={formData.bannerUrl}
                      alt="Event banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, bannerUrl: "" }))}
                    >
                      Remove Banner
                    </Button>
                  </div>
                </div>
              ) : (
                <FileUploader
                  onUploadSuccess={handleBannerUpload}
                  onUploadError={handleUploadError}
                  folder="event-banners"
                  mode="dropzone"
                  buttonLabel="Upload Banner"
                />
              )}
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
      case 4: // Ticketing Step
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Ticketing</h2>
            <div className="space-y-2">
              <Label>What type of event are you running?</Label>
              <div className="flex space-x-4">
                <Button type="button" variant="outline" className="flex-1">
                  Have a SeatMap
                  <br />
                </Button>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Just selling tickets ?</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="seatCount"
                  name="seatCount"
                  type="number"
                  placeholder="Number of ticket"
                  min={1}
                  defaultValue={formData.seatCount}
                  onChange={handleChange}
                />

                <Input
                  id="ticketPrice"
                  name="ticketPrice"
                  type="number"
                  placeholder="0.0 VND"
                  step="10000"
                  min={0}
                  defaultValue={formData.ticketPrice}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Create a New Event</h1>
      <StepProgressBar step={step} />

      <Separator className="mb-6" />
      <form onSubmit={onSubmit} className="space-y-6">
        {renderStep()}

        {step === 4 && (
          <div className="flex justify-end mt-8 space-x-4">
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Go back
            </Button>
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
              {isPending ? "Creating..." : "🎉 Create Event"}
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