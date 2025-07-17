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

interface ProcessedSeatMapData {
  areas: {
    name: string;
    price: number;
    rows: {
      rowName: string;
      seats: {
        seatNumber: number;
        category: string;
        price: number;
      }[];
    }[];
  }[];
}

export async function processSeatMapForEventAction(
  seatMapId: string,
  eventId: string
): Promise<{ success: boolean; data?: ProcessedSeatMapData; error?: string }> {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to process seat maps.");
    }

    // Get the seat map from MongoDB
    const seatMapResult = await getSeatMapById(seatMapId, user as User);
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

    const processedData: ProcessedSeatMapData = {
      areas: [],
    };

    // Process each polygon (area) in a transaction
    await db.transaction(async (tx) => {
      for (const polygon of polygonShapes) {
        // Create area in PostgreSQL
        const [createdArea] = await tx
          .insert(areas)
          .values({
            eventId: eventId,
            name:
              polygon.name ||
              polygon.areaName ||
              `Area ${polygon.id.slice(-5)}`,
            price: polygon.defaultPrice || 0,
          })
          .returning();

        const areaData = {
          name: createdArea.name,
          price: Number(createdArea.price),
          rows: [] as any[],
        };

        // Process each row in the polygon
        for (const row of polygon.rows!) {
          // Create row in PostgreSQL
          const [createdRow] = await tx
            .insert(rows)
            .values({
              areaId: createdArea.id,
              rowName: row.name,
            })
            .returning();

          const rowData = {
            rowName: createdRow.rowName,
            seats: [] as any[],
          };

          // Process each seat in the row
          for (const seat of row.seats) {
            // Create seat in PostgreSQL
            await tx.insert(seats).values({
              rowId: createdRow.id,
              seatNumber: seat.number.toString(),
            });

            rowData.seats.push({
              seatNumber: seat.number,
              category: seat.category || "standard",
              price: seat.price || polygon.defaultPrice || 0,
            });
          }

          areaData.rows.push(rowData);
        }

        processedData.areas.push(areaData);
      }
    });

    return { success: true, data: processedData };
  } catch (error) {
    console.error("Error processing seat map:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function previewSeatMapDataAction(
  seatMapId: string
): Promise<{ success: boolean; data?: ProcessedSeatMapData; error?: string }> {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to preview seat maps.");
    }

    // Get the seat map from MongoDB
    const seatMapResult = await getSeatMapById(seatMapId, user as User);
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

    const previewData: ProcessedSeatMapData = {
      areas: polygonShapes.map((polygon) => ({
        name:
          polygon.name || polygon.areaName || `Area ${polygon.id.slice(-5)}`,
        price: polygon.defaultPrice || 0,
        rows: polygon.rows!.map((row) => ({
          rowName: row.name,
          seats: row.seats.map((seat) => ({
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
