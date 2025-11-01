"use server";

import { db } from "@/lib/db";
import { organizers, areas, user } from "@vieticket/db/pg/schema";
import type { EventFull } from "@vieticket/db/pg/schema";

import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { Event } from "@vieticket/db/pg/models/events";
import { events } from "@vieticket/db/pg/schemas/events";

const SORTABLE_COLUMNS = {
  views: events.views,
  startTime: events.startTime,
  createdAt: events.createdAt,
} as const;

export type SortableEventColumnKey = keyof typeof SORTABLE_COLUMNS;

function normalizeLocation(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s/g, "") // Bỏ khoảng trắng
    .toLowerCase();
}

export type EventSummary = Pick<
  Event,
  | "id"
  | "name"
  | "slug"
  | "location"
  | "startTime"
  | "endTime"
  | "views"
  | "bannerUrl"
  | "type"
> & {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  startTime: Date;
  endTime: Date;
  typicalTicketPrice: number;
  bannerUrl: string | null;
  views: number;
  organizer?: {
    id: string;
    name: string;
  };
} & Partial<Pick<Event, SortableEventColumnKey>>;

export type EventSummaryResponse = Promise<{
  events: EventSummary[];
  hasMore: boolean;
}>;

export type EventCursor = {
  sortValue: number | Date;
  id: string;
};

export async function getEventBySlug(slug: string): Promise<EventFull | null> {
  // First, get the event using relations to include showings
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      organizer: true,
      areas: true,
      showings: true,
    },
  });

  if (!event) return null;

  // Get organizer avatar from user table
  let avatar = null;
  if (event.organizer) {
    const userAvatar = await db.query.user.findFirst({
      where: eq(user.id, event.organizer.id),
      columns: { image: true },
    });
    avatar = userAvatar?.image || null;
  }

  return {
    ...event,
    organizer: {
      ...event.organizer,
      avatar,
    },
  };
}
export async function getFilteredEvents({
  page = 1,
  limit = 6,
  price = "all",
  date = "all",
  location = "all",
  category = "all",
  q = "",
}: {
  page?: number;
  limit?: number;
  price?: string;
  date?: string;
  location?: string;
  category?: string;
  q?: string;
}) {
  const whereConditions = [eq(events.approvalStatus, "approved")];

  // Price filter
  if (price && price !== "all") {
    const priceRanges: Record<string, [number, number]> = {
      lt500k: [0, 500000],
      "500k-1m": [500000, 1000000],
      "1m-3m": [1000000, 3000000],
      "3m-5m": [3000000, 5000000],
      gt5m: [5000000, Infinity],
    };

    const [minPrice, maxPrice] = priceRanges[price] || [0, Infinity];
    whereConditions.push(
      sql`EXISTS (
      SELECT 1 FROM ${areas}
      WHERE areas.event_id = events.id
      AND areas.price >= ${minPrice}
      ${maxPrice !== Infinity ? sql`AND areas.price <= ${maxPrice}` : sql``}
      )`
    );
  }

  // Date filter
  if (date && date !== "all") {
    const now = new Date();
    if (date === "today") {
      whereConditions.push(sql`DATE(${events.startTime}) = CURRENT_DATE`);
    } else if (date === "thisWeek") {
      whereConditions.push(
        sql`${events.startTime} BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '7 days')`
      );
    }
  }

  // Location filter
  if (location && location !== "all") {
    const normalized = normalizeLocation(location);

    whereConditions.push(
      sql`REPLACE(LOWER(REPLACE(${events.location}, ' ', '')), 'đ', 'd') LIKE ${`%${normalized}%`}`
    );
  }

  // Category filter
  if (category && category !== "all") {
    whereConditions.push(sql`LOWER(${events.type}) = LOWER(${category})`);
  }

  // Search query
  if (q) {
    const likeQuery = `%${q}%`;
    whereConditions.push(
      sql`(${events.name} ILIKE ${likeQuery} OR ${events.description} ILIKE ${likeQuery})`
    );
  }

  const result = await db.query.events.findMany({
    limit,
    offset: (page - 1) * limit,
    orderBy: [desc(events.startTime)],
    columns: {
      id: true,
      name: true,
      slug: true,
      startTime: true,
      endTime: true,
      location: true,
      bannerUrl: true,
      views: true,
      type: true,
    },
    with: {
      organizer: {
        columns: {
          id: true,
          name: true,
        },
      },
      areas: {
        columns: {
          price: true,
        },
      },
    },
    where: and(...whereConditions),
  });

  // Calculate typical ticket price
  const eventsWithTypicalPrice = result.map((event) => ({
    ...event,
    typicalTicketPrice:
      event.areas.length > 0
        ? Math.min(...event.areas.map((area) => area.price))
        : 0,
    location: event.location ?? "",
    bannerUrl: event.bannerUrl ?? "",
    areas: undefined,
  }));

  return {
    events: eventsWithTypicalPrice,
    page,
    hasMore: result.length === limit,
  };
}

export async function getEventSummaries({
  limit = 4,
  cursor,
  sortColumnKey = "startTime",
  price,
}: {
  limit?: number;
  cursor?: EventCursor;
  sortColumnKey?: SortableEventColumnKey;
  price?: string;
}): EventSummaryResponse {
  const sortBy = SORTABLE_COLUMNS[sortColumnKey]!;

  const whereConditions = [eq(events.approvalStatus, "approved")];

  if (cursor) {
    // Handle cursor pagination with composite conditions
    const cursorCondition = or(
      lt(sortBy, cursor.sortValue),
      and(eq(sortBy, cursor.sortValue), lt(events.id, cursor.id))
    );

    if (cursorCondition) {
      whereConditions.push(cursorCondition);
    }
  }

  // Use RAW SQL with prepared statements if performance REALLY suffers
  const eventList = await db.query.events.findMany({
    limit: limit + 1,
    orderBy: [desc(sortBy), desc(events.id)],
    columns: {
      id: true,
      name: true,
      slug: true,
      startTime: true,
      endTime: true,
      location: true,
      bannerUrl: true,
      views: true,
      type: true,
      [sortColumnKey]: true,
    } as const,
    with: {
      organizer: {
        columns: {
          id: true,
          name: true,
        },
      },
      areas: {
        columns: {
          price: true,
        },
      },
    },
    where: and(...whereConditions),
  });

  // Check if there are more items
  const hasMore = eventList.length > limit;
  if (hasMore) {
    eventList.pop(); // Remove the extra item
  }

  // Calculate typical ticket price (minimum price from all areas)
  const eventsWithTypicalPrice: EventSummary[] = eventList.map((event) => {
    const typicalTicketPrice =
      event.areas.length > 0
        ? Math.min(...event.areas.map((area) => area.price))
        : 0;

    return {
      ...event,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location ?? "", // Ensure location is always a string
      typicalTicketPrice,
      organizer: event.organizer,
      bannerUrl: event.bannerUrl ?? "", // Ensure bannerUrl is always a string
      areas: undefined, // Remove areas from final response
    };
  });

  // Return events with Date objects for startTime and endTime
  return {
    events: eventsWithTypicalPrice,
    hasMore,
  };
}
