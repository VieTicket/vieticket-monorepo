import { Shape } from "@/types/seat-map-types";

type Point = { x: number; y: number };
type Line = { start: Point; end: Point };

export interface GuideLineResult {
  isCloseToLine: boolean;
  closestPoint: Point;
  type: "horizontal" | "vertical" | "perpendicular" | "shape";
  guideLine?: Line;
}

// Memoization cache for shape lines
let cachedShapeLines: { shapes: Shape[]; lines: Line[] } | null = null;

/**
 * Checks if a point is close to a horizontal or vertical line from another point
 * Optimized for performance
 */
export function isCursorCloseToPerpendicularLine(
  cursorX: number,
  cursorY: number,
  referencePoint: Point,
  threshold: number
): GuideLineResult {
  // Check horizontal alignment (most common first for early return)
  const horizontalDistance = Math.abs(cursorY - referencePoint.y);
  if (horizontalDistance <= threshold) {
    return {
      isCloseToLine: true,
      closestPoint: { x: cursorX, y: referencePoint.y },
      type: "horizontal",
      guideLine: {
        start: {
          x: Math.min(cursorX, referencePoint.x) - 500,
          y: referencePoint.y,
        },
        end: {
          x: Math.max(cursorX, referencePoint.x) + 500,
          y: referencePoint.y,
        },
      },
    };
  }

  // Check vertical alignment
  const verticalDistance = Math.abs(cursorX - referencePoint.x);
  if (verticalDistance <= threshold) {
    return {
      isCloseToLine: true,
      closestPoint: { x: referencePoint.x, y: cursorY },
      type: "vertical",
      guideLine: {
        start: {
          x: referencePoint.x,
          y: Math.min(cursorY, referencePoint.y) - 500,
        },
        end: {
          x: referencePoint.x,
          y: Math.max(cursorY, referencePoint.y) + 500,
        },
      },
    };
  }

  // Only check diagonals if we're within a reasonable distance (optimization)
  const straightDistance = Math.sqrt(
    Math.pow(cursorX - referencePoint.x, 2) +
      Math.pow(cursorY - referencePoint.y, 2)
  );

  if (straightDistance < threshold * 5) {
    // Check 45-degree diagonal alignment
    const diagonalDistance1 = Math.abs(
      cursorY - referencePoint.y - (cursorX - referencePoint.x)
    );

    if (diagonalDistance1 <= threshold) {
      const offset =
        (cursorX - referencePoint.x + cursorY - referencePoint.y) / 2;
      return {
        isCloseToLine: true,
        closestPoint: {
          x: referencePoint.x + offset,
          y: referencePoint.y + offset,
        },
        type: "perpendicular",
        guideLine: {
          start: {
            x: referencePoint.x - 300,
            y: referencePoint.y - 300,
          },
          end: {
            x: referencePoint.x + 300,
            y: referencePoint.y + 300,
          },
        },
      };
    }

    const diagonalDistance2 = Math.abs(
      cursorY - referencePoint.y + (cursorX - referencePoint.x)
    );

    if (diagonalDistance2 <= threshold) {
      const offset =
        (cursorX - referencePoint.x - (cursorY - referencePoint.y)) / 2;
      return {
        isCloseToLine: true,
        closestPoint: {
          x: referencePoint.x + offset,
          y: referencePoint.y - offset,
        },
        type: "perpendicular",
        guideLine: {
          start: {
            x: referencePoint.x - 300,
            y: referencePoint.y + 300,
          },
          end: {
            x: referencePoint.x + 300,
            y: referencePoint.y - 300,
          },
        },
      };
    }
  }

  return {
    isCloseToLine: false,
    closestPoint: { x: cursorX, y: cursorY },
    type: "horizontal",
  };
}

/**
 * Checks if a point is close to an existing line
 * Optimized with early bailout
 */
export function isCursorCloseToLine(
  cursorX: number,
  cursorY: number,
  line: Line,
  threshold: number
): GuideLineResult {
  // Quick bounding box check to avoid expensive calculations
  const minX = Math.min(line.start.x, line.end.x) - threshold;
  const maxX = Math.max(line.start.x, line.end.x) + threshold;
  const minY = Math.min(line.start.y, line.end.y) - threshold;
  const maxY = Math.max(line.start.y, line.end.y) + threshold;

  // Early bailout if cursor is far from line's bounding box
  if (cursorX < minX || cursorX > maxX || cursorY < minY || cursorY > maxY) {
    return {
      isCloseToLine: false,
      closestPoint: { x: cursorX, y: cursorY },
      type: "shape",
    };
  }

  // Vector from line start to end
  const lineVectorX = line.end.x - line.start.x;
  const lineVectorY = line.end.y - line.start.y;

  // Vector from line start to cursor
  const pointVectorX = cursorX - line.start.x;
  const pointVectorY = cursorY - line.start.y;

  // Line length squared (avoid square root for performance)
  const lineLengthSq = lineVectorX * lineVectorX + lineVectorY * lineVectorY;

  // Edge case: zero-length line
  if (lineLengthSq === 0) {
    return {
      isCloseToLine: false,
      closestPoint: { x: cursorX, y: cursorY },
      type: "shape",
    };
  }

  // Calculate projection of point vector onto line vector
  const t =
    (pointVectorX * lineVectorX + pointVectorY * lineVectorY) / lineLengthSq;

  // Clamp t to line segment
  const clampedT = Math.max(0, Math.min(1, t));

  // Get closest point on line
  const closestX = line.start.x + clampedT * lineVectorX;
  const closestY = line.start.y + clampedT * lineVectorY;

  // Calculate distance from cursor to closest point
  const dx = cursorX - closestX;
  const dy = cursorY - closestY;
  const distanceSq = dx * dx + dy * dy;

  // Check if distance is within threshold
  const isClose = Math.sqrt(distanceSq) <= threshold;

  return {
    isCloseToLine: isClose,
    closestPoint: { x: closestX, y: closestY },
    type: "shape",
    guideLine: isClose
      ? {
          start: line.start,
          end: line.end,
        }
      : undefined,
  };
}

/**
 * Extracts lines from existing shapes on the canvas with memoization
 */
export function extractLinesFromShapes(shapes: Shape[]): Line[] {
  // Use cached result if shapes haven't changed
  if (
    cachedShapeLines &&
    cachedShapeLines.shapes === shapes &&
    shapes.length > 0
  ) {
    return cachedShapeLines.lines;
  }

  const lines: Line[] = [];
  const seenShapeIds = new Set<string>();

  shapes.forEach((shape) => {
    // Skip duplicates and null/undefined shapes
    if (!shape || !shape.id || seenShapeIds.has(shape.id)) return;
    seenShapeIds.add(shape.id);

    // Skip preview shapes
    if (shape.id === "preview") return;

    switch (shape.type) {
      case "rect":
        // Only process if we have valid coordinates
        if (
          typeof shape.x !== "number" ||
          typeof shape.y !== "number" ||
          typeof shape.width !== "number" ||
          typeof shape.height !== "number"
        ) {
          return;
        }

        // Rectangle corners
        const x = shape.x;
        const y = shape.y;
        const width = shape.width;
        const height = shape.height;

        // Top line
        lines.push({ start: { x, y }, end: { x: x + width, y } });
        // Right line
        lines.push({
          start: { x: x + width, y },
          end: { x: x + width, y: y + height },
        });
        // Bottom line
        lines.push({
          start: { x, y: y + height },
          end: { x: x + width, y: y + height },
        });
        // Left line
        lines.push({ start: { x, y }, end: { x, y: y + height } });
        break;

      case "polygon":
        if (shape.points && shape.points.length > 1) {
          for (let i = 0; i < shape.points.length; i++) {
            const start = shape.points[i];
            const end = shape.points[(i + 1) % shape.points.length];

            // Skip invalid points
            if (
              !start ||
              !end ||
              typeof start.x !== "number" ||
              typeof start.y !== "number" ||
              typeof end.x !== "number" ||
              typeof end.y !== "number"
            ) {
              continue;
            }

            // Apply shape transform
            const startX = start.x + (shape.x || 0);
            const startY = start.y + (shape.y || 0);
            const endX = end.x + (shape.x || 0);
            const endY = end.y + (shape.y || 0);

            lines.push({
              start: { x: startX, y: startY },
              end: { x: endX, y: endY },
            });
          }
        }
        break;

      case "circle":
        // Only add if we have valid coordinates
        if (
          typeof shape.x !== "number" ||
          typeof shape.y !== "number" ||
          typeof shape.radius !== "number"
        ) {
          return;
        }

        const cx = shape.x;
        const cy = shape.y;
        const r = shape.radius;

        // Add lines for horizontal and vertical tangent to circle
        lines.push({ start: { x: cx - r, y: cy }, end: { x: cx + r, y: cy } });
        lines.push({ start: { x: cx, y: cy - r }, end: { x: cx, y: cy + r } });
        break;
    }
  });

  // Store in cache
  cachedShapeLines = { shapes, lines };

  return lines;
}

// Clear cache when needed (e.g., when shapes array reference changes)
export function clearShapeLinesCache() {
  cachedShapeLines = null;
}
