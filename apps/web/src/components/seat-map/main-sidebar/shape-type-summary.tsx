import React from "react";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";

interface ShapeTypeSummaryProps {
  shapeTypeSummary: [string, number][];
}

export function ShapeTypeSummary({ shapeTypeSummary }: ShapeTypeSummaryProps) {
  return (
    <div className="mt-4">
      <Label className="text-xs text-gray-400">Selected Shapes</Label>
      <div className="flex flex-wrap gap-1 mt-1">
        {shapeTypeSummary.map(([type, count]) => (
          <Badge key={type} variant="outline" className="text-xs text-white">
            {count}x {type === "polygon" ? "area" : type}
          </Badge>
        ))}
      </div>
    </div>
  );
}