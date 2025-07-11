import React from "react";
import { Badge } from "../../ui/badge";

interface MainSidebarHeaderProps {
  selectedCount: number;
  isSingleShape: boolean;
}

export function MainSidebarHeader({
  selectedCount,
  isSingleShape,
}: MainSidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">
        {isSingleShape
          ? "Edit Shape"
          : selectedCount > 1
            ? "Batch Edit"
            : "Properties"}
      </h2>
      <Badge variant="secondary" className="text-xs">
        {selectedCount} selected
      </Badge>
    </div>
  );
}
