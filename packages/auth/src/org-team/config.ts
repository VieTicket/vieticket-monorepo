import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, ownerAc } from 'better-auth/plugins/organization/access'

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
    ac: ["read"],
});

const owner = ac.newRole({
    ...ownerAc.statements
})

export const acAndRole = {
    ac,
    roles: {
        member,
        owner
    }
} as const;
