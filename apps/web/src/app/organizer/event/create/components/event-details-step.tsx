"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapEditorInput from "@/components/TiptapEditorInput";
import ShowingsManagement from "@/components/create-event/ShowingsManagement";
import type { EventFormData, Area } from "../../../../../types/event-types";
import type { ShowingFormData } from "@/types/showings";
import { useTranslations } from "next-intl";

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
  disableTicketSaleValidation?: boolean;
}

export function EventDetailsStep({
  formData,
  errors,
  areas,
  showings,
  onInputChange,
  onDescriptionChange,
  onShowingsChange,
  disableTicketSaleValidation = false,
}: EventDetailsStepProps) {
  const t = useTranslations("organizer-dashboard.CreateEvent");
  const renderField = (
    name: keyof EventFormData,
    label: string,
    type: string = "text",
    options?: string[]
  ) => {
    // Helper function to get minimum datetime for fields
    const getMinDateTime = (fieldName: string) => {
      if (disableTicketSaleValidation && (fieldName === "ticketSaleStart" || fieldName === "ticketSaleEnd")) {
        return undefined;
      }
      
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
      if (disableTicketSaleValidation && (fieldName === "ticketSaleStart" || fieldName === "ticketSaleEnd")) {
        return undefined;
      }
      
      switch (fieldName) {
        case "ticketSaleStart":
          // Ticket sale start must be at least 3 days before the earliest event showing
          if (showings.length > 0) {
            const earliestShowing = showings
              .filter((s) => s.startTime)
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime()
              )[0];

            if (earliestShowing?.startTime) {
              const eventDate = new Date(earliestShowing.startTime);
              const maxSaleStart = new Date(
                eventDate.getTime() - 3 * 24 * 60 * 60 * 1000
              ); // 3 days before
              return maxSaleStart.toISOString().slice(0, 16);
            }
          }
          return undefined;
        case "ticketSaleEnd":
          // Ticket sale end must be before the earliest event showing
          if (showings.length > 0) {
            const earliestShowing = showings
              .filter((s) => s.startTime)
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime()
              )[0];

            if (earliestShowing?.startTime) {
              const eventDate = new Date(earliestShowing.startTime);
              return eventDate.toISOString().slice(0, 16);
            }
          }
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
      <h2 className="text-xl font-semibold mb-4">{t("eventDetails")}</h2>
      {renderField("name", t("labels.eventTitle"), "text")}
      {renderField("type", t("labels.eventCategory"), "select", [
        t("categories.workshop"),
        t("categories.concert"),
        t("categories.webinar"),
        t("categories.music"),
        t("categories.sports"),
        t("categories.art"),
        t("categories.comedy"),
        t("categories.food"),
        t("categories.conference"),
      ])}

      {/* Showings Management Section */}
      <ShowingsManagement
        showings={showings}
        onShowingsChange={onShowingsChange}
        errors={errors}
      />
      {errors.showings && (
        <p className="text-red-500 text-sm mt-1">{errors.showings}</p>
      )}

      {renderField("location", t("labels.location"))}

      {/* Max Tickets per Order */}
      <div className="space-y-1">
        <Label htmlFor="maxTicketsByOrder">
          {t("labels.maxTicketsPerOrder")}
        </Label>
        <Input
          id="maxTicketsByOrder"
          name="maxTicketsByOrder"
          type="number"
          value={formData.maxTicketsByOrder || ""}
          onChange={(e) => {
            console.log(
              "DEBUG: onChange triggered with value:",
              e.target.value
            );
            onInputChange(e);
          }}
          className={errors.maxTicketsByOrder ? "border-red-500" : ""}
          min="1"
          max="20"
          placeholder={t("placeholders.example5")}
        />
        {errors.maxTicketsByOrder && (
          <p className="text-red-500 text-xs mt-1">
            {errors.maxTicketsByOrder}
          </p>
        )}
        <p className="text-sm text-gray-500">{t("help.maxTicketsPerOrder")}</p>
      </div>

      <TiptapEditorInput
        value={formData.description}
        onChange={onDescriptionChange}
        error={!!errors.description}
        validationError={errors.description}
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
