import { InferInsertModel } from "drizzle-orm";
import { createDb } from "../postgres/connection";
import {
  events,
  areas,
  rows,
  seats,
  organizers,
  user,
} from "../postgres/schema";
import { config } from "dotenv";

config({ path: ".env" });

type NewArea = InferInsertModel<typeof areas>;
type NewOrganizer = InferInsertModel<typeof organizers>;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const db = createDb(process.env.DATABASE_URL);

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Create sample users/organizers first
    const sampleUsers = [
      {
        id: "Zt7RNyXFqweuKPqLAmXJ4SFr1Y6GH9bE",
        name: "Vietnam Events Co.",
        email: "info@vtk.io.vn",
        role: "organizer" as const,
        emailVerified: true,
      },
      {
        id: "oVqLW3EkJtMUY8cwnsZABRxD5TvXplr2",
        name: "Saigon Entertainment",
        email: "contact@vtk.io.vn",
        role: "organizer" as const,
        emailVerified: true,
      },
      {
        id: "J1UXnbHd93rCFYzVeLKT0GsqMwQpW7aG",
        name: "Hanoi Cultural Center",
        email: "events@vtk.io.vn",
        role: "organizer" as const,
        emailVerified: true,
      },
    ];

    // Insert users
    for (const userData of sampleUsers) {
      await db.insert(user).values(userData).onConflictDoNothing();
    }

    // Create organizer records
    const sampleOrganizers: NewOrganizer[] = [
      {
        id: "Zt7RNyXFqweuKPqLAmXJ4SFr1Y6GH9bE",
        name: "Vietnam Events Co.",
        foundedDate: new Date("2015-03-15"),
        website: "https://vietnamevents.vn",
        isActive: true,
        address: "123 Nguyen Hue, District 1, Ho Chi Minh City",
        organizerType: "Entertainment",
      },
      {
        id: "oVqLW3EkJtMUY8cwnsZABRxD5TvXplr2",
        name: "Saigon Entertainment",
        foundedDate: new Date("2018-08-20"),
        website: "https://saigonentertainment.com",
        isActive: true,
        address: "456 Le Loi, District 1, Ho Chi Minh City",
        organizerType: "Entertainment",
      },
      {
        id: "J1UXnbHd93rCFYzVeLKT0GsqMwQpW7aG",
        name: "Hanoi Cultural Center",
        foundedDate: new Date("2010-01-10"),
        website: "https://hanoiculture.gov.vn",
        isActive: true,
        address: "789 Ba Dinh, Hanoi",
        organizerType: "Cultural",
      },
    ];

    for (const organizerData of sampleOrganizers) {
      await db.insert(organizers).values(organizerData).onConflictDoNothing();
    }

    // Create sample events
    const sampleEvents = [
      {
        name: "Vietnam Music Festival 2025",
        slug: "vietnam-music-festival-2025",
        description:
          "The biggest music festival in Vietnam featuring international and local artists across multiple genres.",
        startTime: new Date("2025-07-15T18:00:00Z"),
        endTime: new Date("2025-07-17T23:00:00Z"),
        location: "Hoi An Ancient Town, Quang Nam",
        type: "Music",
        ticketSaleStart: new Date("2025-03-01T00:00:00Z"),
        ticketSaleEnd: new Date("2025-07-10T23:59:59Z"),
        posterUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/0.webp",
        bannerUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/1.webp",
        views: 15420,
        isApproved: true,
        organizerId: "Zt7RNyXFqweuKPqLAmXJ4SFr1Y6GH9bE",
      },
      {
        name: "Tech Conference Ho Chi Minh City 2025",
        slug: "tech-conference-hcmc-2025",
        description:
          "Annual technology conference bringing together industry leaders, developers, and innovators.",
        startTime: new Date("2025-08-20T08:00:00Z"),
        endTime: new Date("2025-08-22T18:00:00Z"),
        location: "Saigon Exhibition and Convention Center",
        type: "Conference",
        ticketSaleStart: new Date("2025-04-01T00:00:00Z"),
        ticketSaleEnd: new Date("2025-08-15T23:59:59Z"),
        posterUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/2.webp",
        bannerUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/3.webp",
        views: 8930,
        isApproved: true,
        organizerId: "oVqLW3EkJtMUY8cwnsZABRxD5TvXplr2",
      },
      {
        name: "Vietnamese Food Festival",
        slug: "vietnamese-food-festival-2025",
        description:
          "Celebrate Vietnam's rich culinary heritage with traditional dishes from all regions.",
        startTime: new Date("2025-09-10T10:00:00Z"),
        endTime: new Date("2025-09-12T22:00:00Z"),
        location: "Ben Thanh Market Area, Ho Chi Minh City",
        type: "Food",
        ticketSaleStart: new Date("2025-06-01T00:00:00Z"),
        ticketSaleEnd: new Date("2025-09-08T23:59:59Z"),
        posterUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/4.webp",
        bannerUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/0.webp",
        views: 12100,
        isApproved: true,
        organizerId: "Zt7RNyXFqweuKPqLAmXJ4SFr1Y6GH9bE",
      },
      {
        name: "Art Exhibition: Modern Vietnam",
        slug: "art-exhibition-modern-vietnam",
        description:
          "Contemporary Vietnamese art exhibition showcasing works by emerging and established artists.",
        startTime: new Date("2025-06-25T09:00:00Z"),
        endTime: new Date("2025-07-25T18:00:00Z"),
        location: "Fine Arts Museum, Hanoi",
        type: "Art",
        ticketSaleStart: new Date("2025-05-01T00:00:00Z"),
        ticketSaleEnd: new Date("2025-07-20T23:59:59Z"),
        posterUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/1.webp",
        bannerUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/2.webp",
        views: 3456,
        isApproved: true,
        organizerId: "J1UXnbHd93rCFYzVeLKT0GsqMwQpW7aG",
      },
      {
        name: "Comedy Night Stand-up Show",
        slug: "comedy-night-standup-2025",
        description:
          "An evening of laughter with Vietnam's best stand-up comedians and special international guests.",
        startTime: new Date("2025-07-05T20:00:00Z"),
        endTime: new Date("2025-07-05T22:30:00Z"),
        location: "Diamond Plaza, Ho Chi Minh City",
        type: "Comedy",
        ticketSaleStart: new Date("2025-05-15T00:00:00Z"),
        ticketSaleEnd: new Date("2025-07-05T18:00:00Z"),
        posterUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/3.webp",
        bannerUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/4.webp",
        views: 6780,
        isApproved: true,
        organizerId: "oVqLW3EkJtMUY8cwnsZABRxD5TvXplr2",
      },
      {
        name: "Sports Tournament: Badminton Championship",
        slug: "badminton-championship-2025",
        description:
          "National badminton championship featuring top players from across Vietnam.",
        startTime: new Date("2025-08-15T08:00:00Z"),
        endTime: new Date("2025-08-17T18:00:00Z"),
        location: "Phu Tho Stadium, Ho Chi Minh City",
        type: "Sports",
        ticketSaleStart: new Date("2025-06-01T00:00:00Z"),
        ticketSaleEnd: new Date("2025-08-14T23:59:59Z"),
        posterUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/0.webp",
        bannerUrl:
          "https://res.luxerent.shop/products/gucci-floral-ruffle-dress_maysuoua4n3d/1.webp",
        views: 4523,
        isApproved: true,
        organizerId: "J1UXnbHd93rCFYzVeLKT0GsqMwQpW7aG",
      },
    ];

    // Insert events and get their IDs
    const insertedEvents = await db
      .insert(events)
      .values(sampleEvents)
      .returning();
    console.log(`✅ Inserted ${insertedEvents.length} events`);

    // Create areas, rows, and seats for each event
    for (const event of insertedEvents) {
      // Create 2-3 areas per event with different pricing
      const eventAreas: NewArea[] = [
        {
          eventId: event.id,
          name: "VIP Section",
          price: 750000.0,
        },
        {
          eventId: event.id,
          name: "Standard Section",
          price: 350000.0,
        },
        {
          eventId: event.id,
          name: "Economy Section",
          price: 150000.0,
        },
      ];

      const insertedAreas = await db
        .insert(areas)
        .values(eventAreas)
        .returning();

      for (const area of insertedAreas) {
        // Create 3-5 rows per area
        const rowCount = Math.floor(Math.random() * 3) + 3; // 3-5 rows
        const areaRows = [];

        for (let i = 1; i <= rowCount; i++) {
          areaRows.push({
            areaId: area.id,
            rowName: `Row ${String.fromCharCode(64 + i)}`, // Row A, Row B, etc.
          });
        }

        const insertedRows = await db.insert(rows).values(areaRows).returning();

        for (const row of insertedRows) {
          // Create 8-12 seats per row
          const seatCount = Math.floor(Math.random() * 5) + 8; // 8-12 seats
          const rowSeats = [];

          for (let i = 1; i <= seatCount; i++) {
            rowSeats.push({
              rowId: row.id,
              seatNumber: i.toString().padStart(2, "0"), // 01, 02, 03, etc.
            });
          }

          await db.insert(seats).values(rowSeats);
        }
      }
    }

    console.log("✅ Created areas, rows, and seats for all events");
    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed script
if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seeding finished. Exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seed };
