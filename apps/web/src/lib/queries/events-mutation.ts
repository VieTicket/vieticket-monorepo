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
import { GridShape } from "@vieticket/db/mongo/models/seat-map";
import { SeatGridSettings } from "@/types/event-types";

export async function createEvent(event: NewEvent) {
  return db.insert(events).values(event).returning();
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

export async function getEventsById(eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      organizer: true,
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

export async function deleteEvent(eventId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM seats 
      WHERE row_id IN (
        SELECT r.id FROM rows r
        JOIN areas a ON r.area_id = a.id
        WHERE a.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM rows 
      WHERE area_id IN (
        SELECT id FROM areas WHERE event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM areas WHERE event_id = ${eventId}
    `);

    await tx.execute(sql`
      DELETE FROM showings WHERE event_id = ${eventId}
    `);

    const [deletedEvent] = await tx
      .delete(events)
      .where(eq(events.id, eventId))
      .returning();

    return deletedEvent;
  });
}

export async function createShowing(showing: {
  eventId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  ticketSaleStart?: Date | null;
  ticketSaleEnd?: Date | null;
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

// Add these batch insert functions after the existing functions

/**
 * Batch insert areas with IDs
 */
export async function createAreasWithIdsBatch(
  areasData: {
    id: string;
    eventId: string;
    showingId: string;
    name: string;
    price: number;
  }[]
) {
  if (areasData.length === 0) return;

  const areaInsertSql = sql`
    INSERT INTO areas (id, event_id, showing_id, name, price, created_at, updated_at)
    VALUES ${sql.join(
      areasData.map(
        (area) =>
          sql`(${area.id}, ${area.eventId}, ${area.showingId}, ${area.name}, ${area.price}, NOW(), NOW())`
      ),
      sql`, `
    )}
  `;

  return db.execute(areaInsertSql);
}

/**
 * Batch insert rows with IDs
 */
export async function createRowsWithIdsBatch(
  rowsData: {
    id: string;
    areaId: string;
    rowName: string;
  }[]
) {
  if (rowsData.length === 0) return;

  const rowInsertSql = sql`
    INSERT INTO rows (id, area_id, row_name, created_at, updated_at)
    VALUES ${sql.join(
      rowsData.map(
        (row) => sql`(${row.id}, ${row.areaId}, ${row.rowName}, NOW(), NOW())`
      ),
      sql`, `
    )}
  `;

  return db.execute(rowInsertSql);
}

/**
 * Batch insert seats with IDs (optimized for large batches)
 */
export async function createSeatsWithIdsBatch(
  seatsData: {
    id: string;
    rowId: string;
    seatNumber: string;
  }[]
) {
  if (seatsData.length === 0) return;

  // Split into smaller batches to avoid SQL parameter limits
  const batchSize = 1000;
  const batches = [];

  for (let i = 0; i < seatsData.length; i += batchSize) {
    batches.push(seatsData.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const seatInsertSql = sql`
      INSERT INTO seats (id, row_id, seat_number, created_at, updated_at)
      VALUES ${sql.join(
        batch.map(
          (seat) =>
            sql`(${seat.id}, ${seat.rowId}, ${seat.seatNumber}, NOW(), NOW())`
        ),
        sql`, `
      )}
    `;

    await db.execute(seatInsertSql);
  }
}

/**
 * Batch create complete seat map structure for a showing
 */
export async function createSeatMapStructureBatch(
  eventId: string,
  showingId: string,
  grids: GridShape[],
  defaultSeatSettings: SeatGridSettings
) {
  const areasData = [];
  const rowsData = [];
  const seatsData = [];

  for (const grid of grids) {
    const gridPrice =
      grid.seatSettings?.price || defaultSeatSettings?.price || 0;

    // Prepare area data
    areasData.push({
      id: grid.id,
      eventId,
      showingId,
      name: grid.gridName || grid.name || `Grid ${grid.id}`,
      price: gridPrice,
    });

    // Prepare rows and seats data
    for (const row of grid.children) {
      rowsData.push({
        id: row.id,
        areaId: grid.id,
        rowName: row.rowName || row.name || `Row ${row.id}`,
      });

      // Prepare seats data for this row
      for (const seat of row.children) {
        seatsData.push({
          id: seat.id,
          rowId: row.id,
          seatNumber: seat.name || `${seat.id}`,
        });
      }
    }
  }

  // Execute batch inserts in order
  await createAreasWithIdsBatch(areasData);
  await createRowsWithIdsBatch(rowsData);
  await createSeatsWithIdsBatch(seatsData);
}

export async function deleteSeatsByRowId(rowId: string) {
  return db.delete(seats).where(eq(seats.rowId, rowId));
}

export async function deleteSeatById(seatId: string) {
  return db.delete(seats).where(eq(seats.id, seatId));
}

export async function deleteAllEventStructure(eventId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(areas).where(eq(areas.eventId, eventId));
    await tx.delete(showings).where(eq(showings.eventId, eventId));
  });
}

export async function deleteAllShowingStructure(showingId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(areas).where(eq(areas.showingId, showingId));
  });
}

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

export async function deleteAllShowingDataForEvent(eventId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM seats 
      WHERE row_id IN (
        SELECT r.id FROM rows r
        JOIN areas a ON r.area_id = a.id
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM rows 
      WHERE area_id IN (
        SELECT a.id FROM areas a
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM areas 
      WHERE showing_id IN (
        SELECT id FROM showings WHERE event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM showings WHERE event_id = ${eventId}
    `);
  });
}

export async function createEventWithShowingsOptimized(
  eventPayload: NewEvent,
  showingsData: Array<{
    showing: {
      name: string;
      startTime: Date;
      endTime: Date;
      ticketSaleStart?: Date | null;
      ticketSaleEnd?: Date | null;
      seatMapId?: string;
    };
    areas: Array<{
      name: string;
      seatCount: number;
      ticketPrice: number;
    }>;
  }>
) {
  return db.transaction(async (tx) => {
    const [createdEvent] = await tx
      .insert(events)
      .values(eventPayload)
      .returning();

    const eventId = createdEvent.id;

    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      if (areas.length > 0) {
        const areaValues = areas.map((area) => {
          const areaId = crypto.randomUUID();
          const rowId = crypto.randomUUID();

          return {
            areaId,
            rowId,
            areaName: area.name,
            price: area.ticketPrice,
            seatCount: area.seatCount,
          };
        });

        const areaInsertSql = sql`
          INSERT INTO areas (id, event_id, showing_id, name, price, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) =>
                sql`(${v.areaId}, ${eventId}, ${showingId}, ${v.areaName}, ${v.price}, NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(areaInsertSql);

        const rowInsertSql = sql`
          INSERT INTO rows (id, area_id, row_name, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) => sql`(${v.rowId}, ${v.areaId}, 'Row 1', NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(rowInsertSql);

        for (const { rowId, seatCount } of areaValues) {
          if (seatCount > 0) {
            const seatValues = Array.from(
              { length: seatCount },
              (_, index) =>
                sql`(${crypto.randomUUID()}, ${rowId}, ${(index + 1).toString()}, NOW(), NOW())`
            );

            const seatInsertSql = sql`
              INSERT INTO seats (id, row_id, seat_number, created_at, updated_at)
              VALUES ${sql.join(seatValues, sql`, `)}
            `;
            await tx.execute(seatInsertSql);
          }
        }
      }
    }

    return { eventId };
  });
}

export async function createEventWithShowingsIndividualOptimized(
  eventPayload: NewEvent,
  showingsData: Array<{
    showing: {
      name: string;
      startTime: Date;
      endTime: Date;
      ticketSaleStart?: Date | null;
      ticketSaleEnd?: Date | null;
      seatMapId?: string;
    };
    areas: Array<{
      name: string;
      seatCount: number;
      ticketPrice: number;
    }>;
  }>
) {
  return db.transaction(async (tx) => {
    const [createdEvent] = await tx
      .insert(events)
      .values(eventPayload)
      .returning();

    const eventId = createdEvent.id;

    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      if (areas.length > 0) {
        const areaValues = areas.map((area) => {
          const areaId = crypto.randomUUID();
          const rowId = crypto.randomUUID();

          return {
            areaId,
            rowId,
            areaName: area.name,
            price: area.ticketPrice,
            seatCount: area.seatCount,
          };
        });

        const areaInsertSql = sql`
          INSERT INTO areas (id, event_id, showing_id, name, price, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) =>
                sql`(${v.areaId}, ${eventId}, ${showingId}, ${v.areaName}, ${v.price}, NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(areaInsertSql);

        const rowInsertSql = sql`
          INSERT INTO rows (id, area_id, row_name, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) => sql`(${v.rowId}, ${v.areaId}, 'Row 1', NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(rowInsertSql);

        for (const { rowId, seatCount } of areaValues) {
          if (seatCount > 0) {
            const seatValues = Array.from(
              { length: seatCount },
              (_, index) =>
                sql`(${crypto.randomUUID()}, ${rowId}, ${(index + 1).toString()}, NOW(), NOW())`
            );

            const seatInsertSql = sql`
              INSERT INTO seats (id, row_id, seat_number, created_at, updated_at)
              VALUES ${sql.join(seatValues, sql`, `)}
            `;
            await tx.execute(seatInsertSql);
          }
        }
      }
    }

    return { eventId };
  });
}

export async function updateEventWithShowingsOptimized(
  eventPayload: any,
  showingsData: Array<{
    showing: {
      name: string;
      startTime: Date;
      endTime: Date;
      ticketSaleStart?: Date | null;
      ticketSaleEnd?: Date | null;
      seatMapId?: string;
    };
    areas: Array<{
      name: string;
      seatCount: number;
      ticketPrice: number;
    }>;
  }>
) {
  return db.transaction(async (tx) => {
    const [updatedEvent] = await tx
      .update(events)
      .set(eventPayload)
      .where(eq(events.id, eventPayload.id))
      .returning();

    const eventId = updatedEvent.id;

    await tx.execute(sql`
      DELETE FROM seats 
      WHERE row_id IN (
        SELECT r.id FROM rows r
        JOIN areas a ON r.area_id = a.id
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM rows 
      WHERE area_id IN (
        SELECT a.id FROM areas a
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM areas 
      WHERE showing_id IN (
        SELECT id FROM showings WHERE event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM showings WHERE event_id = ${eventId}
    `);

    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      if (areas.length > 0) {
        const areaValues = areas.map((area) => {
          const areaId = crypto.randomUUID();
          const rowId = crypto.randomUUID();

          return {
            areaId,
            rowId,
            areaName: area.name,
            price: area.ticketPrice,
            seatCount: area.seatCount,
          };
        });

        const areaInsertSql = sql`
          INSERT INTO areas (id, event_id, showing_id, name, price, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) =>
                sql`(${v.areaId}, ${eventId}, ${showingId}, ${v.areaName}, ${v.price}, NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(areaInsertSql);

        const rowInsertSql = sql`
          INSERT INTO rows (id, area_id, row_name, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) => sql`(${v.rowId}, ${v.areaId}, 'Row 1', NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(rowInsertSql);

        for (const { rowId, seatCount } of areaValues) {
          if (seatCount > 0) {
            const seatValues = Array.from(
              { length: seatCount },
              (_, index) =>
                sql`(${crypto.randomUUID()}, ${rowId}, ${(index + 1).toString()}, NOW(), NOW())`
            );

            const seatInsertSql = sql`
              INSERT INTO seats (id, row_id, seat_number, created_at, updated_at)
              VALUES ${sql.join(seatValues, sql`, `)}
            `;
            await tx.execute(seatInsertSql);
          }
        }
      }
    }

    return { eventId };
  });
}
export async function getEventsByOrganizerId(organizerId: string) {
  return db.select().from(events).where(eq(events.organizerId, organizerId));
}
export async function updateEventWithShowingsIndividualOptimized(
  eventPayload: any,
  showingsData: Array<{
    showing: {
      name: string;
      startTime: Date;
      endTime: Date;
      ticketSaleStart?: Date | null;
      ticketSaleEnd?: Date | null;
      seatMapId?: string;
    };
    areas: Array<{
      name: string;
      seatCount: number;
      ticketPrice: number;
    }>;
  }>
) {
  return db.transaction(async (tx) => {
    const [updatedEvent] = await tx
      .update(events)
      .set(eventPayload)
      .where(eq(events.id, eventPayload.id))
      .returning();

    const eventId = updatedEvent.id;

    await tx.execute(sql`
      DELETE FROM seats 
      WHERE row_id IN (
        SELECT r.id FROM rows r
        JOIN areas a ON r.area_id = a.id
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM rows 
      WHERE area_id IN (
        SELECT a.id FROM areas a
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM areas 
      WHERE showing_id IN (
        SELECT id FROM showings WHERE event_id = ${eventId}
      )
    `);

    await tx.execute(sql`
      DELETE FROM showings WHERE event_id = ${eventId}
    `);

    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      if (areas.length > 0) {
        const areaValues = areas.map((area) => {
          const areaId = crypto.randomUUID();
          const rowId = crypto.randomUUID();

          return {
            areaId,
            rowId,
            areaName: area.name,
            price: area.ticketPrice,
            seatCount: area.seatCount,
          };
        });

        const areaInsertSql = sql`
          INSERT INTO areas (id, event_id, showing_id, name, price, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) =>
                sql`(${v.areaId}, ${eventId}, ${showingId}, ${v.areaName}, ${v.price}, NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(areaInsertSql);

        const rowInsertSql = sql`
          INSERT INTO rows (id, area_id, row_name, created_at, updated_at)
          VALUES ${sql.join(
            areaValues.map(
              (v) => sql`(${v.rowId}, ${v.areaId}, 'Row 1', NOW(), NOW())`
            ),
            sql`, `
          )}
        `;
        await tx.execute(rowInsertSql);

        for (const { rowId, seatCount } of areaValues) {
          if (seatCount > 0) {
            const seatValues = Array.from(
              { length: seatCount },
              (_, index) =>
                sql`(${crypto.randomUUID()}, ${rowId}, ${(index + 1).toString()}, NOW(), NOW())`
            );

            const seatInsertSql = sql`
              INSERT INTO seats (id, row_id, seat_number, created_at, updated_at)
              VALUES ${sql.join(seatValues, sql`, `)}
            `;
            await tx.execute(seatInsertSql);
          }
        }
      }
    }

    return { eventId };
  });
}

export async function checkEventSeatsData(eventId: string) {
  const result = await db.execute(sql`
    SELECT 
      e.name as event_name,
      COUNT(DISTINCT s.id) as showing_count,
      COUNT(DISTINCT a.id) as area_count,
      COUNT(DISTINCT r.id) as row_count,
      COUNT(se.id) as total_seats,
      STRING_AGG(DISTINCT a.name, ', ') as area_names
    FROM events e
    LEFT JOIN showings s ON e.id = s.event_id
    LEFT JOIN areas a ON s.id = a.showing_id
    LEFT JOIN rows r ON a.id = r.area_id
    LEFT JOIN seats se ON r.id = se.row_id
    WHERE e.id = ${eventId}
    GROUP BY e.id, e.name
  `);

  return result.rows[0];
}

export async function getEventWithShowingsOptimized(eventId: string) {
  const result = await db.execute(sql`
    SELECT 
      e.id as event_id,
      e.name as event_name,
      e.slug,
      e.description,
      e.location,
      e.type,
      e.start_time as event_start_time,
      e.end_time as event_end_time,
      e.ticket_sale_start,
      e.ticket_sale_end,
      e.poster_url,
      e.banner_url,
      e.views,
      e.max_tickets_by_order,
      e.approval_status,
      e.organizer_id,
      e.seat_map_id,
      e.created_at,
      e.updated_at,
      s.id as showing_id,
      s.name as showing_name,
      s.start_time as showing_start_time,
      s.end_time as showing_end_time,
      s.ticket_sale_start as showing_ticket_sale_start,
      s.ticket_sale_end as showing_ticket_sale_end,
      s.seat_map_id as showing_seat_map_id,
      a.id as area_id,
      a.name as area_name,
      a.price as area_price,
      a.showing_id as area_showing_id,
      COALESCE(
        (SELECT COUNT(*) 
         FROM rows r 
         JOIN seats se ON r.id = se.row_id 
         WHERE r.area_id = a.id), 0
      ) as seat_count
    FROM events e
    LEFT JOIN showings s ON e.id = s.event_id
    LEFT JOIN areas a ON s.id = a.showing_id
    WHERE e.id = ${eventId}
    ORDER BY s.start_time, a.name
  `);

  return transformEventResult(result.rows);
}

export async function getEventByIdOptimized(eventId: string) {
  const result = await getEventWithShowingsOptimized(eventId);
  return result ? [result] : [];
}

export async function getEventsByOrganizerOptimized(organizerId: string) {
  const result = await db.execute(sql`
    SELECT 
      e.id as event_id,
      e.name as event_name,
      e.slug,
      e.description,
      e.location,
      e.type,
      e.start_time as event_start_time,
      e.end_time as event_end_time,
      e.ticket_sale_start,
      e.ticket_sale_end,
      e.poster_url,
      e.banner_url,
      e.views,
      e.max_tickets_by_order,
      e.approval_status,
      e.organizer_id,
      e.seat_map_id,
      e.created_at,
      e.updated_at,
      s.id as showing_id,
      s.name as showing_name,
      s.start_time as showing_start_time,
      s.end_time as showing_end_time,
      s.ticket_sale_start as showing_ticket_sale_start,
      s.ticket_sale_end as showing_ticket_sale_end,
      s.seat_map_id as showing_seat_map_id,
      a.id as area_id,
      a.name as area_name,
      a.price as area_price,
      a.showing_id as area_showing_id,
      COALESCE(
        (SELECT COUNT(*) 
         FROM rows r 
         JOIN seats se ON r.id = se.row_id 
         WHERE r.area_id = a.id), 0
      ) as seat_count
    FROM events e
    LEFT JOIN showings s ON e.id = s.event_id
    LEFT JOIN areas a ON s.id = a.showing_id
    WHERE e.organizer_id = ${organizerId}
    ORDER BY e.created_at DESC, s.start_time, a.name
  `);

  const eventMap = new Map();

  result.rows.forEach((row) => {
    if (!eventMap.has(row.event_id)) {
      eventMap.set(row.event_id, []);
    }
    eventMap.get(row.event_id).push(row);
  });

  const events = [];
  for (const [eventId, rows] of eventMap) {
    const transformedEvent = transformEventResult(rows);
    if (transformedEvent) {
      events.push(transformedEvent);
    }
  }

  return events;
}

function transformEventResult(flatResult: any[]) {
  if (!flatResult.length) return null;

  const event = {
    id: flatResult[0].event_id,
    name: flatResult[0].event_name,
    slug: flatResult[0].slug,
    description: flatResult[0].description,
    location: flatResult[0].location,
    type: flatResult[0].type,
    startTime: flatResult[0].event_start_time,
    endTime: flatResult[0].event_end_time,
    ticketSaleStart: flatResult[0].ticket_sale_start,
    ticketSaleEnd: flatResult[0].ticket_sale_end,
    maxTicketsByOrder: flatResult[0].max_tickets_by_order,
    posterUrl: flatResult[0].poster_url,
    bannerUrl: flatResult[0].banner_url,
    views: flatResult[0].views,
    approvalStatus: flatResult[0].approval_status,
    organizerId: flatResult[0].organizer_id,
    seatMapId: flatResult[0].seat_map_id,
    createdAt: flatResult[0].created_at,
    updatedAt: flatResult[0].updated_at,
    showings: [] as any[],
    areas: [] as any[],
  };

  const showingsMap = new Map();
  const allAreas: any[] = [];

  flatResult.forEach((row) => {
    if (row.showing_id && !showingsMap.has(row.showing_id)) {
      showingsMap.set(row.showing_id, {
        id: row.showing_id,
        name: row.showing_name,
        startTime: row.showing_start_time,
        endTime: row.showing_end_time,
        ticketSaleStart: row.showing_ticket_sale_start,
        ticketSaleEnd: row.showing_ticket_sale_end,
        seatMapId: row.showing_seat_map_id,
        areas: [],
      });
    }

    if (row.area_id && row.area_showing_id) {
      const area = {
        id: row.area_id,
        name: row.area_name,
        price: row.area_price,
        seatCount: Number(row.seat_count) || 0,
        eventId: row.event_id,
        showingId: row.area_showing_id,
      };

      if (showingsMap.has(row.area_showing_id)) {
        const showing = showingsMap.get(row.area_showing_id);
        const existingInShowing = showing.areas.find(
          (a: any) => a.id === row.area_id
        );

        if (!existingInShowing) {
          showing.areas.push(area);
        }
      }

      const existingInAllAreas = allAreas.find(
        (a: any) => a.id === row.area_id
      );
      if (!existingInAllAreas) {
        allAreas.push(area);
      }
    }
  });

  event.showings = Array.from(showingsMap.values());
  event.areas = allAreas;

  return event;
}
