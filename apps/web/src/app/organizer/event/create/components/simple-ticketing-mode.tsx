"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Area } from "../types";

interface SimpleTicketingModeProps {
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
}

export function SimpleTicketingMode({
  areas,
  setAreas,
}: SimpleTicketingModeProps) {
  return (
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
            <Label htmlFor={`area-seatCount-${index}`}>Seat Count</Label>
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
                    i === index ? { ...a, seatCount: e.target.value } : a
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
                    i === index ? { ...a, ticketPrice: e.target.value } : a
                  )
                )
              }
              required
            />
          </div>

          {/* Remove area button */}
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
      >
        + Add Area
      </Button>
    </div>
  );
}
