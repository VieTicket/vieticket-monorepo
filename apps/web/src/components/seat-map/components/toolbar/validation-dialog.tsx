import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Users,
  MapPin,
  Grid3x3,
  Rows,
} from "lucide-react";

export interface SeatInfo {
  id: string;
  gridId: string;
  gridName: string;
  rowId: string;
  rowName: string;
  seatNumber: string;
}

export interface ValidationIssue {
  id: string;
  type: "overlap" | "spacing" | "alignment" | "naming" | "pricing";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  affectedSeats: SeatInfo[];
  suggestedAction?: string;
}

interface ValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: ValidationIssue[];
  onHighlightIssue: (
    issue: ValidationIssue,
    highlightType: "seats" | "rows" | "grids",
    selectedItems?: string[] // Optional array of specific grid/row IDs to highlight
  ) => void;
}

export const ValidationDialog: React.FC<ValidationDialogProps> = ({
  open,
  onOpenChange,
  issues,
  onHighlightIssue,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(
    null
  );
  const [selectedGrids, setSelectedGrids] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const errorCount = issues.filter(
    (issue) => issue.severity === "error"
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;

  // Calculate total affected seats across all issues
  const totalAffectedSeats = issues.reduce(
    (total, issue) => total + issue.affectedSeats.length,
    0
  );

  const getSeverityColor = (severity: ValidationIssue["severity"]) => {
    switch (severity) {
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getTypeIcon = (type: ValidationIssue["type"]) => {
    switch (type) {
      case "overlap":
        return <Users className="w-4 h-4" />;
      case "spacing":
        return <Settings className="w-4 h-4" />;
      case "alignment":
        return <Settings className="w-4 h-4" />;
      case "naming":
        return <Info className="w-4 h-4" />;
      case "pricing":
        return <Settings className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    if (issues.length > 0 && !selectedIssue) {
      setSelectedIssue(issues[0]);
    }
  }, [issues]);

  // Reset selections when issue changes
  useEffect(() => {
    if (selectedIssue) {
      setSelectedGrids(new Set());
      setSelectedRows(new Set());
    }
  }, [selectedIssue]);

  // Group seats by grid and row for display
  const groupSeatsByLocation = (seats: SeatInfo[]) => {
    const grouped = seats.reduce(
      (acc, seat) => {
        if (!acc[seat.gridId]) {
          acc[seat.gridId] = {
            gridName: seat.gridName,
            rows: {},
          };
        }
        if (!acc[seat.gridId].rows[seat.rowId]) {
          acc[seat.gridId].rows[seat.rowId] = {
            rowName: seat.rowName,
            seats: [],
          };
        }
        acc[seat.gridId].rows[seat.rowId].seats.push(seat);
        return acc;
      },
      {} as Record<
        string,
        {
          gridName: string;
          rows: Record<string, { rowName: string; seats: SeatInfo[] }>;
        }
      >
    );

    return grouped;
  };

  // Get unique grids and rows for the current issue
  const getUniqueGridsAndRows = (issue: ValidationIssue) => {
    const grids = new Map<string, string>();
    const rows = new Map<string, { rowName: string; gridName: string }>();

    issue.affectedSeats.forEach((seat) => {
      grids.set(seat.gridId, seat.gridName);
      rows.set(seat.rowId, { rowName: seat.rowName, gridName: seat.gridName });
    });

    return { grids, rows };
  };

  const handleGridSelection = (gridId: string, checked: boolean) => {
    const newSelectedGrids = new Set(selectedGrids);
    if (checked) {
      newSelectedGrids.add(gridId);
    } else {
      newSelectedGrids.delete(gridId);
    }
    setSelectedGrids(newSelectedGrids);
  };

  const handleRowSelection = (rowId: string, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(rowId);
    } else {
      newSelectedRows.delete(rowId);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleSelectAllGrids = () => {
    if (!selectedIssue) return;
    const { grids } = getUniqueGridsAndRows(selectedIssue);
    setSelectedGrids(new Set(grids.keys()));
  };

  const handleSelectAllRows = () => {
    if (!selectedIssue) return;
    const { rows } = getUniqueGridsAndRows(selectedIssue);
    setSelectedRows(new Set(rows.keys()));
  };

  const handleHighlight = (highlightType: "seats" | "rows" | "grids") => {
    if (!selectedIssue) return;

    let selectedItems: string[] = [];

    switch (highlightType) {
      case "grids":
        selectedItems = Array.from(selectedGrids);
        break;
      case "rows":
        selectedItems = Array.from(selectedRows);
        break;
      case "seats":
        // For seats, we don't need selection - highlight all affected seats
        break;
    }

    onHighlightIssue(
      selectedIssue,
      highlightType,
      selectedItems.length > 0 ? selectedItems : undefined
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {issues.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            Seat Map Validation
          </DialogTitle>
          <DialogDescription>
            {issues.length === 0
              ? "Your seat map looks great! No issues detected."
              : `Found ${issues.length} issue${issues.length > 1 ? "s" : ""} affecting ${totalAffectedSeats} seat${totalAffectedSeats > 1 ? "s" : ""}.`}
          </DialogDescription>
        </DialogHeader>

        {issues.length > 0 && (
          <>
            {/* Issue Summary */}
            <div className="flex gap-3 mb-4">
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {errorCount} Error{errorCount > 1 ? "s" : ""}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-yellow-100 text-yellow-800"
                >
                  {warningCount} Warning{warningCount > 1 ? "s" : ""}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Info className="w-3 h-3" />
                  {infoCount} Info
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 ml-auto">
                <MapPin className="w-3 h-3" />
                {totalAffectedSeats} Affected Seats
              </Badge>
            </div>

            <div className="flex gap-4 flex-1 overflow-hidden">
              {/* Issues List */}
              <div className="w-1/3 border-r pr-4">
                <h4 className="font-medium mb-3">Issues Found</h4>
                <div className="space-y-2 overflow-y-auto max-h-96">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIssue?.id === issue.id
                          ? "bg-blue-50 border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedIssue(issue)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeIcon(issue.type)}
                            <span className="font-medium text-sm">
                              {issue.title}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {issue.description}
                          </p>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {issue.affectedSeats.length} seat
                              {issue.affectedSeats.length > 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issue Details and Selection */}
              <div className="w-2/3 pl-4 flex gap-4">
                {/* Issue Details */}
                <div className="w-1/2">
                  {selectedIssue && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(selectedIssue.type)}
                          <h4 className="font-medium">{selectedIssue.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {selectedIssue.description}
                        </p>
                        <div
                          className={`p-3 rounded-lg border ${getSeverityColor(selectedIssue.severity)}`}
                        >
                          <p className="text-sm mb-2">
                            <strong>Affected Seats:</strong>{" "}
                            {selectedIssue.affectedSeats.length}
                          </p>

                          {/* Detailed seat information */}
                          <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                            {Object.entries(
                              groupSeatsByLocation(selectedIssue.affectedSeats)
                            ).map(([gridId, gridData]) => (
                              <div key={gridId} className="space-y-1">
                                <div className="font-medium text-xs">
                                  {gridData.gridName}:
                                </div>
                                {Object.entries(gridData.rows).map(
                                  ([rowId, rowData]) => (
                                    <div key={rowId} className="ml-2">
                                      <span className="font-medium text-xs">
                                        {rowData.rowName}:
                                      </span>
                                      <span className="ml-1 text-xs">
                                        {rowData.seats
                                          .map((seat) => seat.seatNumber)
                                          .join(", ")}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            ))}
                          </div>

                          {selectedIssue.suggestedAction && (
                            <p className="text-sm mt-2">
                              <strong>Suggestion:</strong>{" "}
                              {selectedIssue.suggestedAction}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Highlight Actions */}
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHighlight("seats")}
                          className="w-full text-xs"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Highlight All Affected Seats
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection Panel */}
                <div className="w-1/2 border-l pl-4">
                  {selectedIssue && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">
                        Choose What to Highlight
                      </h4>

                      {/* Grid Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium flex items-center gap-1">
                            <Grid3x3 className="w-4 h-4" />
                            Grids (
                            {getUniqueGridsAndRows(selectedIssue).grids.size})
                          </h5>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSelectAllGrids}
                              className="text-xs h-6 px-2"
                            >
                              All
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedGrids(new Set())}
                              className="text-xs h-6 px-2"
                            >
                              None
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {Array.from(
                            getUniqueGridsAndRows(selectedIssue).grids.entries()
                          ).map(([gridId, gridName]) => (
                            <div
                              key={gridId}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`grid-${gridId}`}
                                checked={selectedGrids.has(gridId)}
                                onCheckedChange={(checked) =>
                                  handleGridSelection(
                                    gridId,
                                    checked as boolean
                                  )
                                }
                              />
                              <label
                                htmlFor={`grid-${gridId}`}
                                className="text-sm cursor-pointer"
                              >
                                {gridName}
                              </label>
                            </div>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHighlight("grids")}
                          disabled={selectedGrids.size === 0}
                          className="w-full text-xs"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          Highlight Selected Grids ({selectedGrids.size})
                        </Button>
                      </div>

                      <Separator />

                      {/* Row Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium flex items-center gap-1">
                            <Rows className="w-4 h-4" />
                            Rows (
                            {getUniqueGridsAndRows(selectedIssue).rows.size})
                          </h5>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSelectAllRows}
                              className="text-xs h-6 px-2"
                            >
                              All
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRows(new Set())}
                              className="text-xs h-6 px-2"
                            >
                              None
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {Array.from(
                            getUniqueGridsAndRows(selectedIssue).rows.entries()
                          ).map(([rowId, rowData]) => (
                            <div
                              key={rowId}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`row-${rowId}`}
                                checked={selectedRows.has(rowId)}
                                onCheckedChange={(checked) =>
                                  handleRowSelection(rowId, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`row-${rowId}`}
                                className="text-sm cursor-pointer"
                              >
                                {rowData.gridName} - {rowData.rowName}
                              </label>
                            </div>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHighlight("rows")}
                          disabled={selectedRows.size === 0}
                          className="w-full text-xs"
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Highlight Selected Rows ({selectedRows.size})
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {issues.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All Good!
            </h3>
            <p className="text-gray-600">
              Your seat map has been validated and no issues were found.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
