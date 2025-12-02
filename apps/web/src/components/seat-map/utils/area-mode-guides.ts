import { SeatShape, RowShape, GridShape } from "../types";
import { areaModeContainer } from "../variables";

/**
 * Get all seat snap points in world coordinates
 */
export const getAllSeatSnapPoints = (
  excludeIds: Set<string> = new Set()
): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];

  if (!areaModeContainer) return snapPoints;

  areaModeContainer.children.forEach((grid) => {
    if (excludeIds.has(grid.id)) return;

    grid.children.forEach((row) => {
      if (excludeIds.has(row.id)) return;

      row.children.forEach((seat) => {
        if (excludeIds.has(seat.id)) return;

        // Calculate world coordinates
        const seatWorldX = grid.x + row.x + seat.x;
        const seatWorldY = grid.y + row.y + seat.y;

        // Add seat center
        snapPoints.push({ x: seatWorldX, y: seatWorldY });

        // Add seat edges
        snapPoints.push(
          { x: seatWorldX - seat.radiusX, y: seatWorldY }, // Left
          { x: seatWorldX + seat.radiusX, y: seatWorldY }, // Right
          { x: seatWorldX, y: seatWorldY - seat.radiusY }, // Top
          { x: seatWorldX, y: seatWorldY + seat.radiusY } // Bottom
        );
      });
    });
  });

  return snapPoints;
};

/**
 * Get all row snap points in world coordinates
 */
export const getAllRowSnapPoints = (
  excludeIds: Set<string> = new Set()
): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];

  if (!areaModeContainer) return snapPoints;

  areaModeContainer.children.forEach((grid) => {
    if (excludeIds.has(grid.id)) return;

    grid.children.forEach((row) => {
      if (excludeIds.has(row.id)) return;

      // Calculate world coordinates
      const rowWorldX = grid.x + row.x;
      const rowWorldY = grid.y + row.y;

      // Add row center
      snapPoints.push({ x: rowWorldX, y: rowWorldY });

      // Add row bounds based on seats
      if (row.children.length > 0) {
        const seats = row.children;
        const leftmostSeat = seats.reduce((min, seat) =>
          seat.x < min.x ? seat : min
        );
        const rightmostSeat = seats.reduce((max, seat) =>
          seat.x > max.x ? seat : max
        );
        const topmostSeat = seats.reduce((min, seat) =>
          seat.y < min.y ? seat : min
        );
        const bottommostSeat = seats.reduce((max, seat) =>
          seat.y > max.y ? seat : max
        );

        // Add row edge points
        snapPoints.push(
          {
            x: rowWorldX + leftmostSeat.x - leftmostSeat.radiusX,
            y: rowWorldY,
          }, // Left edge
          {
            x: rowWorldX + rightmostSeat.x + rightmostSeat.radiusX,
            y: rowWorldY,
          }, // Right edge
          { x: rowWorldX, y: rowWorldY + topmostSeat.y - topmostSeat.radiusY }, // Top edge
          {
            x: rowWorldX,
            y: rowWorldY + bottommostSeat.y + bottommostSeat.radiusY,
          } // Bottom edge
        );
      }
    });
  });

  return snapPoints;
};

/**
 * Get all grid snap points in world coordinates
 */
export const getAllGridSnapPoints = (
  excludeIds: Set<string> = new Set()
): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];

  if (!areaModeContainer) return snapPoints;

  areaModeContainer.children.forEach((grid) => {
    if (excludeIds.has(grid.id)) return;

    // Add grid center
    snapPoints.push({ x: grid.x, y: grid.y });

    // Calculate grid bounds
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    let hasContent = false;

    grid.children.forEach((row) => {
      row.children.forEach((seat) => {
        const seatWorldX = grid.x + row.x + seat.x;
        const seatWorldY = grid.y + row.y + seat.y;

        minX = Math.min(minX, seatWorldX - seat.radiusX);
        maxX = Math.max(maxX, seatWorldX + seat.radiusX);
        minY = Math.min(minY, seatWorldY - seat.radiusY);
        maxY = Math.max(maxY, seatWorldY + seat.radiusY);
        hasContent = true;
      });
    });

    // Add grid corner and edge points
    if (hasContent) {
      snapPoints.push(
        { x: minX, y: minY }, // Top-left
        { x: maxX, y: minY }, // Top-right
        { x: minX, y: maxY }, // Bottom-left
        { x: maxX, y: maxY }, // Bottom-right
        { x: (minX + maxX) / 2, y: minY }, // Top-center
        { x: (minX + maxX) / 2, y: maxY }, // Bottom-center
        { x: minX, y: (minY + maxY) / 2 }, // Left-center
        { x: maxX, y: (minY + maxY) / 2 } // Right-center
      );
    }
  });

  return snapPoints;
};

/**
 * Get row alignment guides (horizontal lines through all row Y positions)
 */
export const getRowAlignmentGuides = (
  excludeIds: Set<string> = new Set()
): Array<{ y: number }> => {
  const guides: Array<{ y: number }> = [];
  const yPositions = new Set<number>();

  if (!areaModeContainer) return guides;

  areaModeContainer.children.forEach((grid) => {
    if (excludeIds.has(grid.id)) return;

    grid.children.forEach((row) => {
      if (excludeIds.has(row.id)) return;

      const rowWorldY = grid.y + row.y;
      yPositions.add(rowWorldY);
    });
  });

  Array.from(yPositions).forEach((y) => {
    guides.push({ y });
  });

  return guides;
};

/**
 * Get seat alignment guides (horizontal and vertical lines through seat positions)
 */
export const getSeatAlignmentGuides = (
  excludeIds: Set<string> = new Set()
): {
  horizontal: Array<{ y: number }>;
  vertical: Array<{ x: number }>;
} => {
  const horizontal: Array<{ y: number }> = [];
  const vertical: Array<{ x: number }> = [];
  const yPositions = new Set<number>();
  const xPositions = new Set<number>();

  if (!areaModeContainer) return { horizontal, vertical };

  areaModeContainer.children.forEach((grid) => {
    if (excludeIds.has(grid.id)) return;

    grid.children.forEach((row) => {
      if (excludeIds.has(row.id)) return;

      row.children.forEach((seat) => {
        if (excludeIds.has(seat.id)) return;

        const seatWorldX = grid.x + row.x + seat.x;
        const seatWorldY = grid.y + row.y + seat.y;

        xPositions.add(seatWorldX);
        yPositions.add(seatWorldY);
      });
    });
  });

  Array.from(yPositions).forEach((y) => {
    horizontal.push({ y });
  });

  Array.from(xPositions).forEach((x) => {
    vertical.push({ x });
  });

  return { horizontal, vertical };
};
