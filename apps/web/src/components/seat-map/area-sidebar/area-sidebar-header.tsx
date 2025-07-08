import React from "react";
import { Badge } from "../../ui/badge";

interface AreaSidebarHeaderProps {
  isInAreaMode: boolean;
  totalSelected: number;
  selectionType: "rows" | "seats";
}

export function AreaSidebarHeader({
  isInAreaMode,
  totalSelected,
  selectionType,
}: AreaSidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Area Editor</h2>
      <Badge variant="secondary" className="text-xs">
        {totalSelected > 0 ? `${totalSelected} ${selectionType}` : "No selection"}
      </Badge>
    </div>
  );
}