import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { events } from "./events-schemas";
import { organizers, user } from "./users-schemas";

export const eventRatings = pgTable(
  "ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    stars: integer("stars").notNull(), // 1..5 validated at service level
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_event_ratings_event_id").on(table.eventId),
    index("idx_event_ratings_user_id").on(table.userId),
  ]
);

export const organizerRatingStats = pgTable(
  "organizer_rating_stats",
  {
    organizerId: text("organizer_id")
      .primaryKey()
      .references(() => organizers.id, { onDelete: "cascade" }),
    totalStars: integer("total_stars").notNull().default(0),
    ratingsCount: integer("ratings_count").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);


