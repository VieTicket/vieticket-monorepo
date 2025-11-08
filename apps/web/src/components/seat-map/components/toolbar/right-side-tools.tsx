import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import {
  handleZoomIn,
  handleZoomOut,
  handleResetView,
} from "../../events/zoom-events";

export const RightSideTools: React.FC = () => {
  return (
    <div className="flex gap-2 items-center">
      <Button
        onClick={handleZoomOut}
        size="sm"
        variant="ghost"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button onClick={handleZoomIn} size="sm" variant="ghost" title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </Button>

      <div className="border-l mx-2 h-6" />

      <Button
        onClick={handleResetView}
        size="sm"
        variant="ghost"
        title="Center Canvas"
      >
        <Move className="w-4 h-4 mr-2" />
        Center
      </Button>
    </div>
  );
};
