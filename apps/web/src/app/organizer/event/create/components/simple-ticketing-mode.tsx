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

  // Check if area is free (price is explicitly set to 0)
  const isAreaFree = (area: Area): boolean => {
    return area.ticketPrice === "0";
  };

  // Handle free event toggle
  const handleFreeToggle = (index: number, isFree: boolean) => {
    setAreas((prev) =>
      prev.map((a, i) =>
        i === index ? { ...a, ticketPrice: isFree ? "0" : "" } : a
      )
    );
  };

  // Validate and handle seat count input
  const handleSeatCountChange = (index: number, value: string) => {
    // Only allow positive numbers
    const numericValue = value.replace(/\D/g, "");

    // Always update the value to allow user to type
    setAreas((prev) =>
      prev.map((a, i) => (i === index ? { ...a, seatCount: numericValue } : a))
    );
  };

  // Validate and handle ticket price input
  const handleTicketPriceChange = (index: number, value: string) => {
    const numericValue = parseVNDPrice(value);

    // Always update the value to allow user to type
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
              placeholder={isAreaFree(area) ? "10-500 seats" : "30-500 seats"}
              value={area.seatCount}
              onChange={(e) => handleSeatCountChange(index, e.target.value)}
              required
              className={`h-9 text-sm ${
                area.seatCount && 
                ((isAreaFree(area) && (parseInt(area.seatCount) < 10 || parseInt(area.seatCount) > 500)) ||
                 (!isAreaFree(area) && (parseInt(area.seatCount) < 30 || parseInt(area.seatCount) > 500)))
                ? "border-red-300" : ""
              }`}
              title={isAreaFree(area) ? "Seat count must be between 10 and 500 for free events" : "Seat count must be between 30 and 500"}
              min={isAreaFree(area) ? "10" : "30"}
              max="500"
            />
            {area.seatCount && (
              (isAreaFree(area) && (parseInt(area.seatCount) < 10 || parseInt(area.seatCount) > 500)) ||
              (!isAreaFree(area) && (parseInt(area.seatCount) < 30 || parseInt(area.seatCount) > 500))
            ) && (
              <p className="text-xs text-red-500 mt-1">
                {isAreaFree(area) 
                  ? "Must be between 10 and 500 seats for free events"
                  : "Must be between 30 and 500 seats"
                }
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
              placeholder={isAreaFree(area) ? "0" : "Min: 10.000"}
              value={isAreaFree(area) ? "0" : formatVNDPrice(area.ticketPrice)}
              onChange={(e) => handleTicketPriceChange(index, e.target.value)}
              disabled={isAreaFree(area)}
              required
              className={`h-9 text-sm ${isAreaFree(area) ? "bg-gray-100 cursor-not-allowed" : ""} ${
                area.ticketPrice && !isAreaFree(area) && parseInt(area.ticketPrice) < 10000 ? "border-red-300" : ""
              }`}
              title={isAreaFree(area) ? "Free event - price is 0 VND" : "Minimum ticket price is 10,000 VND"}
            />
            
            {/* Free Event Checkbox - moved below input */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`area-free-${index}`}
                checked={isAreaFree(area)}
                onChange={(e) => handleFreeToggle(index, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`area-free-${index}`} className="text-sm text-gray-700">
                Free Event (0 VND)
              </label>
            </div>
            
            {/* Validation Messages */}
            {area.ticketPrice && !isAreaFree(area) && parseInt(area.ticketPrice) < 10000 && (
              <p className="text-xs text-red-500 mt-1">
                Minimum price is 10,000 VND
              </p>
            )}
            
            {isAreaFree(area) && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Free event - no charge
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
