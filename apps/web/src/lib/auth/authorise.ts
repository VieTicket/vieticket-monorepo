"use server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { user } from "@vieticket/db/pg/schema";
import { headers } from "next/headers";
import { Role } from "@vieticket/db/pg/schema";

/**
 * Server-side authorization utility for protecting API routes, server actions, and middleware.
 * 
 * Uses better-auth to validate user sessions and optionally checks role-based permissions.
 * This function should be called at the beginning of protected server-side operations.
 * 
 * @deprecated - Authorisation should be implemented in service layer
 * 
 * @param userTypes - Optional role(s) required to access the resource. Can be:
 *   - Single role: `"customer"` or `"organizer"` 
 *   - Multiple roles: `["customer", "organizer"]`
 *   - Omit to allow any authenticated user
 * 
 * @returns Promise<SessionData> - The authenticated user session data
 * 
 * @throws {Error} When:
 *   - No valid session found (user not logged in)
 *   - User not found in database
 *   - User lacks required role permissions
 * 
 * @example
 * ```typescript
 * // API Route - Any authenticated user
 * export async function GET() {
 *   const session = await authorise();
 *   // ... handle request
 * }
 * 
 * // API Route - Only organizers
 * export async function POST() {
 *   const session = await authorise("organizer");
 *   // ... create event
 * }
 * 
 * // Server Action - Multiple roles
 * export async function updateProfile() {
 *   const session = await authorise(["customer", "organizer"]);
 *   // ... update profile
 * }
 * 
 * // Middleware or protected page
 * export async function protectedOperation() {
 *   try {
 *     const session = await authorise("admin");
 *     // ... admin only operation
 *   } catch (error) {
 *     redirect("/login");
 *   }
 * }
 * ```
 */
export async function authorise(userTypes?: Role | Role[]) {
    const sessionData = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!sessionData) {
        throw new Error('No valid session found');
    }

    const userData = await db.query.user.findFirst({
        columns: { role: true },
        where: eq(user.id, sessionData.user.id)
    });
    
    if (!userData) {
        throw new Error('User not found in database');
    }

    if (!userTypes) {
        return sessionData;
    }

    // Convert single role to array for consistent handling
    const allowedRoles = Array.isArray(userTypes) ? userTypes : [userTypes];
    
    if (!allowedRoles.includes(userData.role as Role)) {
        throw new Error('Insufficient permissions for this resource');
    }

    return sessionData;
}