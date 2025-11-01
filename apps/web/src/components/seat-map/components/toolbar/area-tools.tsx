import React from "react";
import { Button } from "@/components/ui/button";
import { MousePointer, Hand, Grid3X3 } from "lucide-react";
import { Tool } from "../../types";

const areaTools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "pan", icon: Hand, label: "Pan" },
  { id: "seat-grid", icon: Grid3X3, label: "Seat Grid" },
] as const;

interface AreaToolsProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export const AreaTools: React.FC<AreaToolsProps> = ({
  currentTool,
  onToolChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      {areaTools.map((tool) => {
        const IconComponent = tool.icon;
        return (
          <Button
            key={tool.id}
            variant={currentTool === tool.id ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onToolChange(tool.id as Tool)}
            title={tool.label}
          >
            <IconComponent className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
};
