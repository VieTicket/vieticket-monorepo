import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Hexagon,
  Square,
  Circle as CircleIcon,
  Type,
  Layers,
} from "lucide-react";
import { useCanvasStore } from "../store/main-store";
import { Card, CardContent } from "../../ui/card";
import { PolygonShape } from "@/types/seat-map-types";
import { Badge } from "../../ui/badge";

const CanvasInventory = React.memo(function CanvasInventory() {
  const { shapes, selectShape, selectedShapeIds } = useCanvasStore();
  const [expandedPolygons, setExpandedPolygons] = useState<string[]>([]);

  // Memoize the filtered shape lists
  const polygons = useMemo(
    () => shapes.filter((shape) => shape.type === "polygon"),
    [shapes]
  );
  const rects = useMemo(
    () => shapes.filter((shape) => shape.type === "rect"),
    [shapes]
  );
  const circles = useMemo(
    () => shapes.filter((shape) => shape.type === "circle"),
    [shapes]
  );
  const texts = useMemo(
    () => shapes.filter((shape) => shape.type === "text"),
    [shapes]
  );

  const togglePolygonExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPolygons((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  // Calculate seat summary for a polygon
  const getSeatSummary = (polygon: PolygonShape) => {
    if (!polygon.rows) return { total: 0, categories: {} };

    const categories: Record<string, { count: number; price: number }> = {};
    let totalSeats = 0;

    polygon.rows.forEach((row) => {
      row.seats.forEach((seat) => {
        totalSeats++;
        const category = seat.category || "standard";
        const price =
          seat.price || row.seats[0]?.price || polygon.defaultPrice || 0;

        if (!categories[category]) {
          categories[category] = { count: 1, price };
        } else {
          categories[category].count++;
        }
      });
    });

    return { total: totalSeats, categories };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "premium":
        return "bg-amber-500";
      case "accessible":
        return "bg-blue-500";
      case "restricted":
        return "bg-red-500";
      default:
        return "bg-green-500";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <Layers className="w-5 h-5 mr-2" />
          Canvas Elements
        </h2>
      </div>

      {/* Polygon Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <Hexagon className="w-3.5 h-3.5 mr-1.5" />
          <span>Areas ({polygons.length})</span>
        </div>

        {polygons.length > 0 && (
          <div className="space-y-0.5">
            {polygons.map((polygon) => {
              const typedPolygon = polygon as PolygonShape;
              const seatSummary = getSeatSummary(typedPolygon);
              const isExpanded = expandedPolygons.includes(polygon.id);
              const isSelected = selectedShapeIds.includes(polygon.id);

              return (
                <div key={polygon.id} className="text-xs">
                  <div
                    className={`flex items-center py-1.5 px-2 ${
                      isSelected ? "bg-blue-900" : "hover:bg-gray-700"
                    } rounded cursor-pointer`}
                    onClick={() => selectShape(polygon.id)}
                  >
                    <button
                      className="mr-1.5 focus:outline-none"
                      onClick={(e) => togglePolygonExpand(polygon.id, e)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                    <div
                      className="w-2.5 h-2.5 mr-2 rounded-sm"
                      style={{
                        backgroundColor: typedPolygon.fill || "#4a5568",
                      }}
                    ></div>
                    <span className="flex-1 truncate text-white">
                      {typedPolygon.areaName || `Area ${polygon.id.slice(-5)}`}
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-1.5 py-0 h-4 text-white"
                    >
                      {seatSummary.total} seats
                    </Badge>
                  </div>

                  {isExpanded && seatSummary.total > 0 && (
                    <Card className="bg-gray-800 border-gray-700 mx-2 my-1 text-white py-1">
                      <CardContent className="p-2 text-[10px]">
                        <div className="grid grid-cols-1 gap-1">
                          {Object.entries(seatSummary.categories).map(
                            ([category, data]) => (
                              <div
                                key={category}
                                className="flex items-center justify-between py-0.5"
                              >
                                <div className="flex items-center">
                                  <div
                                    className={`w-2 h-2 rounded-full ${getCategoryColor(
                                      category
                                    )} mr-1`}
                                  ></div>
                                  <span className="capitalize">{category}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-400">
                                    {data.count}x{" "}
                                  </span>
                                  <span className="text-gray-300">
                                    ${data.price}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {polygons.length === 0 && (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No areas created
          </div>
        )}
      </div>

      {/* Rectangles Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <Square className="w-3.5 h-3.5 mr-1.5" />
          <span>Rectangles ({rects.length})</span>
        </div>
        {rects.length > 0 && (
          <div className="space-y-0.5">
            {rects.map((rect) => {
              const isSelected = selectedShapeIds.includes(rect.id);
              return (
                <div
                  key={rect.id}
                  className={`flex items-center py-1.5 px-2 ${
                    isSelected ? "bg-blue-900" : "hover:bg-gray-700"
                  } rounded cursor-pointer text-xs`}
                  onClick={() => selectShape(rect.id)}
                >
                  <div
                    className="w-2.5 h-2.5 mr-2 rounded"
                    style={{ backgroundColor: rect.fill || "#ccc" }}
                  ></div>
                  <span className="truncate">
                    {rect.name || `Rect ${rect.id.slice(-5)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {rects.length === 0 && (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No rectangles created
          </div>
        )}
      </div>

      {/* Circles Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <CircleIcon className="w-3.5 h-3.5 mr-1.5" />
          <span>Circles ({circles.length})</span>
        </div>
        {circles.length > 0 && (
          <div className="space-y-0.5">
            {circles.map((circle) => {
              const isSelected = selectedShapeIds.includes(circle.id);
              return (
                <div
                  key={circle.id}
                  className={`flex items-center py-1.5 px-2 ${
                    isSelected ? "bg-blue-900" : "hover:bg-gray-700"
                  } rounded cursor-pointer text-xs`}
                  onClick={() => selectShape(circle.id)}
                >
                  <div
                    className="w-2.5 h-2.5 mr-2 rounded-full"
                    style={{ backgroundColor: circle.fill || "#ccc" }}
                  ></div>
                  <span className="truncate">
                    {circle.name || `Circle ${circle.id.slice(-5)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {circles.length === 0 && (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No circles created
          </div>
        )}
      </div>

      {/* Text Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <Type className="w-3.5 h-3.5 mr-1.5" />
          <span>Text ({texts.length})</span>
        </div>
        {texts.length > 0 && (
          <div className="space-y-0.5">
            {texts.map((text) => {
              const isSelected = selectedShapeIds.includes(text.id);
              return (
                <div
                  key={text.id}
                  className={`flex items-center py-1.5 px-2 ${
                    isSelected ? "bg-blue-900" : "hover:bg-gray-700"
                  } rounded cursor-pointer text-xs`}
                  onClick={() => selectShape(text.id)}
                >
                  <span className="truncate italic">
                    {text.name?.slice(0, 15) || "Empty text"}
                    {(text.name?.length || 0) > 15 ? "..." : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {texts.length === 0 && (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No text elements created
          </div>
        )}
      </div>
    </div>
  );
});

export default CanvasInventory;
