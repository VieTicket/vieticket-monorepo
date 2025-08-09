import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { PixiShape } from "../types";

interface PropertiesSidebarProps {
  selectedShapes: PixiShape[];
  onShapeUpdate: (id: string, updates: Partial<PixiShape>) => void;
}

export function PropertiesSidebar({
  selectedShapes,
  onShapeUpdate,
}: PropertiesSidebarProps) {
  const [activeTab, setActiveTab] = useState<"style" | "transform" | "text">(
    "style"
  );

  if (selectedShapes.length === 0) {
    return (
      <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 overflow-y-auto border border-gray-700">
        <div className="text-center text-gray-400 py-8">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select shapes to edit properties</p>
        </div>
      </div>
    );
  }

  const isSingleShape = selectedShapes.length === 1;
  const shape = isSingleShape ? selectedShapes[0] : null;

  const handleInputChange = (key: string, value: any) => {
    if (isSingleShape && shape) {
      onShapeUpdate(shape.id, { [key]: value });
    }
  };

  return (
    <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 overflow-y-auto border border-gray-700">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Properties</h3>
        <p className="text-sm text-gray-400">
          {selectedShapes.length} shape{selectedShapes.length > 1 ? "s" : ""}{" "}
          selected
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "style"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("style")}
        >
          Style
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "transform"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("transform")}
        >
          Transform
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "text"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            {activeTab === "style" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-300">Name</Label>
                  <Input
                    value={shape?.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    placeholder="Shape name"
                    disabled={!isSingleShape}
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Fill Color</Label>
                  <Input
                    type="color"
                    value={shape?.fill || "#3b82f6"}
                    onChange={(e) => handleInputChange("fill", e.target.value)}
                    className="mt-1 bg-gray-700 border-gray-600 h-10"
                    disabled={!isSingleShape}
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Stroke Color</Label>
                  <Input
                    type="color"
                    value={shape?.stroke || "#1e40af"}
                    onChange={(e) =>
                      handleInputChange("stroke", e.target.value)
                    }
                    className="mt-1 bg-gray-700 border-gray-600 h-10"
                    disabled={!isSingleShape}
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Stroke Width</Label>
                  <Input
                    type="number"
                    value={shape?.strokeWidth || 2}
                    onChange={(e) =>
                      handleInputChange(
                        "strokeWidth",
                        parseFloat(e.target.value)
                      )
                    }
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    min="0"
                    step="0.5"
                    disabled={!isSingleShape}
                  />
                </div>
              </div>
            )}

            {activeTab === "transform" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm text-gray-300">X Position</Label>
                    <Input
                      type="number"
                      value={shape?.x || 0}
                      onChange={(e) =>
                        handleInputChange("x", parseFloat(e.target.value))
                      }
                      className="mt-1 bg-gray-700 border-gray-600 text-white"
                      disabled={!isSingleShape}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-300">Y Position</Label>
                    <Input
                      type="number"
                      value={shape?.y || 0}
                      onChange={(e) =>
                        handleInputChange("y", parseFloat(e.target.value))
                      }
                      className="mt-1 bg-gray-700 border-gray-600 text-white"
                      disabled={!isSingleShape}
                    />
                  </div>
                </div>

                {shape?.type === "rectangle" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm text-gray-300">Width</Label>
                      <Input
                        type="number"
                        value={shape?.width || 0}
                        onChange={(e) =>
                          handleInputChange("width", parseFloat(e.target.value))
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                        min="1"
                        disabled={!isSingleShape}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Height</Label>
                      <Input
                        type="number"
                        value={shape?.height || 0}
                        onChange={(e) =>
                          handleInputChange(
                            "height",
                            parseFloat(e.target.value)
                          )
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                        min="1"
                        disabled={!isSingleShape}
                      />
                    </div>
                  </div>
                )}

                {shape?.type === "ellipse" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm text-gray-300">Radius X</Label>
                      <Input
                        type="number"
                        value={shape?.radiusX || 0}
                        onChange={(e) =>
                          handleInputChange(
                            "radiusX",
                            parseFloat(e.target.value)
                          )
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                        min="1"
                        disabled={!isSingleShape}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Radius Y</Label>
                      <Input
                        type="number"
                        value={shape?.radiusY || 0}
                        onChange={(e) =>
                          handleInputChange(
                            "radiusY",
                            parseFloat(e.target.value)
                          )
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                        min="1"
                        disabled={!isSingleShape}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-4">
                {shape?.type === "text" ? (
                  <>
                    <div>
                      <Label className="text-sm text-gray-300">
                        Text Content
                      </Label>
                      <Input
                        value={shape?.name || ""}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter text"
                        disabled={!isSingleShape}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Font Size</Label>
                      <Input
                        type="number"
                        defaultValue={24}
                        className="mt-1 bg-gray-700 border-gray-600 text-white"
                        min="8"
                        max="72"
                        disabled={!isSingleShape}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    Text properties are only available for text elements.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!isSingleShape}
            >
              Duplicate
            </Button>
            <Button variant="destructive" size="sm" className="w-full">
              Delete
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
