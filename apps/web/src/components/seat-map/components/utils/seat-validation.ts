import { GridShape, RowShape, SeatShape } from "../../types";
import { areaModeContainer } from "../../variables";
import { SeatInfo, ValidationIssue } from "../toolbar/validation-dialog";

interface SeatPosition extends SeatInfo {
  seat: SeatShape;
  worldX: number;
  worldY: number;
}

/**
 * Create SeatInfo from seat, row, and grid
 */
const createSeatInfo = (
  seat: SeatShape,
  row: RowShape,
  grid: GridShape
): SeatInfo => {
  return {
    id: seat.id,
    gridId: grid.id,
    gridName: grid.gridName || `Grid ${grid.id}`,
    rowId: row.id,
    rowName: row.rowName || `Row ${row.id}`,
    seatNumber: seat.name || `Seat ${seat.id}`,
  };
};

/**
 * Calculate world position of a seat considering all parent transformations
 */
const calculateSeatWorldPosition = (
  seat: SeatShape,
  row: RowShape,
  grid: GridShape
): { worldX: number; worldY: number } => {
  // Start with seat position relative to row
  let x = seat.x;
  let y = seat.y;

  // Apply row transformation
  const rowCos = Math.cos(row.rotation || 0);
  const rowSin = Math.sin(row.rotation || 0);

  const rotatedX = x * rowCos - y * rowSin;
  const rotatedY = x * rowSin + y * rowCos;

  x = rotatedX + row.x;
  y = rotatedY + row.y;

  // Apply grid transformation
  const gridCos = Math.cos(grid.rotation || 0);
  const gridSin = Math.sin(grid.rotation || 0);

  const finalRotatedX = x * gridCos - y * gridSin;
  const finalRotatedY = x * gridSin + y * gridCos;

  return {
    worldX: finalRotatedX + grid.x,
    worldY: finalRotatedY + grid.y,
  };
};

/**
 * Get all seat positions with their world coordinates and detailed info
 */
const getAllSeatPositions = (): SeatPosition[] => {
  if (!areaModeContainer) return [];

  const positions: SeatPosition[] = [];

  areaModeContainer.children.forEach((grid) => {
    grid.children.forEach((row) => {
      row.children.forEach((seat) => {
        const { worldX, worldY } = calculateSeatWorldPosition(seat, row, grid);
        const seatInfo = createSeatInfo(seat, row, grid);

        positions.push({
          ...seatInfo,
          seat,
          worldX,
          worldY,
        });
      });
    });
  });

  return positions;
};

/**
 * Check for overlapping seats
 */
const checkSeatOverlaps = (): ValidationIssue[] => {
  const positions = getAllSeatPositions();
  const issues: ValidationIssue[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < positions.length; i++) {
    const pos1 = positions[i];

    for (let j = i + 1; j < positions.length; j++) {
      const pos2 = positions[j];

      // Create a unique pair identifier
      const pairId = [pos1.seat.id, pos2.seat.id].sort().join("-");
      if (processedPairs.has(pairId)) continue;
      processedPairs.add(pairId);

      // Calculate distance between seat centers
      const dx = pos1.worldX - pos2.worldX;
      const dy = pos1.worldY - pos2.worldY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Get seat radii (assuming circular seats)
      const radius1 = pos1.seat.radiusX;
      const radius2 = pos2.seat.radiusX;
      const minDistance = radius1 + radius2;

      // Check if seats overlap
      if (distance < minDistance) {
        const overlapAmount = minDistance - distance;
        const overlapPercentage = (overlapAmount / minDistance) * 100;

        let severity: ValidationIssue["severity"] = "warning";
        let title = "Seats are very close";
        let description = `Seats ${pos1.seatNumber} (${pos1.gridName} - ${pos1.rowName}) and ${pos2.seatNumber} (${pos2.gridName} - ${pos2.rowName}) are positioned very close (${overlapPercentage.toFixed(1)}% overlap).`;

        if (overlapPercentage > 50) {
          severity = "error";
          title = "Seats are overlapping significantly";
          description = `Seats ${pos1.seatNumber} (${pos1.gridName} - ${pos1.rowName}) and ${pos2.seatNumber} (${pos2.gridName} - ${pos2.rowName}) are severely overlapping (${overlapPercentage.toFixed(1)}% overlap).`;
        } else if (overlapPercentage > 25) {
          severity = "warning";
          title = "Seats are overlapping";
          description = `Seats ${pos1.seatNumber} (${pos1.gridName} - ${pos1.rowName}) and ${pos2.seatNumber} (${pos2.gridName} - ${pos2.rowName}) are overlapping (${overlapPercentage.toFixed(1)}% overlap).`;
        }

        issues.push({
          id: `overlap-${pos1.seat.id}-${pos2.seat.id}`,
          type: "overlap",
          severity,
          title,
          description,
          affectedSeats: [
            { ...pos1, seat: undefined } as SeatInfo,
            { ...pos2, seat: undefined } as SeatInfo,
          ],
          suggestedAction:
            "Increase spacing between seats or adjust seat size to prevent overlap.",
        });
      }
    }
  }

  return issues;
};

/**
 * Check for inconsistent spacing within rows
 */
const checkRowSpacing = (): ValidationIssue[] => {
  if (!areaModeContainer) return [];

  const issues: ValidationIssue[] = [];

  areaModeContainer.children.forEach((grid) => {
    grid.children.forEach((row) => {
      if (row.children.length < 2) return;

      // Sort seats by X position
      const sortedSeats = [...row.children].sort((a, b) => a.x - b.x);
      const spacings: number[] = [];

      // Calculate spacings between consecutive seats
      for (let i = 1; i < sortedSeats.length; i++) {
        const spacing = sortedSeats[i].x - sortedSeats[i - 1].x;
        spacings.push(spacing);
      }

      // Check for inconsistent spacing
      const avgSpacing =
        spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
      const tolerance = avgSpacing * 0.15; // 15% tolerance

      const inconsistentSeats: SeatInfo[] = [];
      spacings.forEach((spacing, index) => {
        if (Math.abs(spacing - avgSpacing) > tolerance) {
          inconsistentSeats.push(createSeatInfo(sortedSeats[index], row, grid));
          inconsistentSeats.push(
            createSeatInfo(sortedSeats[index + 1], row, grid)
          );
        }
      });

      if (inconsistentSeats.length > 0) {
        // Remove duplicates
        const uniqueSeats = inconsistentSeats.filter(
          (seat, index, arr) => arr.findIndex((s) => s.id === seat.id) === index
        );

        issues.push({
          id: `spacing-${row.id}`,
          type: "spacing",
          severity: "warning",
          title: `Inconsistent spacing in ${row.rowName || `Row ${row.id}`}`,
          description: `Some seats in ${grid.gridName || `Grid ${grid.id}`} - ${row.rowName || `Row ${row.id}`} have irregular spacing that may look unprofessional.`,
          affectedSeats: uniqueSeats,
          suggestedAction:
            "Use the alignment tools to ensure consistent spacing between seats.",
        });
      }
    });
  });

  return issues;
};

/**
 * Check for missing seat numbering or duplicates
 */
const checkSeatNumbering = (): ValidationIssue[] => {
  if (!areaModeContainer) return [];

  const issues: ValidationIssue[] = [];

  areaModeContainer.children.forEach((grid) => {
    grid.children.forEach((row) => {
      const seatNumbers = row.children.map((seat) => seat.name);
      const duplicates = seatNumbers.filter(
        (num, index) => seatNumbers.indexOf(num) !== index
      );

      if (duplicates.length > 0) {
        const affectedSeats = row.children
          .filter((seat) => duplicates.includes(seat.name))
          .map((seat) => createSeatInfo(seat, row, grid));

        issues.push({
          id: `numbering-${row.id}`,
          type: "naming",
          severity: "warning",
          title: `Duplicate seat numbers in ${row.rowName || `Row ${row.id}`}`,
          description: `Multiple seats in ${grid.gridName || `Grid ${grid.id}`} - ${row.rowName || `Row ${row.id}`} have the same number, which will confuse customers.`,
          affectedSeats,
          suggestedAction:
            "Renumber seats to ensure each seat has a unique identifier within the row.",
        });
      }

      // Check for empty or invalid seat names
      const invalidSeats = row.children.filter(
        (seat) => !seat.name || seat.name.trim() === ""
      );
      if (invalidSeats.length > 0) {
        const affectedSeats = invalidSeats.map((seat) =>
          createSeatInfo(seat, row, grid)
        );

        issues.push({
          id: `naming-empty-${row.id}`,
          type: "naming",
          severity: "info",
          title: `Unnamed seats in ${row.rowName || `Row ${row.id}`}`,
          description: `Some seats in ${grid.gridName || `Grid ${grid.id}`} - ${row.rowName || `Row ${row.id}`} don't have labels, which may confuse customers.`,
          affectedSeats,
          suggestedAction:
            "Add seat numbers or labels to help customers identify their seats.",
        });
      }
    });
  });

  return issues;
};

/**
 * Check for pricing inconsistencies
 */
const checkPricingConsistency = (): ValidationIssue[] => {
  if (!areaModeContainer) return [];

  const issues: ValidationIssue[] = [];

  // Check for zero or negative prices
  areaModeContainer.children.forEach((grid) => {
    if (grid.seatSettings.price <= 0) {
      const affectedSeats = grid.children.flatMap((row) =>
        row.children.map((seat) => createSeatInfo(seat, row, grid))
      );

      issues.push({
        id: `pricing-${grid.id}`,
        type: "pricing",
        severity: "warning",
        title: `No price set for ${grid.gridName || `Grid ${grid.id}`}`,
        description: `The seating area "${grid.gridName || `Grid ${grid.id}`}" has no price configured, which may cause issues during ticket sales.`,
        affectedSeats,
        suggestedAction:
          "Set a valid price for this seating area in the properties panel.",
      });
    }
  });

  return issues;
};

/**
 * Main validation function
 */
export const validateSeatMap = (): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  // Run all validation checks
  issues.push(...checkSeatOverlaps());
  issues.push(...checkRowSpacing());
  issues.push(...checkSeatNumbering());
  issues.push(...checkPricingConsistency());

  // Sort by severity (errors first, then warnings, then info)
  const severityOrder = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return issues;
};

/**
 * Validate specific grid after creation
 */
export const validateGrid = (gridId: string): ValidationIssue[] => {
  if (!areaModeContainer) return [];

  const grid = areaModeContainer.children.find((g) => g.id === gridId);
  if (!grid) return [];

  // Run validation only for this grid
  const allIssues = validateSeatMap();

  // Filter issues that affect this grid
  return allIssues.filter((issue) =>
    issue.affectedSeats.some((seatInfo) => seatInfo.gridId === gridId)
  );
};
