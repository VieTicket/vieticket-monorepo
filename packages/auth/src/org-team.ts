import { organizationClient } from "better-auth/client/plugins";
import { organization, type UserWithRole } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, memberAc } from "better-auth/plugins/organization/access";

const statement = {
    ...defaultStatements,
    seatMaps: ['read', 'write'],
    ticketInspection: ['read', 'write'],
    seatMapTemplates: ['read', 'write']
} as const;

const ac = createAccessControl(statement);

const member = ac.newRole({
    seatMaps: [...statement.seatMaps] as ('read' | 'write')[],
    ticketInspection: [...statement.ticketInspection] as ('read' | 'write')[],
    seatMapTemplates: [...statement.seatMapTemplates] as ('read' | 'write')[],
    ...memberAc.statements,
});

export const acAndRole = {
    ac,
    roles: {
        member
    }
} as const;

const allowUserToCreateOrganization = (user: UserWithRole): Promise<boolean> | boolean => {
    // Only organizers are allowed to create organizations
    return user.role === "organizer";
};

const org_team = organization({
    ...acAndRole,
    organizationHooks: {
        // Hard enforcement: creator is the only owner, everyone else is member.
        // We normalize roles so that any non-creator user cannot become admin/owner.
        beforeAddMember: async ({ member }) => {
            // If a member is being added with any role other than "owner",
            // make sure they are just a "member". This covers invites and addMember.
            if (member.role !== "owner") {
                return {
                    data: {
                        ...member,
                        role: "member",
                    },
                };
            }
        },
        beforeUpdateMemberRole: async ({ member, newRole }) => {
            // Disallow any usage of the "admin" role entirely.
            if (newRole === "admin" || newRole === "owner") {
                // We only ever want the original creator to be owner, and we never use admin.
                // To keep the rule simple and strict, we normalize all attempted escalations
                // back down to "member".
                return {
                    data: {
                        ...member,
                        role: "member",
                    },
                };
            }
        },
    },
    allowUserToCreateOrganization,
    requireEmailVerificationOnInvitation: true,
});

export const org_client = organizationClient({
    // Client-side organization plugin mirrors server configuration.
    // Dynamic access control and internal teams are intentionally disabled.
    ...acAndRole,
});

export default org_team;