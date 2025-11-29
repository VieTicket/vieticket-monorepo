"use server";

import { db } from "@/lib/db";
import type { EventFull } from "@vieticket/db/pg/schema";
import { areas, user } from "@vieticket/db/pg/schema";

import { Event } from "@vieticket/db/pg/models/events";
import { events } from "@vieticket/db/pg/schemas/events";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";

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
    .replace(/đ/gi, "d") // Thay đ/Đ thành d/D  
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/gi, "a") // Các ký tự a có dấu
    .replace(/[èéẹẻẽêềếệểễ]/gi, "e") // Các ký tự e có dấu
    .replace(/[ìíịỉĩ]/gi, "i") // Các ký tự i có dấu
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/gi, "o") // Các ký tự o có dấu
    .replace(/[ùúụủũưừứựửữ]/gi, "u") // Các ký tự u có dấu
    .replace(/[ỳýỵỷỹ]/gi, "y") // Các ký tự y có dấu
    .replace(/\s+/g, "") // Bỏ tất cả khoảng trắng
    .toLowerCase();
}

// Function to create location search patterns
function createLocationSearchPatterns(location: string): string[] {
  const baseNormalized = normalizeLocation(location);
  
  // Create comprehensive patterns for Vietnamese location matching
  const patterns = new Set<string>();
  
  // Add base normalized pattern
  patterns.add(baseNormalized);
  
  // Add pattern with all Vietnamese diacritics removed
  const fullyNormalized = location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove all diacritics
    .replace(/đ/gi, "d") // Replace đ/Đ with d
    .replace(/\s+/g, "") // Remove all spaces
    .toLowerCase();
  patterns.add(fullyNormalized);
  
  // Add original location without spaces, lowercase
  patterns.add(location.replace(/\s+/g, "").toLowerCase());
  
  // For "Đà Nẵng" specifically, add common variations
  const locationLower = location.toLowerCase();
  if (locationLower.includes("đà nẵng") || locationLower.includes("da nang") || 
      locationLower.includes("danang") || locationLower.includes("đanang")) {
    patterns.add("danang");
    patterns.add("dànẵng");
    patterns.add("đànẵng");
    patterns.add("đanang");
    patterns.add("dànang");
    patterns.add("đa nang");
  }
  
  // Remove empty strings and return unique patterns
  return Array.from(patterns).filter(p => p.length > 0);
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
  | "posterUrl"
  | "type"
  | "createdAt"
> & {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  startTime: Date;
  endTime: Date;
  typicalTicketPrice: number;
  bannerUrl: string | null;
  posterUrl: string | null;
  views: number;
  createdAt: Date | null;
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
    organizer: event.organizer
      ? {
          ...event.organizer,
          avatar,
        }
      : undefined,
  } as EventFull;
}

export async function getEventByIdFull(eventId: string): Promise<EventFull | null> {
  // Get the event using relations to include organizer, areas, and showings
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
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
    organizer: event.organizer
      ? {
          ...event.organizer,
          avatar,
        }
      : undefined,
  } as EventFull;
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
  console.log("getFilteredEvents called with:", {
    page, limit, price, date, location, category, q
  });

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
    console.log(`Price filter: ${price} -> min: ${minPrice}, max: ${maxPrice}`);
    
    // Filter by minimum price (typical ticket price) instead of any area price
    if (maxPrice !== Infinity) {
      whereConditions.push(
        sql`(
          SELECT MIN(areas.price) FROM ${areas}
          WHERE areas.event_id = events.id
        ) >= ${minPrice} AND (
          SELECT MIN(areas.price) FROM ${areas}
          WHERE areas.event_id = events.id
        ) <= ${maxPrice}`
      );
    } else {
      whereConditions.push(
        sql`(
          SELECT MIN(areas.price) FROM ${areas}
          WHERE areas.event_id = events.id
        ) >= ${minPrice}`
      );
    }
  }

  // Date filter
  if (date && date !== "all") {
    const now = new Date();
    console.log(`Date filter: ${date}`);
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
    console.log(`Location filter: ${location}`);
    
    // Function to create Vietnamese text variations
    function createVietnameseVariations(text: string) {
      const baseVariations = [
        text, // Original
        text.toLowerCase(),
        text.toUpperCase(),
        // Replace Vietnamese characters with base characters
        text.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/gi, "a")
            .replace(/[èéẹẻẽêềếệểễ]/gi, "e")
            .replace(/[ìíịỉĩ]/gi, "i")
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/gi, "o")
            .replace(/[ùúụủũưừứựửữ]/gi, "u")
            .replace(/[ỳýỵỷỹ]/gi, "y")
            .replace(/[đĐ]/gi, "d"),
        // With spaces removed
        text.replace(/\s+/g, "").toLowerCase(),
        // Without diacritics and spaces
        text.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/gi, "a")
            .replace(/[èéẹẻẽêềếệểễ]/gi, "e")
            .replace(/[ìíịỉĩ]/gi, "i")
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/gi, "o")
            .replace(/[ùúụủũưừứựửữ]/gi, "u")
            .replace(/[ỳýỵỷỹ]/gi, "y")
            .replace(/[đĐ]/gi, "d")
            .replace(/\s+/g, "")
            .toLowerCase(),
        // Additional variations for common swaps
        text.replace(/ó/gi, "o").replace(/ò/gi, "o").replace(/ỏ/gi, "o").replace(/õ/gi, "o").replace(/ọ/gi, "o"),
        text.replace(/á/gi, "a").replace(/à/gi, "a").replace(/ả/gi, "a").replace(/ã/gi, "a").replace(/ạ/gi, "a"),
        // Mixed case variations
        text.toLowerCase().replace(/[àáạảãâầấậẩẫăằắặẳẵ]/gi, "a")
            .replace(/[èéẹẻẽêềếệểễ]/gi, "e")
            .replace(/[ìíịỉĩ]/gi, "i")
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/gi, "o")
            .replace(/[ùúụủũưừứựửữ]/gi, "u")
            .replace(/[ỳýỵỷỹ]/gi, "y")
            .replace(/[đĐ]/gi, "d")
      ];
      
      // Add variations with punctuation and whitespace handling
      const extendedVariations: string[] = [];
      baseVariations.forEach(variation => {
        extendedVariations.push(variation);
        // Add with common punctuation
        extendedVariations.push(variation + ",");
        extendedVariations.push(variation + ".");
        extendedVariations.push(variation + ";");
        extendedVariations.push(" " + variation);
        extendedVariations.push(variation + " ");
        extendedVariations.push(" " + variation + " ");
        extendedVariations.push(" " + variation + ",");
        extendedVariations.push(" " + variation + ".");
      });
      
      // Remove duplicates
      return [...new Set(extendedVariations)];
    }
    
    const searchPatterns = createVietnameseVariations(location);
    console.log(`Search patterns: ${searchPatterns.join(', ')}`);
    
    // Use ILIKE (case-insensitive LIKE) for each pattern  
    const conditions = searchPatterns.map(pattern => 
      sql`${events.location} ILIKE ${'%' + pattern + '%'}`
    );
    
    whereConditions.push(sql`(${conditions.reduce((acc, condition, index) => 
      index === 0 ? condition : sql`${acc} OR ${condition}`
    )})`);
  }

  // Category filter
  if (category && category !== "all") {
    console.log(`Category filter: ${category}`);
    whereConditions.push(sql`LOWER(${events.type}) = LOWER(${category})`);
  }

  // Search query
  if (q) {
    const likeQuery = `%${q}%`;
    console.log(`Search filter: ${q}`);
    whereConditions.push(
      sql`(${events.name} ILIKE ${likeQuery} OR ${events.description} ILIKE ${likeQuery})`
    );
  }

  console.log(`Total where conditions: ${whereConditions.length}`);

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
      posterUrl: true,
      views: true,
      type: true,
      createdAt: true,
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

  console.log(`Found ${result.length} events`);

  // Calculate typical ticket price
  const eventsWithTypicalPrice = result.map((event) => {
    const typicalPrice = event.areas.length > 0
      ? Math.min(...event.areas.map((area) => area.price))
      : 0;
    
    console.log(`Event "${event.name}": areas prices = [${event.areas.map(a => a.price).join(', ')}], typical price = ${typicalPrice}`);
    
    return {
      ...event,
      typicalTicketPrice: typicalPrice,
      location: event.location ?? "",
      bannerUrl: event.bannerUrl ?? "",
      posterUrl: event.posterUrl ?? "",
      areas: undefined,
    };
  });

  const response = {
    events: eventsWithTypicalPrice,
    page,
    hasMore: result.length === limit,
  };

  console.log("getFilteredEvents response:", response);
  return response;
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
      posterUrl: true,
      views: true,
      type: true,
      createdAt: true,
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
      posterUrl: event.posterUrl ?? "", // Ensure posterUrl is always a string
      areas: undefined, // Remove areas from final response
    };
  });

  // Return events with Date objects for startTime and endTime
  return {
    events: eventsWithTypicalPrice,
    hasMore,
  };
}
