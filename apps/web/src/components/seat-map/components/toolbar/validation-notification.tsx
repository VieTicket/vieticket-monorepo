import React, { useState, useEffect } from "react";
import { ValidationDialog, ValidationIssue } from "./validation-dialog";
import { useSeatMapStore } from "../../store/seat-map-store";
import { areaModeContainer } from "../../variables";
import { getSelectionTransform } from "../../events/transform-events";
import { updateGridSettings } from "../../shapes/grid-shape";
import { updateSeatLabelNumberingInRow } from "../../shapes/row-shape";
import { toast } from "sonner";
import { validateGrid, validateSeatMap } from "../utils/seat-validation";

// Bottom corner notification component
const ValidationNotification: React.FC<{
  affectedSeatsCount: number;
  issuesCount: number;
  onShowDialog: () => void;
  onDismiss: () => void;
}> = ({ affectedSeatsCount, issuesCount, onShowDialog, onDismiss }) => {
  if (affectedSeatsCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white rounded-lg shadow-lg border border-yellow-200 p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-yellow-600 font-bold text-sm">
              {affectedSeatsCount}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            Validation Issues Found
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {affectedSeatsCount} seat{affectedSeatsCount > 1 ? "s" : ""}{" "}
            affected by {issuesCount} issue{issuesCount > 1 ? "s" : ""} that may
            need attention.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onShowDialog}
              className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
            >
              View Details
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const ValidationManager: React.FC = () => {
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    []
  );
  const [showDialog, setShowDialog] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const shapes = useSeatMapStore((state) => state.shapes);

  // Calculate total affected seats
  const totalAffectedSeats = validationIssues.reduce(
    (total, issue) => total + issue.affectedSeats.length,
    0
  );

  // Listen for shape changes to trigger validation
  useEffect(() => {
    // Debounce validation to avoid excessive checks
    const timeoutId = setTimeout(() => {
      if (areaModeContainer && areaModeContainer.children.length > 0) {
        const issues = validateSeatMap();
        setValidationIssues(issues);

        // Show notification if there are new issues
        if (issues.length > 0 && !showNotification) {
          setShowNotification(true);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [shapes, showNotification]);

  // Function to validate a specific grid after creation
  const validateNewGrid = (gridId: string) => {
    const gridIssues = validateGrid(gridId);

    if (gridIssues.length > 0) {
      setValidationIssues(gridIssues);
      setShowNotification(true);

      // Calculate affected seats for this grid
      const affectedSeatsCount = gridIssues.reduce(
        (total, issue) => total + issue.affectedSeats.length,
        0
      );

      // Show a toast notification
      toast.warning(
        `Found ${gridIssues.length} issue${gridIssues.length > 1 ? "s" : ""} affecting ${affectedSeatsCount} seat${affectedSeatsCount > 1 ? "s" : ""} in the new seating grid`,
        {
          action: {
            label: "View Details",
            onClick: () => setShowDialog(true),
          },
          duration: 5000,
        }
      );
    }
  };

  // Expose validation function globally
  useEffect(() => {
    (window as any).__validateNewGrid = validateNewGrid;
    return () => {
      delete (window as any).__validateNewGrid;
    };
  }, []);

  const handleHighlightIssue = (
    issue: ValidationIssue,
    highlightType: "seats" | "rows" | "grids"
  ) => {
    if (!areaModeContainer) return;

    let shapesToSelect: any[] = [];

    switch (highlightType) {
      case "seats":
        // Find and select affected seats
        issue.affectedSeats.forEach((seatInfo) => {
          for (const grid of areaModeContainer!.children) {
            for (const row of grid.children) {
              const seat = row.children.find((s) => s.id === seatInfo.id);
              if (seat) {
                shapesToSelect.push(seat);
              }
            }
          }
        });
        break;

      case "rows":
        // Select entire rows that contain affected seats
        const affectedRowIds = new Set(issue.affectedSeats.map((s) => s.rowId));
        affectedRowIds.forEach((rowId) => {
          for (const grid of areaModeContainer!.children) {
            const row = grid.children.find((r) => r.id === rowId);
            if (row) {
              shapesToSelect.push(row);
              // Also add all seats in the row for visual feedback
              shapesToSelect.push(...row.children);
            }
          }
        });
        break;

      case "grids":
        // Select entire grids that contain affected seats
        const affectedGridIds = new Set(
          issue.affectedSeats.map((s) => s.gridId)
        );
        affectedGridIds.forEach((gridId) => {
          const grid = areaModeContainer!.children.find((g) => g.id === gridId);
          if (grid) {
            shapesToSelect.push(grid);
            // Also add all rows and seats for visual feedback
            grid.children.forEach((row) => {
              shapesToSelect.push(row);
              shapesToSelect.push(...row.children);
            });
          }
        });
        break;
    }

    if (shapesToSelect.length > 0) {
      // Select the shapes
      useSeatMapStore.getState().setSelectedShapes(shapesToSelect);

      // Update selection transform
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(shapesToSelect);
      }

      // Create detailed feedback message
      const highlightTypeText = {
        seats: "seats",
        rows: "rows and their seats",
        grids: "grids and all their contents",
      }[highlightType];

      toast.info(
        `Highlighted ${shapesToSelect.length} items (${highlightTypeText})`,
        {
          description: `Showing ${highlightType} affected by: ${issue.title}`,
        }
      );
    }
  };

  return (
    <>
      {/* Bottom corner notification */}
      <ValidationNotification
        affectedSeatsCount={totalAffectedSeats}
        issuesCount={validationIssues.length}
        onShowDialog={() => setShowDialog(true)}
        onDismiss={() => {
          setShowNotification(false);
          setValidationIssues([]);
        }}
      />

      {/* Validation dialog */}
      <ValidationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        issues={validationIssues}
        onHighlightIssue={handleHighlightIssue}
      />
    </>
  );
};
