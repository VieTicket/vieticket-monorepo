"use client";

import { Eye, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PublicSeatMapItem = {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  originalCreator?: string;
  draftedFrom?: string;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
};

interface TemplateCardProps {
  seatMap: PublicSeatMapItem;
  onCreateDraft: (seatMap: PublicSeatMapItem) => void;
  isCreatingDraft: boolean;
  formatDate: (date: string) => string;
}

export function TemplateCard({
  seatMap,
  onCreateDraft,
  isCreatingDraft,
  formatDate,
}: TemplateCardProps) {
  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";
  console.log(seatMap.draftCount, seatMap.draftCount > 0);
  return (
    <div className="overflow-hidden group hover:shadow-lg transition-all border dark:border-gray-800 rounded-lg">
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
        <img
          src={seatMap.image || placeholderImage}
          alt={seatMap.name}
          className="w-full h-full object-cover"
        />
        {/* Draft count badge */}
        {seatMap.draftCount && seatMap.draftCount > 0 ? (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white shadow-sm">
              <Users className="w-3 h-3 mr-1" />
              {seatMap.draftCount}{" "}
              {seatMap.draftCount === 1 ? "draft" : "drafts"}
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="font-medium truncate mb-2">{seatMap.name}</h3>

        {/* Creator info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center justify-between">
            <span>By: {seatMap.originalCreator || seatMap.createdBy}</span>
            {seatMap.draftedFrom && (
              <Badge variant="outline" className="text-xs">
                Derivative
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>Updated: {formatDate(seatMap.updatedAt)}</span>
          {seatMap.draftCount && seatMap.draftCount > 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Popular choice
            </span>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() =>
              window.open(`/seat-map?id=${seatMap.id}&preview=true`, "_blank")
            }
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onCreateDraft(seatMap)}
            disabled={isCreatingDraft}
          >
            <Download className="w-3 h-3 mr-1" />
            {isCreatingDraft ? "Creating..." : "Use Template"}
          </Button>
        </div>
      </div>
    </div>
  );
}
