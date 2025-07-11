import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/custom-dialog";
import { HelpCircle } from "lucide-react";
import { useKeyMap } from "./hooks/useKeyMap";
import { useAreaMode } from "./store/main-store";

export function HelpModal() {
  // FIX: Get dynamic shortcuts based on current mode
  const { getShortcuts } = useKeyMap();
  const { isInAreaMode } = useAreaMode();
  const shortcuts = getShortcuts();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Help">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Seat Map Editor Help
            {/* FIX: Show current mode in title */}
            {isInAreaMode && (
              <span className="text-blue-500 text-sm ml-2">
                (Currently in Area Mode)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* FIX: Show both tool modes side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Normal Mode Tools */}
            <div
              className={`p-4 rounded-lg border ${!isInAreaMode ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
            >
              <h3 className="font-semibold mb-3 flex items-center">
                Normal Mode Tools
                {!isInAreaMode && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>1:</strong> Select Tool
                </li>
                <li>
                  <strong>2:</strong> Rectangle Tool
                </li>
                <li>
                  <strong>3:</strong> Circle Tool
                </li>
                <li>
                  <strong>4:</strong> Text Tool
                </li>
                <li>
                  <strong>5:</strong> Polygon Tool
                </li>
              </ul>
              <div className="mt-3 text-xs text-gray-600">
                <p>
                  <strong>Usage:</strong>
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    • <strong>Select:</strong> Click to select shapes, drag to
                    move
                  </li>
                  <li>
                    • <strong>Rectangle:</strong> Draw rectangular areas
                  </li>
                  <li>
                    • <strong>Circle:</strong> Draw circular areas
                  </li>
                  <li>
                    • <strong>Polygon:</strong> Draw polygon areas for seating
                  </li>
                  <li>
                    • <strong>Text:</strong> Add text labels
                  </li>
                  <li>
                    • <strong>Double-click polygon:</strong> Enter area mode
                  </li>
                </ul>
              </div>
            </div>

            {/* Area Mode Tools */}
            <div
              className={`p-4 rounded-lg border ${isInAreaMode ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
            >
              <h3 className="font-semibold mb-3 flex items-center">
                Area Mode Tools
                {isInAreaMode && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>1:</strong> Select Tool
                </li>
                <li>
                  <strong>2:</strong> Seat Grid Tool
                </li>
                <li>
                  <strong>3:</strong> Seat Row Tool
                </li>
              </ul>
              <div className="mt-3 text-xs text-gray-600">
                <p>
                  <strong>Usage:</strong>
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    • <strong>Select:</strong> Select rows and seats for editing
                  </li>
                  <li>
                    • <strong>Seat Grid:</strong> Create a grid of seats
                  </li>
                  <li>
                    • <strong>Seat Row:</strong> Create a single row of seats
                  </li>
                  <li>
                    • <strong>Add Row:</strong> Add rows to the area
                  </li>
                  <li>
                    • <strong>Exit area mode:</strong> Click outside or use back
                    button
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* FIX: Use correct property names from shortcuts object */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actions */}
            <div>
              <h3 className="font-semibold mb-3">Actions</h3>
              <ul className="space-y-1 text-sm">
                {shortcuts.actions &&
                  Object.entries(shortcuts.actions).map(
                    ([key, description]) => (
                      <li key={key}>
                        <strong>{key}:</strong> {description}
                      </li>
                    )
                  )}
              </ul>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="font-semibold mb-3">Navigation</h3>
              <ul className="space-y-1 text-sm">
                {shortcuts.navigation &&
                  Object.entries(shortcuts.navigation).map(
                    ([key, description]) => (
                      <li key={key}>
                        <strong>{key}:</strong> {description}
                      </li>
                    )
                  )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Editing */}
            <div>
              <h3 className="font-semibold mb-3">Editing</h3>
              <ul className="space-y-1 text-sm">
                {shortcuts.editing &&
                  Object.entries(shortcuts.editing).map(
                    ([key, description]) => (
                      <li key={key}>
                        <strong>{key}:</strong> {description}
                      </li>
                    )
                  )}
              </ul>
            </div>

            {/* File */}
            <div>
              <h3 className="font-semibold mb-3">File</h3>
              <ul className="space-y-1 text-sm">
                {shortcuts.file &&
                  Object.entries(shortcuts.file).map(([key, description]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {description}
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Mode switching instructions */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">💡 Mode Switching</h4>
            <ul className="text-xs space-y-1">
              <li>
                • <strong>Enter Area Mode:</strong> Double-click on any polygon
                shape
              </li>
              <li>
                • <strong>Exit Area Mode:</strong> Click the back button or
                outside the area
              </li>
              <li>
                • <strong>Tool shortcuts (1-5):</strong> Automatically switch
                based on current mode
              </li>
              <li>
                • <strong>Visual indicator:</strong> Area mode shows light gray
                background
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
