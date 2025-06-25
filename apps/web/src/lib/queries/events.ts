"use server";

import { db } from "@/lib/db";
import { Event, events } from "@vieticket/db/postgres/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";

const SORTABLE_COLUMNS = {
    views: events.views,
    startTime: events.startTime,
    createdAt: events.createdAt,
} as const;

export type SortableEventColumnKey = keyof typeof SORTABLE_COLUMNS;

export type EventSummary = Pick<Event, 'id' | 'name' | 'slug' | 'startTime' | 'endTime' | 'location' | 'views' | 'bannerUrl' | 'type'> & {
    typicalTicketPrice: number;
    organizer: { id: string; name: string };
} & Partial<Pick<Event, SortableEventColumnKey>>;

export type EventSummaryResponse = Promise<{
    events: EventSummary[];
    hasMore: boolean;
}>;

export type EventCursor = {
    sortValue: number | Date;
    id: string;
};

export async function getEventSummaries({
    limit = 4,
    cursor,
    sortColumnKey = 'startTime'
}: {
    limit?: number;
    cursor?: EventCursor;
    sortColumnKey?: SortableEventColumnKey;
}): EventSummaryResponse {

    const sortBy = SORTABLE_COLUMNS[sortColumnKey]!;

    const whereConditions = [
        eq(events.isApproved, true),
    ];

    if (cursor) {
        // Handle cursor pagination with composite conditions
        const cursorCondition = or(
            lt(sortBy, cursor.sortValue),
            and(
                eq(sortBy, cursor.sortValue),
                lt(events.id, cursor.id)
            )
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
                }
            },
            areas: {
                columns: {
                    price: true,
                }
            }
        },
        where: and(...whereConditions)
    });

    // Check if there are more items
    const hasMore = eventList.length > limit;
    if (hasMore) {
        eventList.pop(); // Remove the extra item
    }

    // Calculate typical ticket price (minimum price from all areas)
    const eventsWithTypicalPrice = eventList.map(event => {
        const typicalTicketPrice = event.areas.length > 0 
            ? Math.min(...event.areas.map(area => area.price))
            : 0;

        return {
            ...event,
            typicalTicketPrice,
            organizer: event.organizer,
            areas: undefined, // Remove areas from final response
        };
    });

    return { 
        events: eventsWithTypicalPrice as EventSummary[], 
        hasMore 
    };
}
