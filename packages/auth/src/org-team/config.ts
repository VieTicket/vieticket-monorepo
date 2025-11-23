import { createAccessControl } from "better-auth/plugins";
import { defaultStatements, memberAc } from 'better-auth/plugins/organization/access'

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
