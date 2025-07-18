"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorInput from "@/components/TiptapEditorInput";
import type { EventFormData, Area } from "../../../../../types/event-types";

interface EventDetailsStepProps {
  formData: EventFormData;
  errors: Record<string, string>;
  areas: Area[];
  onInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onDescriptionChange: (value: string) => void;
}

export function EventDetailsStep({
  formData,
  errors,
  areas,
  onInputChange,
  onDescriptionChange,
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
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          {renderField("startTime", "Start Time", "datetime-local")}
          {renderField("endTime", "End Time", "datetime-local")}
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
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location,
          ticketSaleStart: formData.ticketSaleStart,
          ticketSaleEnd: formData.ticketSaleEnd,
          ticketPrice: areas[0]?.ticketPrice || "",
        }}
      />
    </>
  );
}
