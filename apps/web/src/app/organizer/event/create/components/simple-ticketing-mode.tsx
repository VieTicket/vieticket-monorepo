"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Area } from "../../../../../types/event-types";

interface SimpleTicketingModeProps {
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
}

export function SimpleTicketingMode({
  areas,
  setAreas,
}: SimpleTicketingModeProps) {
  // Format number with dots for VND currency
  const formatVNDPrice = (value: string): string => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, "");

    // If empty, return empty string
    if (!numericValue) return "";

    // Format with dots as thousand separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Parse formatted VND price back to number
  const parseVNDPrice = (formattedValue: string): string => {
    return formattedValue.replace(/\./g, "");
  };

  // Validate and handle seat count input
  const handleSeatCountChange = (index: number, value: string) => {
    // Only allow positive numbers
    const numericValue = value.replace(/\D/g, "");
    const parsedValue = parseInt(numericValue);

    // Don't allow 0 or negative numbers
    if (numericValue === "" || parsedValue <= 0) {
      setAreas((prev) =>
        prev.map((a, i) => (i === index ? { ...a, seatCount: "" } : a))
      );
      return;
    }

    setAreas((prev) =>
      prev.map((a, i) => (i === index ? { ...a, seatCount: numericValue } : a))
    );
  };

  // Validate and handle ticket price input
  const handleTicketPriceChange = (index: number, value: string) => {
    const numericValue = parseVNDPrice(value);
    const parsedValue = parseInt(numericValue);

    // Don't allow negative numbers
    if (numericValue === "" || parsedValue < 0) {
      setAreas((prev) =>
        prev.map((a, i) => (i === index ? { ...a, ticketPrice: "" } : a))
      );
      return;
    }

    // Store the raw numeric value but display formatted
    setAreas((prev) =>
      prev.map((a, i) =>
        i === index ? { ...a, ticketPrice: numericValue } : a
      )
    );
  };
  return (
    <div className="space-y-4 sm:space-y-6">
      <h3 className="text-base sm:text-lg font-medium">Ticket Areas</h3>
      {areas.map((area, index) => (
        <div
          key={index}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start border p-3 sm:p-4 pb-6 sm:pb-8 rounded-lg relative"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`area-name-${index}`} className="text-sm font-medium">Area Name</Label>
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
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`area-seatCount-${index}`} className="text-sm font-medium">Seat Count</Label>
            <Input
              id={`area-seatCount-${index}`}
              type="text"
              name={`areas[${index}][seatCount]`}
              placeholder="e.g. 100"
              value={area.seatCount}
              onChange={(e) => handleSeatCountChange(index, e.target.value)}
              required
              className={`h-9 text-sm ${!area.seatCount ? "border-red-300" : ""}`}
              title={
                !area.seatCount
                  ? "Seat count is required and must be greater than 0"
                  : ""
              }
            />
            {!area.seatCount && (
              <p className="text-xs text-red-500 mt-1">
                Required, must be &gt; 0
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`area-ticketPrice-${index}`} className="text-sm font-medium">
              Ticket Price (VND)
            </Label>
            <Input
              id={`area-ticketPrice-${index}`}
              type="text"
              name={`areas[${index}][ticketPrice]`}
              placeholder="e.g. 50.000"
              value={formatVNDPrice(area.ticketPrice)}
              onChange={(e) => handleTicketPriceChange(index, e.target.value)}
              required
              className={`h-9 text-sm ${!area.ticketPrice ? "border-red-300" : ""}`}
              title={
                !area.ticketPrice
                  ? "Ticket price is required and must be greater than or equal to 0"
                  : ""
              }
            />
            {!area.ticketPrice && (
              <p className="text-xs text-red-500 mt-1">
                Required, must be ≥ 0
              </p>
            )}
          </div>

          {/* Remove area button */}
          {areas.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setAreas((prev) => prev.filter((_, i) => i !== index))
              }
              className="absolute top-2 right-2 text-red-500 text-xs sm:text-sm hover:bg-red-50 rounded p-1"
            >
              🗑 Remove
            </button>
          )}
        </div>
      ))}

      {/* Add new area button */}
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
        className="w-full sm:w-auto"
      >
        + Add Area
      </Button>
    </div>
  );
}
