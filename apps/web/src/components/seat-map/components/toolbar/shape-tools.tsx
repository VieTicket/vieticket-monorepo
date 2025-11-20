import React from "react";
import { Button } from "@/components/ui/button";
import { MousePointer, Square, Circle, Type, Hand } from "lucide-react";
import { FaDrawPolygon } from "react-icons/fa";
import { Tool } from "../../types";
import { PiPolygonFill } from "react-icons/pi";

const tools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "pan", icon: Hand, label: "Pan" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
  { id: "polygon", icon: FaDrawPolygon, label: "Polygon" },
  // { id: "freeshape", icon: PiPolygonFill, label: "Free Shape" },
  { id: "text", icon: Type, label: "Text" },
] as const;

interface ShapeToolsProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export const ShapeTools: React.FC<ShapeToolsProps> = ({
  currentTool,
  onToolChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      {tools.map((tool) => {
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
