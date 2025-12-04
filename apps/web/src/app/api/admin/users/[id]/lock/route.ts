import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { user } from "@vieticket/db/pg/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authorize admin access
    await authorise("admin");

    const { banned, banReason, banExpires } = await request.json();
    const userId = (await params).id;

    // Prevent locking admin accounts
    if (banned) {
      const targetUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
      });

      if (targetUser && targetUser.role === "admin") {
        return Response.json(
          { error: "Cannot lock admin accounts. Admin accounts are protected." },
          { status: 403 }
        );
      }
    }

    // Validate ban expiration date if banning user
    if (banned && banExpires) {
      const banExpiresDate = new Date(banExpires);
      const now = new Date();
      
      // Check if date is invalid
      if (isNaN(banExpiresDate.getTime())) {
        return Response.json(
          { error: "Invalid ban expiration time. Please select again." },
          { status: 400 }
        );
      }
      
      // Check if date is in the past (with 1 second buffer to account for timing)
      if (banExpiresDate.getTime() <= now.getTime()) {
        return Response.json(
          { error: "Ban expiration time cannot be in the past. Please select a future time." },
          { status: 400 }
        );
      }
    }

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
