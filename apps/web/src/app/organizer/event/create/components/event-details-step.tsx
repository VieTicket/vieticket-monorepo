"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorInput from "@/components/TiptapEditorInput";
import ShowingsManagement from "@/components/create-event/ShowingsManagement";
import type { EventFormData, Area } from "../../../../../types/event-types";
import type { ShowingFormData } from "@/types/showings";

interface EventDetailsStepProps {
  formData: EventFormData;
  errors: Record<string, string>;
  areas: Area[];
  showings: ShowingFormData[];
  onInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onDescriptionChange: (value: string) => void;
  onShowingsChange: (showings: ShowingFormData[]) => void;
}

export function EventDetailsStep({
  formData,
  errors,
  areas,
  showings,
  onInputChange,
  onDescriptionChange,
  onShowingsChange,
}: EventDetailsStepProps) {
  const renderField = (
    name: keyof EventFormData,
    label: string,
    type: string = "text",
    options?: string[]
  ) => {
    // Helper function to get minimum datetime for fields
    const getMinDateTime = (fieldName: string) => {
      const now = new Date();
      const currentDateTime = now.toISOString().slice(0, 16);

      switch (fieldName) {
        case "ticketSaleStart":
          return currentDateTime;
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
          // No max limit for ticket sale dates now that event times are in showings
          return undefined;
        default:
          return undefined;
      }
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={name}>
            {label}{" "}
            {name === "name" || name === "location" || name === "description"
              ? "*"
              : ""}
          </Label>
        </div>

        {type === "select" && options ? (
          <select
            id={name}
            name={name}
            value={formData[name]}
            onChange={onInputChange}
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
            onChange={onInputChange}
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

      {/* Showings Management Section */}
      <ShowingsManagement
        showings={showings}
        onShowingsChange={onShowingsChange}
        errors={errors}
      />

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          {renderField(
            "ticketSaleStart",
            "Ticket Sale Start",
            "datetime-local"
          )}
          {renderField("ticketSaleEnd", "Ticket Sale End", "datetime-local")}
        </div>
      </div>
      {renderField("location", "Where will your event take place?")}

      <TiptapEditorInput
        value={formData.description}
        onChange={onDescriptionChange}
        error={!!errors.description}
        eventData={{
          name: formData.name,
          type: formData.type,
          startTime:
            showings.length > 0
              ? showings[0].startTime
              : formData.ticketSaleStart,
          endTime:
            showings.length > 0
              ? showings[showings.length - 1].endTime
              : formData.ticketSaleEnd,
          location: formData.location,
          ticketSaleStart: formData.ticketSaleStart,
          ticketSaleEnd: formData.ticketSaleEnd,
          ticketPrice: formData.ticketPrice,
        }}
      />
    </>
  );
}
