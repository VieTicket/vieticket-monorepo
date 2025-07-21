import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { user } from "@vieticket/db/pg/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authorize admin access
    await authorise("admin");

    const { banned, banReason, banExpires } = await request.json();
    const userId = params.id;

    // Update user's banned status
    await db
      .update(user)
      .set({
        banned: banned,
        banReason: banned
          ? banReason || "Account locked by administrator"
          : null,
        banExpires: banned ? (banExpires ? new Date(banExpires) : null) : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    return Response.json({
      success: true,
      message: banned
        ? "Account locked successfully"
        : "Account unlocked successfully",
    });
  } catch (error) {
    console.error("Error updating user lock status:", error);
    return Response.json(
      { error: "Failed to update user lock status" },
      { status: 500 }
    );
  }
}
