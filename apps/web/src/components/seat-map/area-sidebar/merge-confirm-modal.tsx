import React from "react";
import { Button } from "../../ui/button";
import { RowShape, SeatShape } from "@/types/seat-map-types";

interface MergeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalSelected: number;
  selectionType: "rows" | "seats";
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
  handlers: any;
}

export function MergeConfirmModal({
  isOpen,
  onClose,
  totalSelected,
  selectionType,
  selectedRows,
  selectedSeats,
  handlers,
}: MergeConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirm Merge</h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to merge {totalSelected} {selectionType}?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (selectedRows.length > 0) {
                handlers.handleMergeRows();
              } else {
                handlers.handleMergeSeats();
              }
              onClose();
            }}
            className="flex-1"
          >
            Merge
          </Button>
        </div>
      </div>
    </div>
  );
}