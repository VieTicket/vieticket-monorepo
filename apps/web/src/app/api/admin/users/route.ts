import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { user } from "@vieticket/db/pg/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    // Authorize admin access
    await authorise("admin");

    // Fetch all users with their details
    const users = await db.query.user.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [desc(user.createdAt)],
    });

    return Response.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
