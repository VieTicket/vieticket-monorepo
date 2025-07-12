import React from "react";
import { Card, CardContent } from "../../ui/card";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { RowShape, SeatShape } from "@/types/seat-map-types";

interface SelectionSummaryCardProps {
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
}

export function SelectionSummaryCard({
  selectedRows,
  selectedSeats,
}: SelectionSummaryCardProps) {
  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardContent className="p-4">
        <div className="space-y-2">
          <Label className="text-xs text-gray-400">Selection Summary</Label>
          {selectedRows.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedRows.map((row) => (
                <Badge key={row.id} variant="outline" className="text-xs">
                  {row.name} ({row.seats.length} seats)
                </Badge>
              ))}
            </div>
          )}
          {selectedSeats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedSeats.slice(0, 8).map((seat) => (
                <Badge key={seat.id} variant="outline" className="text-xs">
                  {seat.row}-{seat.number}
                </Badge>
              ))}
              {selectedSeats.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedSeats.length - 8} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}