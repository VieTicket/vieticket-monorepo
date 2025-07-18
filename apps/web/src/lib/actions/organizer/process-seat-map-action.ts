"use server";

import { getAuthSession } from "@/lib/auth/auth";
import { headers as headersFn } from "next/headers";
import { getSeatMapById } from "@vieticket/services/seat-map";
import { User } from "@vieticket/db/pg/models/users";
import { db } from "@vieticket/db/pg";
import { areas, rows, seats } from "@vieticket/db/pg/schemas/events";
import {
  PolygonShape,
  RowShape,
  SeatShape,
} from "@vieticket/db/mongo/models/seat-map";
import { SeatMapPreviewData } from "@/types/event-types";

export async function previewSeatMapDataAction(
  seatMapId: string
): Promise<{ success: boolean; data?: SeatMapPreviewData; error?: string }> {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to preview seat maps.");
    }

    // Get the seat map from MongoDB
    const seatMapResult = await getSeatMapById(seatMapId);
    if (!seatMapResult) {
      throw new Error("Seat map not found or access denied");
    }

    // Filter polygon shapes that have rows and seats
    const polygonShapes = seatMapResult.shapes.filter(
      (shape): shape is PolygonShape =>
        shape.type === "polygon" &&
        shape.rows !== undefined &&
        shape.rows.length > 0
    ) as PolygonShape[];

    if (polygonShapes.length === 0) {
      throw new Error("No seating areas found in the selected seat map");
    }

    const previewData: SeatMapPreviewData = {
      areas: polygonShapes.map((polygon) => ({
        id: polygon.id,
        name:
          polygon.name || polygon.areaName || `Area ${polygon.id.slice(-5)}`,
        price: polygon.defaultPrice || 0,
        rows: polygon.rows!.map((row) => ({
          id: row.id,
          rowName: row.name,
          seats: row.seats.map((seat) => ({
            id: seat.id,
            seatNumber: seat.number,
            category: seat.category || "standard",
            price: seat.price || polygon.defaultPrice || 0,
          })),
        })),
      })),
    };

    return { success: true, data: previewData };
  } catch (error) {
    console.error("Error previewing seat map:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
