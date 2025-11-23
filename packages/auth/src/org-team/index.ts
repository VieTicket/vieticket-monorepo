import { db } from "@vieticket/db/pg/direct";
import { organizers, user as userSchema } from "@vieticket/db/pg/schemas/users";
import { type User } from "better-auth";
import { organization } from "better-auth/plugins";
import { eq, type InferSelectModel } from "drizzle-orm";
import { sendOrganizationInvitationEmail } from "../emails/org-invitation";
import { acAndRole } from "./config";

const allowUserToCreateOrganization = async (user: User): Promise<boolean> => {
    const appUser = user as InferSelectModel<typeof userSchema>;
    // Only organizers are allowed to create organizations
    if (appUser.role !== "organizer") {
        return false;
    }

    // Check if the organizer is active (approved by admin)
    const organizerRecord = await db.query.organizers.findFirst({
        where: eq(organizers.id, user.id),
        columns: {
            isActive: true
        }
    });

    return organizerRecord?.isActive === true;
};

const org_team = organization({
    ...acAndRole,
    organizationHooks: {
        // Enforce that only users with global "organizer" role can be "owner" of an organization.
        // All other users (customers) must be "member".
        // We also disallow "admin" role, normalizing it to "member".
        beforeAddMember: async ({ member }) => {
            // Check if the user has the global "organizer" role
            const userRecord = await db.query.user.findFirst({
                where: eq(userSchema.id, member.userId),
                columns: { role: true }
            });

            const isOrganizer = userRecord?.role === "organizer";

            if (member.role === "owner") {
                if (!isOrganizer) {
                    // Downgrade to member if not an organizer
                    return {
                        data: {
                            ...member,
                            role: "member",
                        },
                    };
                }
                // Allow owner if they are an organizer
                return;
            }

            // For any other role (e.g. admin), force to "member"
            if (member.role !== "member") {
                return {
                    data: {
                        ...member,
                        role: "member",
                    },
                };
            }
        },
        beforeUpdateMemberRole: async ({ member, newRole }) => {
            // Disallow "admin" role entirely
            if (newRole === "admin") {
                return {
                    data: {
                        ...member,
                        role: "member",
                    },
                };
            }

            // If upgrading to "owner", check global role
            if (newRole === "owner") {
                 const userRecord = await db.query.user.findFirst({
                    where: eq(userSchema.id, member.userId),
                    columns: { role: true }
                });
                
                if (userRecord?.role !== "organizer") {
                    // Prevent upgrade to owner if not organizer
                    // We return the member with "member" role (or their current role if we knew it, but "member" is safe fallback)
                    return {
                        data: {
                            ...member,
                            role: "member",
                        },
                    };
                }
            }
        },
    },
    allowUserToCreateOrganization,
    sendInvitationEmail: sendOrganizationInvitationEmail,
    requireEmailVerificationOnInvitation: true,
});

export default org_team;