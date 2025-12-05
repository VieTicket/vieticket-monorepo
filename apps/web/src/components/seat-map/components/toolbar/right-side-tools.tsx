import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move, HelpCircle } from "lucide-react";
import {
  handleZoomIn,
  handleZoomOut,
  handleResetView,
} from "../../events/zoom-events";
import { HelpDialog } from "./help-dialog";

export const RightSideTools: React.FC = () => {
  const [showHelpDialog, setShowHelpDialog] = React.useState(false);

  const handleOpenHelpDialog = () => {
    setShowHelpDialog(true);
  };

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
      <Button
        variant="ghost"
        size="icon"
        title="Help (F1)"
        onClick={handleOpenHelpDialog}
      >
        <HelpCircle className="w-5 h-5" />
      </Button>
      <HelpDialog open={showHelpDialog} onOpenChange={setShowHelpDialog} />
    </div>
  );
};
