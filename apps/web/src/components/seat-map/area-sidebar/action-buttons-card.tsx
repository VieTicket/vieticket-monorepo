import React from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Merge, Trash2 } from "lucide-react";
import { RowShape, SeatShape } from "@/types/seat-map-types";

interface ActionButtonsCardProps {
  totalSelected: number;
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
  handlers: any;
  setIsMerging: (value: boolean) => void;
}

export function ActionButtonsCard({
  totalSelected,
  selectedRows,
  selectedSeats,
  handlers,
  setIsMerging,
}: ActionButtonsCardProps) {
  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {/* Merge Button */}
          {totalSelected > 1 && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setIsMerging(true)}
            >
              <Merge className="w-4 h-4 mr-2" />
              Merge
            </Button>
          )}

          {/* Delete Button */}
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={handlers.handleDeleteAll}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}