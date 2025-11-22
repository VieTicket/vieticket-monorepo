import { db } from "@vieticket/db/pg/direct";
import { member } from "@vieticket/db/pg/schemas/users";
import { and, eq } from "drizzle-orm";
import { acAndRole } from "../org-team";

/**
 * Checks if a user is a member of a specific organization.
 * 
 * @param userId The ID of the user.
 * @param organizationId The ID of the organization.
 * @returns True if the user is a member, false otherwise.
 */
export async function checkUserMembership(userId: string, organizationId: string): Promise<boolean> {
    const record = await db.query.member.findFirst({
        where: and(
            eq(member.userId, userId),
            eq(member.organizationId, organizationId)
        ),
        columns: {
            id: true
        }
    });
    return !!record;
}

/**
 * Checks if a user has a specific permission in a specific organization.
 * 
 * @param userId The ID of the user.
 * @param organizationId The ID of the organization.
 * @param resource The resource to check permission for.
 * @param action The action to check permission for.
 * @returns True if the user has the permission, false otherwise.
 */
export async function checkUserPermission(
    userId: string, 
    organizationId: string, 
    resource: string, 
    action: string
): Promise<boolean> {
    const record = await db.query.member.findFirst({
        where: and(
            eq(member.userId, userId),
            eq(member.organizationId, organizationId)
        ),
        columns: {
            role: true
        }
    });

    if (!record) {
        return false;
    }

    const userRole = record.role;

    if (userRole === "owner") {
        return true;
    }

    if (userRole === "member") {
        const memberRole = acAndRole.roles.member;
        
        // The role object contains a 'statements' property which holds the permissions
        const statements = memberRole.statements;
        
        // Check if the resource is a valid key in the member role statements
        if (resource in statements) {
            const allowedActions = (statements as Record<string, readonly string[]>)[resource];
            if (Array.isArray(allowedActions)) {
                return allowedActions.includes(action);
            }
        }
    }

    return false;
}
