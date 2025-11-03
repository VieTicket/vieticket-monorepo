// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { events, areas, organizers } from "@vieticket/db/pg/schemas/events";
// import { and, eq, sql, desc, or } from "drizzle-orm";

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const page = parseInt(searchParams.get("page") || "1");
//   const limit = parseInt(searchParams.get("limit") || "6");
//   const price = searchParams.get("price") || "all";
//   const date = searchParams.get("date") || "all";
//   const location = searchParams.get("location") || "all";
//   const category = searchParams.get("category") || "all";
//   const q = searchParams.get("q") || "";

//   const whereConditions = [eq(events.approvalStatus, "approved")];

//   // Price filter
//   if (price && price !== "all") {
//     const priceRanges: Record<string, [number, number]> = {
//       lt500k: [0, 500000],
//       "500k-1m": [500000, 1000000],
//       "1m-3m": [1000000, 3000000],
//       "3m-5m": [3000000, 5000000],
//       gt5m: [5000000, Infinity],
//     };

//     const [minPrice, maxPrice] = priceRanges[price] || [0, Infinity];
//     whereConditions.push(
//       sql`EXISTS (
//         SELECT 1 FROM ${areas}
//         WHERE areas.event_id = events.id
//         AND areas.price >= $1
//         ${maxPrice !== Infinity ? sql`AND areas.price <= ${maxPrice}` : sql``}
//       )`
//     );
//   }

//   // Date filter
//   if (date && date !== "all") {
//     if (date === "today") {
//       whereConditions.push(sql`DATE(${events.startTime}) = CURRENT_DATE`);
//     } else if (date === "thisWeek") {
//       whereConditions.push(
//         sql`${events.startTime} BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '7 days')`
//       );
//     }
//   }

//   // Location filter
//   if (location && location !== "all") {
//     whereConditions.push(eq(events.location, location));
//   }

//   // Category filter - handle URL encoded categories
//   if (category && category !== "all") {
//     const decodedCategory = decodeURIComponent(category);
//     whereConditions.push(eq(events.type, decodedCategory));
//   }

//   // Search query
//   if (q) {
//     whereConditions.push(
//       sql`to_tsvector('english', ${events.name} || ' ' || COALESCE(${events.description}, '')) @@ plainto_tsquery('english', ${q})`
//     );
//   }

//   // Use the relational query to get events with areas and organizers
//   const result = await db.query.events.findMany({
//     limit,
//     offset: (page - 1) * limit,
//     orderBy: [desc(events.startTime)],
//     columns: {
//       id: true,
//       name: true,
//       slug: true,
//       startTime: true,
//       endTime: true,
//       location: true,
//       bannerUrl: true,
//       views: true,
//       type: true,
//     },
//     with: {
//       organizer: {
//         columns: {
//           id: true,
//           name: true,
//         },
//       },
//       areas: {
//         columns: {
//           price: true,
//         },
//       },
//     },
//     where: and(...whereConditions),
//   });

//   // Calculate typical ticket price and format response
//   const eventsWithTypicalPrice = result.map((event) => ({
//     ...event,
//     typicalTicketPrice:
//       event.areas.length > 0
//         ? Math.min(...event.areas.map((area) => area.price))
//         : 0,
//     location: event.location ?? "",
//     bannerUrl: event.bannerUrl ?? "",
//     areas: undefined, // Remove areas from response to match EventSummary type
//   }));

//   return NextResponse.json({
//     events: eventsWithTypicalPrice,
//     page,
//     hasMore: result.length === limit,
//   });
// }
import { NextResponse } from "next/server";
import { getFilteredEvents } from "@/lib/queries/events";

function normalize(str: string) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "6");
  const typicalTicketPrice = searchParams.get("price") || "all";
  const date = searchParams.get("date") || "all";
  const location = searchParams.get("location") || "all";
  const category = searchParams.get("category") || "all";
  const q = searchParams.get("q") || "";
  const normalizedQ = q ? normalize(q) : "";

  const result = await getFilteredEvents({
    page,
    limit,
    price: typicalTicketPrice,
    date,
    location,
    category,
    q: normalizedQ,
  });

  return NextResponse.json(result);
}
