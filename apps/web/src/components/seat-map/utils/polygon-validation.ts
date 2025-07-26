import { PolygonShape, SeatShape } from "@/types/seat-map-types";

type Point = {
  x: number;
  y: number;
};

export interface ValidationError {
  type: "seats-outside-area";
  areaId: string;
  areaName: string;
  affectedSeats: {
    seatId: string;
    rowName: string;
    seatNumber: number;
    position: { x: number; y: number };
  }[];
  message: string;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Convert seat coordinates from relative (to area center) to absolute coordinates
 */
export function getSeatAbsolutePosition(
  seat: SeatShape,
  area: PolygonShape
): Point {
  return {
    x: area.center.x + seat.x - area.x,
    y: area.center.y + seat.y - area.y,
  };
}

/**
 * Validate if all seats in a polygon area are within the polygon boundaries
 */
export function validatePolygonSeats(
  area: PolygonShape
): ValidationError | null {
  debugger;
  if (!area.points || area.points.length < 3) {
    return null; // Cannot validate polygon with less than 3 points
  }

  if (!area.rows || area.rows.length === 0) {
    return null; // No rows to validate
  }

  const outsideSeats: ValidationError["affectedSeats"] = [];

  // Check each row and its seats
  area.rows.forEach((row) => {
    if (!row.seats || row.seats.length === 0) return;

    row.seats.forEach((seat) => {
      // Convert seat position from relative to absolute coordinates
      const absolutePosition = getSeatAbsolutePosition(seat, area);

      // Check if seat is inside the polygon
      if (!isPointInPolygon(absolutePosition, area.points)) {
        outsideSeats.push({
          seatId: seat.id,
          rowName: row.name || `Row ${row.id}`,
          seatNumber: seat.number || 0,
          position: absolutePosition,
        });
      }
    });
  });

  // Return validation error if any seats are outside
  if (outsideSeats.length > 0) {
    return {
      type: "seats-outside-area",
      areaId: area.id,
      areaName: area.name || `Area ${area.id}`,
      affectedSeats: outsideSeats,
      message: `${outsideSeats.length} seat(s) in "${area.name || "Unnamed Area"}" are outside the defined area boundaries.`,
    };
  }

  return null;
}

/**
 * Validate all polygon areas in the shapes array
 */
export function validateAllPolygonAreas(shapes: any[]): ValidationError[] {
  const errors: ValidationError[] = [];

  shapes.forEach((shape) => {
    if (shape.type === "polygon") {
      const error = validatePolygonSeats(shape as PolygonShape);
      if (error) {
        errors.push(error);
      }
    }
  });

  return errors;
}

/**
 * Get a summary message for multiple validation errors
 */
export function getValidationSummary(errors: ValidationError[]): string {
  if (errors.length === 0) return "";

  if (errors.length === 1) {
    return errors[0].message;
  }

  const totalSeats = errors.reduce(
    (sum, error) => sum + error.affectedSeats.length,
    0
  );
  const areaNames = errors.map((error) => error.areaName).join(", ");

  return `${totalSeats} seat(s) are outside boundaries in ${errors.length} area(s): ${areaNames}`;
}
