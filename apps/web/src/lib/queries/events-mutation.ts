import { db } from "../db";
import { eq, sql } from "drizzle-orm";

import {
  events,
  NewEvent,
  areas,
  rows,
  seats,
  showings,
} from "@vieticket/db/pg/schema";

// ========================================
// EVENT MUTATIONS
// ========================================

export async function createEvent(event: NewEvent) {
  return db.insert(events).values(event).returning();
}

export async function getEventsById(eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      areas: {
        with: {
          rows: {
            with: {
              seats: true,
            },
          },
        },
      },
      showings: true,
    },
  });

  return event ? [event] : [];
}

export async function updateEventById(
  eventId: string,
  data: Partial<typeof events.$inferInsert>
) {
  return db.update(events).set(data).where(eq(events.id, eventId)).returning();
}

export async function incrementEventView(eventId: string) {
  return db
    .update(events)
    .set({
      views: sql`${events.views} + 1`,
    })
    .where(eq(events.id, eventId));
}

export async function getEventsByOrganizerId(organizerId: string) {
  return db.select().from(events).where(eq(events.organizerId, organizerId));
}

// ========================================
// SHOWING MUTATIONS
// ========================================

export async function createShowing(showing: {
  eventId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  seatMapId?: string | null;
}) {
  return db.insert(showings).values(showing).returning();
}

export async function getShowingsByEventId(eventId: string) {
  return db.select().from(showings).where(eq(showings.eventId, eventId));
}

export async function deleteShowingsByEventId(eventId: string) {
  return db.delete(showings).where(eq(showings.eventId, eventId));
}

export async function getShowingById(showingId: string) {
  return db.query.showings.findFirst({
    where: eq(showings.id, showingId),
    with: {
      event: true,
      areas: {
        with: {
          rows: {
            with: {
              seats: true,
            },
          },
        },
      },
    },
  });
}

// ========================================
// AREA MUTATIONS
// ========================================

export async function createArea(area: {
  eventId: string;
  name: string;
  price: number;
  showingId?: string;
}) {
  return db.insert(areas).values(area).returning();
}

export async function createAreaWithId(area: {
  id: string;
  eventId: string;
  name: string;
  price: number;
  showingId?: string;
}) {
  return db
    .insert(areas)
    .values({
      id: area.id,
      eventId: area.eventId,
      showingId: area.showingId,
      name: area.name,
      price: area.price,
    })
    .returning();
}

export async function getAreasByEventId(eventId: string) {
  return db.select().from(areas).where(eq(areas.eventId, eventId));
}

export async function getAreasByShowingId(showingId: string) {
  return db.select().from(areas).where(eq(areas.showingId, showingId));
}

export async function updateAreaById(
  areaId: string,
  data: Partial<typeof areas.$inferInsert>
) {
  return db.update(areas).set(data).where(eq(areas.id, areaId)).returning();
}

export async function deleteAreasByEventId(eventId: string) {
  return db.delete(areas).where(eq(areas.eventId, eventId));
}

export async function deleteAreasByShowingId(showingId: string) {
  return db.delete(areas).where(eq(areas.showingId, showingId));
}

export async function deleteAreaById(areaId: string) {
  return db.delete(areas).where(eq(areas.id, areaId));
}

// ========================================
// ROW MUTATIONS
// ========================================

export async function createRow(row: { areaId: string; rowName: string }) {
  return db.insert(rows).values(row).returning();
}

export async function createRowWithId(row: {
  id: string;
  areaId: string;
  rowName: string;
}) {
  return db
    .insert(rows)
    .values({
      id: row.id,
      areaId: row.areaId,
      rowName: row.rowName,
    })
    .returning();
}

export async function getRowsByAreaId(areaId: string) {
  return db.select().from(rows).where(eq(rows.areaId, areaId));
}

export async function updateRowById(
  rowId: string,
  data: Partial<typeof rows.$inferInsert>
) {
  return db.update(rows).set(data).where(eq(rows.id, rowId)).returning();
}

export async function deleteRowsByAreaId(areaId: string) {
  return db.delete(rows).where(eq(rows.areaId, areaId));
}

export async function deleteRowById(rowId: string) {
  return db.delete(rows).where(eq(rows.id, rowId));
}

// ========================================
// SEAT MUTATIONS
// ========================================

export async function createSeats(
  seatsData: {
    rowId: string;
    seatNumber: string;
  }[]
) {
  if (seatsData.length === 0) return;
  return db.insert(seats).values(seatsData);
}

export async function createSeatsWithIds(
  seatsData: {
    id: string;
    rowId: string;
    seatNumber: string;
  }[]
) {
  if (seatsData.length === 0) return;
  return db.insert(seats).values(seatsData);
}

export async function getSeatsByRowId(rowId: string) {
  return db.select().from(seats).where(eq(seats.rowId, rowId));
}

export async function updateSeatById(
  seatId: string,
  data: Partial<typeof seats.$inferInsert>
) {
  return db.update(seats).set(data).where(eq(seats.id, seatId)).returning();
}

export async function deleteSeatsByRowId(rowId: string) {
  return db.delete(seats).where(eq(seats.rowId, rowId));
}

export async function deleteSeatById(seatId: string) {
  return db.delete(seats).where(eq(seats.id, seatId));
}

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * Delete all areas, rows, and seats for an event
 * Used when recreating event structure
 */
export async function deleteAllEventStructure(eventId: string) {
  await db.transaction(async (tx) => {
    // Delete in correct order due to foreign key constraints
    await tx.delete(areas).where(eq(areas.eventId, eventId));
    await tx.delete(showings).where(eq(showings.eventId, eventId));
  });
}

/**
 * Delete all areas, rows, and seats for a showing
 * Used when recreating showing structure
 */
export async function deleteAllShowingStructure(showingId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(areas).where(eq(areas.showingId, showingId));
  });
}

// ========================================
// QUERY HELPERS
// ========================================

/**
 * Get complete event structure with all relationships
 */
export async function getCompleteEventById(eventId: string) {
  return db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      showings: {
        with: {
          areas: {
            with: {
              rows: {
                with: {
                  seats: true,
                },
              },
            },
          },
        },
      },
      areas: {
        with: {
          rows: {
            with: {
              seats: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get complete showing structure with all relationships
 */
export async function getCompleteShowingById(showingId: string) {
  return db.query.showings.findFirst({
    where: eq(showings.id, showingId),
    with: {
      event: true,
      areas: {
        with: {
          rows: {
            with: {
              seats: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get event statistics
 */
export async function getEventStatistics(eventId: string) {
  const event = await getCompleteEventById(eventId);

  if (!event) return null;

  const statistics = {
    totalShowings: event.showings?.length || 0,
    totalAreas: 0,
    totalRows: 0,
    totalSeats: 0,
    totalRevenue: 0,
  };

  // Calculate from showings if they exist
  if (event.showings && event.showings.length > 0) {
    for (const showing of event.showings) {
      if (showing.areas) {
        statistics.totalAreas += showing.areas.length;
        for (const area of showing.areas) {
          if (area.rows) {
            statistics.totalRows += area.rows.length;
            for (const row of area.rows) {
              if (row.seats) {
                const seatCount = row.seats.length;
                statistics.totalSeats += seatCount;
                statistics.totalRevenue += seatCount * (area.price || 0);
              }
            }
          }
        }
      }
    }
  } else if (event.areas) {
    // Fallback to event-level areas (legacy)
    statistics.totalAreas = event.areas.length;
    for (const area of event.areas) {
      if (area.rows) {
        statistics.totalRows += area.rows.length;
        for (const row of area.rows) {
          if (row.seats) {
            const seatCount = row.seats.length;
            statistics.totalSeats += seatCount;
            statistics.totalRevenue += seatCount * (area.price || 0);
          }
        }
      }
    }
  }

  return statistics;
}

/**
 * Get showing statistics
 */
export async function getShowingStatistics(showingId: string) {
  const showing = await getCompleteShowingById(showingId);

  if (!showing) return null;

  const statistics = {
    totalAreas: 0,
    totalRows: 0,
    totalSeats: 0,
    totalRevenue: 0,
  };

  if (showing.areas) {
    statistics.totalAreas = showing.areas.length;
    for (const area of showing.areas) {
      if (area.rows) {
        statistics.totalRows += area.rows.length;
        for (const row of area.rows) {
          if (row.seats) {
            const seatCount = row.seats.length;
            statistics.totalSeats += seatCount;
            statistics.totalRevenue += seatCount * (area.price || 0);
          }
        }
      }
    }
  }

  return statistics;
}
