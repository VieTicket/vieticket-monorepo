"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Clock } from "lucide-react";
import { ShowingFormData } from "@/types/showings";

interface ShowingsManagementProps {
  showings: ShowingFormData[];
  onShowingsChange: (showings: ShowingFormData[]) => void;
  errors: Record<string, string>;
}

export default function ShowingsManagement({
  showings,
  onShowingsChange,
  errors,
}: ShowingsManagementProps) {
  const t = useTranslations("organizer-dashboard.CreateEvent");
  const addShowing = () => {
    const newShowing: ShowingFormData = {
      name: t("showings.defaultName", { n: showings.length + 1 }),
      startTime: "",
      endTime: "",
      ticketSaleStart: "",
      ticketSaleEnd: "",
    };
    onShowingsChange([...showings, newShowing]);
  };

  const removeShowing = (index: number) => {
    if (showings.length <= 1) return; // Keep at least one showing
    const updated = showings.filter((_, i) => i !== index);
    onShowingsChange(updated);
  };

  const updateShowing = (
    index: number,
    field: keyof ShowingFormData,
    value: string
  ) => {
    const updated = showings.map((showing, i) =>
      i === index ? { ...showing, [field]: value } : showing
    );
    onShowingsChange(updated);
  };

  const validateDateTime = (index: number, field: string, value: string) => {
    const now = new Date();
    const inputDate = new Date(value);
    const showing = showings[index];

    let error = "";

    if (field === "startTime") {
      if (inputDate < now) {
        error = t("errors.startTimePast");
      }
    } else if (field === "endTime") {
      if (inputDate < now) {
        error = t("errors.endTimePast");
      } else if (
        showing.startTime &&
        inputDate <= new Date(showing.startTime)
      ) {
        error = t("errors.endTimeBeforeStart");
      }
    } else if (field === "ticketSaleStart") {
      if (inputDate < now) {
        error = t("errors.ticketSaleStartPast");
      } else if (
        showing.startTime &&
        inputDate >= new Date(showing.startTime)
      ) {
        error = t("errors.ticketSaleStartBeforeShowing");
      }
    } else if (field === "ticketSaleEnd") {
      if (inputDate < now) {
        error = t("errors.ticketSaleEndPast");
      } else if (
        showing.ticketSaleStart &&
        inputDate <= new Date(showing.ticketSaleStart)
      ) {
        error = t("errors.ticketSaleEndAfterStart");
      } else if (
        showing.startTime &&
        inputDate >= new Date(showing.startTime)
      ) {
        error = t("errors.ticketSaleEndBeforeShowing");
      }
    }

    return error;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("showings.title")}
          </h3>
          <p className="text-sm text-gray-600">{t("showings.description")}</p>
        </div>
        <Button
          type="button"
          onClick={addShowing}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("showings.add")}
        </Button>
      </div>

      <div className="space-y-4">
        {showings.map((showing, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-gray-50 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {t("showings.showing", { n: index + 1 })}
              </h4>
              {showings.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeShowing(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Showing Name */}
              <div>
                <Label htmlFor={`showing-name-${index}`}>
                  {t("labels.showingName")}
                </Label>
                <Input
                  id={`showing-name-${index}`}
                  value={showing.name}
                  onChange={(e) => updateShowing(index, "name", e.target.value)}
                  placeholder={t("placeholders.showingExample")}
                />
              </div>

              {/* Start Time */}
              <div>
                <Label htmlFor={`showing-start-${index}`}>
                  {t("labels.startTime")}
                </Label>
                <Input
                  id={`showing-start-${index}`}
                  type="datetime-local"
                  value={showing.startTime}
                  onChange={(e) =>
                    updateShowing(index, "startTime", e.target.value)
                  }
                  className={
                    errors[`showing-${index}-startTime`] ? "border-red-500" : ""
                  }
                />
                {errors[`showing-${index}-startTime`] && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors[`showing-${index}-startTime`]}
                  </p>
                )}
              </div>

              {/* End Time */}
              <div>
                <Label htmlFor={`showing-end-${index}`}>
                  {t("labels.endTime")}
                </Label>
                <Input
                  id={`showing-end-${index}`}
                  type="datetime-local"
                  value={showing.endTime}
                  onChange={(e) =>
                    updateShowing(index, "endTime", e.target.value)
                  }
                  className={
                    errors[`showing-${index}-endTime`] ? "border-red-500" : ""
                  }
                />
                {errors[`showing-${index}-endTime`] && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors[`showing-${index}-endTime`]}
                  </p>
                )}
              </div>
            </div>

            {/* Ticket Sale Times Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Ticket Sale Start */}
              <div>
                <Label htmlFor={`showing-ticket-start-${index}`}>
                  {t("labels.ticketSaleStart")}
                </Label>
                <Input
                  id={`showing-ticket-start-${index}`}
                  type="datetime-local"
                  value={showing.ticketSaleStart || ""}
                  onChange={(e) =>
                    updateShowing(index, "ticketSaleStart", e.target.value)
                  }
                  className={
                    errors[`showing-${index}-ticketSaleStart`]
                      ? "border-red-500"
                      : ""
                  }
                />
                {errors[`showing-${index}-ticketSaleStart`] && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors[`showing-${index}-ticketSaleStart`]}
                  </p>
                )}
              </div>

              {/* Ticket Sale End */}
              <div>
                <Label htmlFor={`showing-ticket-end-${index}`}>
                  {t("labels.ticketSaleEnd")}
                </Label>
                <Input
                  id={`showing-ticket-end-${index}`}
                  type="datetime-local"
                  value={showing.ticketSaleEnd || ""}
                  onChange={(e) =>
                    updateShowing(index, "ticketSaleEnd", e.target.value)
                  }
                  className={
                    errors[`showing-${index}-ticketSaleEnd`]
                      ? "border-red-500"
                      : ""
                  }
                />
                {errors[`showing-${index}-ticketSaleEnd`] && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors[`showing-${index}-ticketSaleEnd`]}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
