"use client";

import React from "react";
import { AlertTriangle, X, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ValidationError } from "../utils/polygon-validation";

interface ValidationNotificationProps {
  errors: ValidationError[];
  onDismiss: () => void;
  onFixArea: (areaId: string) => void;
  onHighlightSeats: (areaId: string, seatIds: string[]) => void;
}

export function ValidationNotification({
  errors,
  onDismiss,
  onFixArea,
  onHighlightSeats,
}: ValidationNotificationProps) {
  if (errors.length === 0) return null;

  const totalSeats = errors.reduce(
    (sum, error) => sum + error.affectedSeats.length,
    0
  );

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md">
      <div className="bg-white border border-orange-200 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-200 p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-orange-900">
                  Validation Issues Found
                </h3>
                <p className="text-sm text-orange-700">
                  {totalSeats} seat(s) outside area boundaries in{" "}
                  {errors.length} area(s)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error List */}
        <div className="max-h-64 overflow-y-auto">
          {errors.map((error, index) => (
            <div
              key={error.areaId}
              className={`p-3 ${index > 0 ? "border-t border-gray-100" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900">
                    {error.areaName}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {error.affectedSeats.length} seats
                  </Badge>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-600 mb-1">
                  Affected seats:
                </div>
                <div className="flex flex-wrap gap-1">
                  {error.affectedSeats.slice(0, 8).map((seat) => (
                    <span
                      key={seat.seatId}
                      className="inline-flex items-center text-xs bg-red-50 text-red-700 px-2 py-1 rounded"
                    >
                      {seat.rowName} #{seat.seatNumber}
                    </span>
                  ))}
                  {error.affectedSeats.length > 8 && (
                    <span className="text-xs text-gray-500">
                      +{error.affectedSeats.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              {/* <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onHighlightSeats(
                      error.areaId,
                      error.affectedSeats.map((s) => s.seatId)
                    )
                  }
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Highlight Seats
                </Button>
                <Button
                  size="sm"
                  onClick={() => onFixArea(error.areaId)}
                  className="text-xs"
                >
                  Fix Area
                </Button>
              </div>*/}
            </div>
          ))}
        </div>

        {/* Footer with global actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          <div className="flex justify-end items-center">
            {/* <span className="text-xs text-gray-600">
              Click "Fix Area" to enter area editing mode
            </span> */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-xs"
            >
              Dismiss All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
