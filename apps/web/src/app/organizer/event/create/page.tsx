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
export default function CreateEventPage() {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    organizerId: "",
    type: "", // Default to single event
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
        router.push("/"); // redirect về homepage
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

  const renderField = (
    name: keyof typeof formData,
    label: string,
    type: string = "text",
    options?: string[] // <-- danh sách tùy chọn nếu là select
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
            {renderField("slug", "slug", "text")}
            {renderField("organizerId", "organizerId", "text")}
            {renderField("type", "Event Category", "select", [
              "Workshop",
              "Concert",
              "Webinar",
            ])}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                {renderField("startTime", "Start Time", "date")}
                {renderField("endTime", "End Time", "date")}
                {renderField("ticketSaleStart", "Ticket Sale Start", "date")}
                {renderField("ticketSaleEnd", "Ticket Sale End", "date")}
              </div>
            </div>
            {renderField("location", "Where will your event take place?")}
            {/* {formData.location && <LocationMap address={formData.location} />} */}

            <TiptapEditorInput
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              error={!!errors.description}
            />
          </>
        );
      case 2: // Banner Step
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">📸 Ảnh Sự Kiện</h2>
            {renderField("posterUrl", "Poster URL", "text")}
            {renderField("bannerUrl", "Banner URL", "text")}
          </div>
        );
      case 3: // Review Step
        return (
          <div className="bg-white shadow-none rounded-none w-full py-0">
            <PreviewEvent
              data={{
                ...formData,
                organizer: null, // Provide default or fetched organizer info
                areas: [], // Provide an empty array or actual areas if available
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
            <input type="hidden" name="slug" value={formData.slug} />
            <input
              type="hidden"
              name="organizerId"
              value={formData.organizerId}
            />
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
