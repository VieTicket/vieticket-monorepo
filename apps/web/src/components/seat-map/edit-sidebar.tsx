"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useCanvasStore } from "./store/main-store";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Palette,
  Move3D,
  RotateCw,
} from "lucide-react";

export default function EditSidebar() {
  const {
    selectedShapeIds,
    shapes,
    updateShape,
    isEditing,
    editingShapeId,
    startEditing,
    stopEditing,
    saveToHistory,
  } = useCanvasStore();

  const [tempValues, setTempValues] = useState<Record<string, any>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedShapes = shapes.filter((shape) =>
    selectedShapeIds.includes(shape.id)
  );

  // Reset temp values when selection changes
  useEffect(() => {
    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      setTempValues({
        id: shape.id,
        type: shape.type,
        x: shape.x ?? 0,
        y: shape.y ?? 0,
        rotation: shape.rotation ?? 0,
        fill: shape.fill ?? "#ffffff",
        stroke: shape.stroke ?? "#000000",
        strokeWidth: shape.strokeWidth ?? 1,
        opacity: shape.opacity ?? 1,
        visible: shape.visible ?? true,
        name: shape.name ?? "",
        // Add shape-specific properties with defaults
        ...(shape.type === "rect" && {
          width: shape.width ?? 100,
          height: shape.height ?? 60,
          cornerRadius: shape.cornerRadius ?? 0,
        }),
        ...(shape.type === "circle" && {
          radius: shape.radius ?? 50,
        }),
        ...(shape.type === "text" && {
          text: shape.text ?? "Text",
          fontSize: shape.fontSize ?? 16,
          width: shape.width ?? 100,
          align: shape.align ?? "left",
        }),
        ...(shape.type === "polygon" && {
          points: shape.points ?? [],
          closed: shape.closed ?? true,
        }),
      });
    } else {
      setTempValues({});
    }
  }, [selectedShapeIds, shapes]);

  const handleStartEdit = (shapeId: string) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (shape) {
      // Set up temp values before starting edit
      setTempValues({
        id: shape.id,
        type: shape.type,
        x: shape.x ?? 0,
        y: shape.y ?? 0,
        rotation: shape.rotation ?? 0,
        fill: shape.fill ?? "#ffffff",
        stroke: shape.stroke ?? "#000000",
        strokeWidth: shape.strokeWidth ?? 1,
        opacity: shape.opacity ?? 1,
        visible: shape.visible ?? true,
        name: shape.name ?? "",
        // Add shape-specific properties with defaults
        ...(shape.type === "rect" && {
          width: shape.width ?? 100,
          height: shape.height ?? 60,
          cornerRadius: shape.cornerRadius ?? 0,
        }),
        ...(shape.type === "circle" && {
          radius: shape.radius ?? 50,
        }),
        ...(shape.type === "text" && {
          text: shape.text ?? "Text",
          fontSize: shape.fontSize ?? 16,
          width: shape.width ?? 100,
          align: shape.align ?? "left",
        }),
        ...(shape.type === "polygon" && {
          points: shape.points ?? [],
          closed: shape.closed ?? true,
        }),
      });
    }
    startEditing(shapeId);
  };

  const createInputHandlers = (shapeId: string, fieldKey: string) => ({
    onClick: (e: React.MouseEvent) => {
      if (!isEditing || editingShapeId !== shapeId) {
        handleStartEdit(shapeId);
      }
      e.stopPropagation();
    },

    onFocus: (e: React.FocusEvent) => {
      if (!isEditing || editingShapeId !== shapeId) {
        handleStartEdit(shapeId);
      }
      e.stopPropagation();
    },

    onBlur: (e: React.FocusEvent) => {
      // Delay to allow other events to process first
      setTimeout(() => {
        if (isEditing && editingShapeId === shapeId) {
          handleSaveEdit();
        }
      }, 100);
      e.stopPropagation();
    },

    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();

        // Blur the input first, then save
        if (e.target instanceof HTMLInputElement) {
          e.target.blur();
        }

        setTimeout(() => {
          if (isEditing && editingShapeId === shapeId) {
            handleSaveEdit();
          }
        }, 0);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        // Blur the input first, then cancel
        if (e.target instanceof HTMLInputElement) {
          e.target.blur();
        }

        setTimeout(() => {
          handleCancelEdit();
        }, 0);
      }
    },

    onChange: (value: any) => {
      const isEditingThis = isEditing && editingShapeId === shapeId;
      if (isEditingThis) {
        handleTempValueChange(fieldKey, value);
      } else {
        handleStartEdit(shapeId);
        setTimeout(() => {
          handleTempValueChange(fieldKey, value);
        }, 0);
      }
    },
  });
  const handleSaveEdit = useCallback(() => {
    if (editingShapeId && tempValues) {
      const shape = shapes.find((s) => s.id === editingShapeId);
      if (shape) {
        const updates: Record<string, any> = {};
        Object.keys(tempValues).forEach((key) => {
          if (
            key !== "id" &&
            key !== "type" &&
            tempValues[key] !== (shape as any)[key]
          ) {
            updates[key] = tempValues[key];
          }
        });

        if (Object.keys(updates).length > 0) {
          updateShape(editingShapeId, updates);
          saveToHistory();
        }
      }
    }

    // Clear any focused input
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
    }

    stopEditing();
  }, [
    editingShapeId,
    tempValues,
    shapes,
    updateShape,
    saveToHistory,
    stopEditing,
  ]);

  const handleCancelEdit = () => {
    stopEditing();
    // Reset temp values to original
    if (editingShapeId) {
      const shape = shapes.find((s) => s.id === editingShapeId);
      if (shape) {
        setTempValues({
          id: shape.id,
          type: shape.type,
          x: shape.x ?? 0,
          y: shape.y ?? 0,
          rotation: shape.rotation ?? 0,
          fill: shape.fill ?? "#ffffff",
          stroke: shape.stroke ?? "#000000",
          strokeWidth: shape.strokeWidth ?? 1,
          opacity: shape.opacity ?? 1,
          visible: shape.visible ?? true,
          name: shape.name ?? "",
          // Reset shape-specific properties
          ...(shape.type === "rect" && {
            width: shape.width ?? 100,
            height: shape.height ?? 60,
            cornerRadius: shape.cornerRadius ?? 0,
          }),
          ...(shape.type === "circle" && {
            radius: shape.radius ?? 50,
          }),
          ...(shape.type === "text" && {
            text: shape.text ?? "Text",
            fontSize: shape.fontSize ?? 16,
            width: shape.width ?? 100,
            align: shape.align ?? "left",
          }),
          ...(shape.type === "polygon" && {
            points: shape.points ?? [],
            closed: shape.closed ?? true,
          }),
        });
      }
    }
  };

  const handleTempValueChange = (key: string, value: any) => {
    setTempValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle immediate updates for non-editing mode
  const handleImmediateUpdate = (shapeId: string, key: string, value: any) => {
    updateShape(shapeId, { [key]: value });
    saveToHistory();
  };

  const handleToggleVisibility = (shapeId: string, visible: boolean) => {
    handleImmediateUpdate(shapeId, "visible", !visible);
  };

  const renderShapeSpecificControls = (shape: any, isEditingThis: boolean) => {
    const getValue = (key: string, defaultValue: any = "") => {
      const value = isEditingThis ? tempValues[key] : shape[key];
      return value !== undefined && value !== null ? value : defaultValue;
    };

    const handlers = createInputHandlers(shape.id, "");

    switch (shape.type) {
      case "rect":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width</Label>
                <Input
                  ref={(el) => {
                    inputRefs.current[`${shape.id}-width`] = el;
                  }}
                  type="number"
                  value={getValue("width", 0)}
                  {...createInputHandlers(shape.id, "width")}
                  onChange={(e) =>
                    createInputHandlers(shape.id, "width").onChange(
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Input
                  ref={(el) => {
                    inputRefs.current[`${shape.id}-height`] = el;
                  }}
                  type="number"
                  value={getValue("height", 0)}
                  {...createInputHandlers(shape.id, "height")}
                  onChange={(e) =>
                    createInputHandlers(shape.id, "height").onChange(
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="h-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Corner Radius</Label>
              <Input
                ref={(el) => {
                  inputRefs.current[`${shape.id}-cornerRadius`] = el;
                }}
                type="number"
                value={getValue("cornerRadius", 0)}
                {...createInputHandlers(shape.id, "cornerRadius")}
                onChange={(e) =>
                  createInputHandlers(shape.id, "cornerRadius").onChange(
                    parseFloat(e.target.value) || 0
                  )
                }
                className="h-8"
              />
            </div>
          </div>
        );

      case "circle":
        return (
          <div>
            <Label className="text-xs">Radius</Label>
            <Input
              ref={(el) => {
                inputRefs.current[`${shape.id}-radius`] = el;
              }}
              type="number"
              value={getValue("radius", 0)}
              {...createInputHandlers(shape.id, "radius")}
              onChange={(e) =>
                createInputHandlers(shape.id, "radius").onChange(
                  parseFloat(e.target.value) || 0
                )
              }
              className="h-8"
            />
          </div>
        );

      case "text":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Text</Label>
              <Input
                ref={(el) => {
                  inputRefs.current[`${shape.id}-text`] = el;
                }}
                value={getValue("text", "")}
                {...createInputHandlers(shape.id, "text")}
                onChange={(e) =>
                  createInputHandlers(shape.id, "text").onChange(e.target.value)
                }
                className="h-8"
                placeholder="Enter text..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Font Size</Label>
                <Input
                  ref={(el) => {
                    inputRefs.current[`${shape.id}-fontSize`] = el;
                  }}
                  type="number"
                  value={getValue("fontSize", 16)}
                  {...createInputHandlers(shape.id, "fontSize")}
                  onChange={(e) =>
                    createInputHandlers(shape.id, "fontSize").onChange(
                      parseFloat(e.target.value) || 16
                    )
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Width</Label>
                <Input
                  ref={(el) => {
                    inputRefs.current[`${shape.id}-width`] = el;
                  }}
                  type="number"
                  value={getValue("width", 100)}
                  {...createInputHandlers(shape.id, "width")}
                  onChange={(e) =>
                    createInputHandlers(shape.id, "width").onChange(
                      parseFloat(e.target.value) || 100
                    )
                  }
                  className="h-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Alignment</Label>
              <Select
                value={getValue("align", "left")}
                onValueChange={(value) => {
                  if (!isEditingThis) {
                    handleStartEdit(shape.id);
                  }
                  setTimeout(() => {
                    handleTempValueChange("align", value);
                    handleSaveEdit();
                  }, 0);
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "polygon":
        return (
          <div>
            <Label className="text-xs">Points (Advanced)</Label>
            <div className="text-xs text-gray-400 mt-1">
              {getValue("points", []).length || 0} points
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Update the basic properties section with reusable handlers
  const renderBasicProperties = (shape: any, isEditingThis: boolean) => {
    const getValue = (key: string, defaultValue: any = "") => {
      const value = isEditingThis ? tempValues[key] : shape[key];
      return value !== undefined && value !== null ? value : defaultValue;
    };

    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs flex items-center gap-1">
            <Move3D className="w-3 h-3" />
            Position
          </Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input
              ref={(el) => {
                inputRefs.current[`${shape.id}-x`] = el;
              }}
              type="number"
              value={getValue("x", 0)}
              {...createInputHandlers(shape.id, "x")}
              onChange={(e) =>
                createInputHandlers(shape.id, "x").onChange(
                  parseFloat(e.target.value) || 0
                )
              }
              className="h-8"
              placeholder="X"
            />
            <Input
              ref={(el) => {
                inputRefs.current[`${shape.id}-y`] = el;
              }}
              type="number"
              value={getValue("y", 0)}
              {...createInputHandlers(shape.id, "y")}
              onChange={(e) =>
                createInputHandlers(shape.id, "y").onChange(
                  parseFloat(e.target.value) || 0
                )
              }
              className="h-8"
              placeholder="Y"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs flex items-center gap-1">
            <RotateCw className="w-3 h-3" />
            Rotation
          </Label>
          <Input
            ref={(el) => {
              inputRefs.current[`${shape.id}-rotation`] = el;
            }}
            type="number"
            value={getValue("rotation", 0)}
            {...createInputHandlers(shape.id, "rotation")}
            onChange={(e) =>
              createInputHandlers(shape.id, "rotation").onChange(
                parseFloat(e.target.value) || 0
              )
            }
            className="h-8"
            placeholder="Degrees"
          />
        </div>

        <div>
          <Label className="text-xs flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Colors
          </Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <Input
                ref={(el) => {
                  inputRefs.current[`${shape.id}-fill`] = el;
                }}
                type="color"
                value={getValue("fill", "#ffffff")}
                {...createInputHandlers(shape.id, "fill")}
                onChange={(e) =>
                  createInputHandlers(shape.id, "fill").onChange(e.target.value)
                }
                className="h-8"
                title="Fill Color"
              />
            </div>
            <div>
              <Input
                ref={(el) => {
                  inputRefs.current[`${shape.id}-stroke`] = el;
                }}
                type="color"
                value={getValue("stroke", "#000000")}
                {...createInputHandlers(shape.id, "stroke")}
                onChange={(e) =>
                  createInputHandlers(shape.id, "stroke").onChange(
                    e.target.value
                  )
                }
                className="h-8"
                title="Stroke Color"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Stroke Width</Label>
          <Input
            ref={(el) => {
              inputRefs.current[`${shape.id}-strokeWidth`] = el;
            }}
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={getValue("strokeWidth", 1)}
            {...createInputHandlers(shape.id, "strokeWidth")}
            onChange={(e) =>
              createInputHandlers(shape.id, "strokeWidth").onChange(
                parseFloat(e.target.value) || 1
              )
            }
            className="h-8"
          />
        </div>

        <div>
          <Label className="text-xs">Opacity</Label>
          <Input
            ref={(el) => {
              inputRefs.current[`${shape.id}-opacity`] = el;
            }}
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={getValue("opacity", 0)}
            {...createInputHandlers(shape.id, "opacity")}
            onChange={(e) =>
              createInputHandlers(shape.id, "opacity").onChange(
                parseFloat(e.target.value) || 1
              )
            }
            className="h-8"
          />
        </div>
      </div>
    );
  };

  // Update the CardContent section
  return (
    <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Properties</h2>
        <Badge variant="secondary" className="text-xs">
          {selectedShapeIds.length} selected
        </Badge>
      </div>

      {selectedShapes.map((shape) => {
        const isEditingThis = isEditing && editingShapeId === shape.id;

        return (
          <Card key={shape.id} className="mb-4 bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm text-gray-200">
                    <Input
                      ref={(el) => {
                        inputRefs.current[`${shape.id}-name`] = el;
                      }}
                      type="text"
                      value={
                        isEditingThis
                          ? (tempValues.name ?? "")
                          : (shape.name ?? "")
                      }
                      {...createInputHandlers(shape.id, "name")}
                      onChange={(e) =>
                        createInputHandlers(shape.id, "name").onChange(
                          e.target.value
                        )
                      }
                      className="h-8 w-full transparent border border-gray-800"
                      placeholder="Shape Name"
                      disabled={!isEditingThis}
                    />
                  </CardTitle>
                </div>

                <div className="flex items-center gap-1 text-gray-200">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleToggleVisibility(shape.id, shape.visible !== false)
                    }
                    className="h-6 w-6 p-0"
                  >
                    {shape.visible !== false ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </Button>

                  {!isEditingThis ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(shape.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveEdit}
                        className="h-6 w-6 p-0 text-green-400"
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="h-6 w-6 p-0 text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-4 space-y-4 text-gray-200">
              <Separator className="bg-gray-700" />

              {/* Basic Properties */}
              {renderBasicProperties(shape, isEditingThis)}

              <Separator className="bg-gray-700" />

              {/* Shape-specific controls */}
              {renderShapeSpecificControls(shape, isEditingThis)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
