import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { organizers, user } from "@vieticket/db/pg/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authorize admin access
    await authorise("admin");

    const userId = (await params).id;

    // Fetch organizer with user info
    const organizerData = await db
      .select({
        id: organizers.id,
        name: organizers.name,
        foundedDate: organizers.foundedDate,
        website: organizers.website,
        isActive: organizers.isActive,
        address: organizers.address,
        organizerType: organizers.organizerType,
        taxCode: organizers.taxCode,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        userImage: user.image,
        userCreatedAt: user.createdAt,
        userBanned: user.banned,
        userBanReason: user.banReason,
      })
      .from(organizers)
      .innerJoin(user, eq(organizers.id, user.id))
      .where(eq(organizers.id, userId))
      .limit(1);

    if (organizerData.length === 0) {
      return Response.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    const row = organizerData[0];

    // Transform to nested structure
    const organizer = {
      id: row.id,
      name: row.name,
      foundedDate: row.foundedDate?.toISOString() || null,
      website: row.website,
      isActive: row.isActive,
      address: row.address,
      organizerType: row.organizerType,
      taxCode: row.taxCode,
      user: {
        id: row.userId,
        name: row.userName,
        email: row.userEmail,
        phone: row.userPhone,
        image: row.userImage,
        createdAt: row.userCreatedAt?.toISOString() || "",
        banned: row.userBanned,
        banReason: row.userBanReason,
      },
    };

    return Response.json({ organizer });
  } catch (error) {
    console.error("Error fetching organizer:", error);
    return Response.json(
      { error: "Failed to fetch organizer" },
      { status: 500 }
    );
  }
}

