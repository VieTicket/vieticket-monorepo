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

export async function createEvent(event: NewEvent) {
  return db.insert(events).values(event).returning();
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

export async function createArea(area: {
  eventId: string;
  name: string;
  price: number;
  showingId?: string;
}) {
  return db.insert(areas).values(area).returning();
}

export async function createRow(row: { areaId: string; rowName: string }) {
  return db.insert(rows).values(row).returning();
}

export async function createSeats(
  seatsData: {
    rowId: string;
    seatNumber: string;
  }[]
) {
  return db.insert(seats).values(seatsData);
}

export async function getEventsByOrganizerId(organizerId: string) {
  return db.select().from(events).where(eq(events.organizerId, organizerId));
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
export async function updateAreaById(
  areaId: string,
  data: Partial<typeof areas.$inferInsert>
) {
  return db.update(areas).set(data).where(eq(areas.id, areaId)).returning();
}
export async function updateRowById(
  rowId: string,
  data: Partial<typeof rows.$inferInsert>
) {
  return db.update(rows).set(data).where(eq(rows.id, rowId)).returning();
}
export async function updateSeatById(
  seatId: string,
  data: Partial<typeof seats.$inferInsert>
) {
  return db.update(seats).set(data).where(eq(seats.id, seatId)).returning();
}
export async function getAreasByEventId(eventId: string) {
  return db.select().from(areas).where(eq(areas.eventId, eventId));
}
export async function getRowsByAreaId(areaId: string) {
  return db.select().from(rows).where(eq(rows.areaId, areaId));
}
export async function deleteAreasByEventId(eventId: string) {
  return db.delete(areas).where(eq(areas.eventId, eventId));
}

export async function deleteShowingsByEventId(eventId: string) {
  return db.delete(showings).where(eq(showings.eventId, eventId));
}

export async function deleteSeatsByRowId(rowId: string) {
  return db.delete(seats).where(eq(seats.rowId, rowId));
}

export async function createAreaWithId(area: {
  id: string;
  eventId: string;
  name: string;
  price: number;
}) {
  return db
    .insert(areas)
    .values({
      id: area.id,
      eventId: area.eventId,
      name: area.name,
      price: area.price,
    })
    .returning();
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

export async function createSeatsWithIds(
  seatsData: {
    id: string;
    rowId: string;
    seatNumber: string;
  }[]
) {
  return db.insert(seats).values(seatsData);
}

export async function incrementEventView(eventId: string) {
  return db
    .update(events)
    .set({
      views: sql`${events.views} + 1`,
    })
    .where(eq(events.id, eventId));
}

// ========== OPTIMIZED BULK OPERATIONS ==========

export async function deleteAllShowingDataForEvent(eventId: string) {
  // Xóa tất cả dữ liệu liên quan đến showings của event trong 1 transaction
  return db.transaction(async (tx) => {
    // 1. Delete seats first (foreign key constraint)
    await tx.execute(sql`
      DELETE FROM seats 
      WHERE row_id IN (
        SELECT r.id FROM rows r
        JOIN areas a ON r.area_id = a.id
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    // 2. Delete rows
    await tx.execute(sql`
      DELETE FROM rows 
      WHERE area_id IN (
        SELECT a.id FROM areas a
        JOIN showings s ON a.showing_id = s.id
        WHERE s.event_id = ${eventId}
      )
    `);

    // 3. Delete areas
    await tx.execute(sql`
      DELETE FROM areas 
      WHERE showing_id IN (
        SELECT id FROM showings WHERE event_id = ${eventId}
      )
    `);

    // 4. Delete showings
    await tx.execute(sql`
      DELETE FROM showings WHERE event_id = ${eventId}
    `);
  });
}

export async function bulkCreateShowingsWithAreas(
  eventId: string,
  showingsData: Array<{
    showing: {
      name: string;
      startTime: Date;
      endTime: Date;
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
    const results = [];

    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      // Insert showing
      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      // Bulk insert areas for this showing
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

        // Insert all areas at once
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

        // Insert all rows at once
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

        // Bulk insert seats for each area
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

      results.push({ showingId, areasCount: areas.length });
    }

    return results;
  });
}

export async function bulkCreateShowingsWithIndividualAreas(
  eventId: string,
  showingsData: Array<{
    showing: {
      name: string;
      startTime: Date;
      endTime: Date;
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
    const results = [];

    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      // Insert showing
      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      // Bulk insert areas for this specific showing
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

        // Insert all areas at once
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

        // Insert all rows at once
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

        // Bulk insert seats for each area
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

      results.push({ showingId, areasCount: areas.length });
    }

    return results;
  });
}

// ========== OPTIMIZED EVENT CREATION FUNCTIONS ==========

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
    // 1. Create event
    const [createdEvent] = await tx
      .insert(events)
      .values(eventPayload)
      .returning();

    const eventId = createdEvent.id;

    // 2. Create all showings + areas + rows + seats in same transaction
    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      // Insert showing
      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      // Bulk insert areas + rows + seats for this showing
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

        // Insert all areas at once
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

        // Insert all rows at once
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

        // Bulk insert seats for each area
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
    // 1. Create event
    const [createdEvent] = await tx
      .insert(events)
      .values(eventPayload)
      .returning();

    const eventId = createdEvent.id;

    // 2. Create showings with individual area configurations
    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      // Insert showing
      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      // Bulk insert areas for this specific showing
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

        // Insert all areas at once
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

        // Insert all rows at once
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

        // Bulk insert seats for each area
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

// Legacy single area support (for backward compatibility)
export async function createEventWithAreasOptimized(
  eventPayload: NewEvent,
  areas: Array<{
    name: string;
    seatCount: number;
    ticketPrice: number;
  }>
) {
  return db.transaction(async (tx) => {
    // 1. Create event
    const [createdEvent] = await tx
      .insert(events)
      .values(eventPayload)
      .returning();

    // 2. Create areas directly for event (no showings)
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

      // Insert all areas at once
      const areaInsertSql = sql`
        INSERT INTO areas (id, event_id, name, price, created_at, updated_at)
        VALUES ${sql.join(
          areaValues.map(
            (v) =>
              sql`(${v.areaId}, ${createdEvent.id}, ${v.areaName}, ${v.price}, NOW(), NOW())`
          ),
          sql`, `
        )}
      `;
      await tx.execute(areaInsertSql);

      // Insert all rows at once
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

      // Bulk insert seats for each area
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

    return { eventId: createdEvent.id };
  });
}

// ========== OPTIMIZED EVENT UPDATE FUNCTIONS ==========

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
    // 1. Update event
    const [updatedEvent] = await tx
      .update(events)
      .set(eventPayload)
      .where(eq(events.id, eventPayload.id))
      .returning();

    const eventId = updatedEvent.id;

    // 2. Clean up all old showing data in same transaction
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

    // 3. Create new showings + areas + rows + seats in same transaction
    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      // Insert showing
      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      // Bulk insert areas + rows + seats for this showing
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

        // Insert all areas at once
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

        // Insert all rows at once
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

        // Bulk insert seats for each area
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
    // 1. Update event
    const [updatedEvent] = await tx
      .update(events)
      .set(eventPayload)
      .where(eq(events.id, eventPayload.id))
      .returning();

    const eventId = updatedEvent.id;

    // 2. Clean up all old showing data in same transaction
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

    // 3. Create showings with individual area configurations
    for (const { showing, areas } of showingsData) {
      const showingId = crypto.randomUUID();

      // Insert showing
      await tx.execute(sql`
        INSERT INTO showings (id, event_id, name, start_time, end_time, ticket_sale_start, ticket_sale_end, seat_map_id, created_at, updated_at)
        VALUES (${showingId}, ${eventId}, ${showing.name}, ${showing.startTime}, ${showing.endTime}, ${showing.ticketSaleStart || null}, ${showing.ticketSaleEnd || null}, ${showing.seatMapId || null}, NOW(), NOW())
      `);

      // Bulk insert areas for this specific showing
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

        // Insert all areas at once
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

        // Insert all rows at once
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

        // Bulk insert seats for each area
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

// ========== OPTIMIZED READ OPERATIONS ==========

// Simple function to check if event has seats data
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
  // Debug query to check current data state
  const debugResult = await db.execute(sql`
    SELECT 
      s.id as showing_id,
      s.name as showing_name,
      COUNT(a.id) as areas_count,
      STRING_AGG(a.name, ', ') as area_names
    FROM showings s
    LEFT JOIN areas a ON s.id = a.showing_id
    WHERE s.event_id = ${eventId}
    GROUP BY s.id, s.name
    ORDER BY s.start_time
  `);

  console.log("Showings and their areas:", debugResult.rows);

  // Main query - only get areas that belong to specific showings
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
      e.approval_status,
      e.organizer_id,
      e.seat_map_id,
      e.created_at,
      e.updated_at,
      s.id as showing_id,
      s.name as showing_name,
      s.start_time as showing_start_time,
      s.end_time as showing_end_time,
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

  console.log("Query result sample:", result.rows.slice(0, 3));
  console.log("Total rows returned:", result.rows.length);

  // Transform flat result to nested structure
  return transformEventResult(result.rows);
} // Optimized function specifically for getting events with all details including seats
export async function getEventByIdOptimized(eventId: string) {
  const result = await getEventWithShowingsOptimized(eventId);
  return result ? [result] : [];
}

// Optimized function for getting multiple events by organizer
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
      e.approval_status,
      e.organizer_id,
      e.seat_map_id,
      e.created_at,
      e.updated_at,
      s.id as showing_id,
      s.name as showing_name,
      s.start_time as showing_start_time,
      s.end_time as showing_end_time,
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

  // Group by event_id to create multiple events
  const eventMap = new Map();

  result.rows.forEach((row) => {
    if (!eventMap.has(row.event_id)) {
      eventMap.set(row.event_id, []);
    }
    eventMap.get(row.event_id).push(row);
  });

  // Transform each event group
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
    posterUrl: flatResult[0].poster_url,
    bannerUrl: flatResult[0].banner_url,
    views: flatResult[0].views,
    approvalStatus: flatResult[0].approval_status,
    organizerId: flatResult[0].organizer_id,
    seatMapId: flatResult[0].seat_map_id,
    createdAt: flatResult[0].created_at,
    updatedAt: flatResult[0].updated_at,
    showings: [] as any[],
    areas: [] as any[], // For backward compatibility
  };

  const showingsMap = new Map();
  const allAreas: any[] = [];

  flatResult.forEach((row) => {
    // Create showing if not exists
    if (row.showing_id && !showingsMap.has(row.showing_id)) {
      showingsMap.set(row.showing_id, {
        id: row.showing_id,
        name: row.showing_name,
        startTime: row.showing_start_time,
        endTime: row.showing_end_time,
        seatMapId: row.showing_seat_map_id,
        areas: [],
      });
    }

    // Add area to its specific showing
    if (row.area_id && row.area_showing_id) {
      const area = {
        id: row.area_id,
        name: row.area_name,
        price: row.area_price,
        seatCount: Number(row.seat_count) || 0,
        eventId: row.event_id,
        showingId: row.area_showing_id,
      };

      // Add to showing
      if (showingsMap.has(row.area_showing_id)) {
        const showing = showingsMap.get(row.area_showing_id);
        const existingInShowing = showing.areas.find(
          (a: any) => a.id === row.area_id
        );

        if (!existingInShowing) {
          showing.areas.push(area);
        }
      }

      // Add to flat areas array (avoid duplicates)
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

  console.log("Transform result:", {
    eventName: event.name,
    showingsCount: event.showings.length,
    totalAreasCount: event.areas.length,
    showingBreakdown: event.showings.map((s) => ({
      showingName: s.name,
      areasCount: s.areas.length,
      areaNames: s.areas
        .map((a: any) => `${a.name}(${a.seatCount} seats)`)
        .join(", "),
    })),
  });

  return event;
}
