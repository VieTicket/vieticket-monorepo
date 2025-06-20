import { eq } from "drizzle-orm";
import { db } from "../db";
import { organizers, user } from "@vieticket/db/postgres/schema";


export async function getOrganizerById(id: string) {
    return db.query.organizers.findFirst({
        where: eq(organizers.id, id),
    });
};

export async function getUserById(id: string) {
    return db.query.user.findFirst({
        where: eq(user.id, id),
    });
};