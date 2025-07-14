"use server";

import { getAuthSession } from "@/lib/auth/auth";
import { saveSeatMap, getUserSeatMaps, searchUserSeatMaps } from "@vieticket/services/seat-map";
import { Shape } from "@vieticket/db/mongo/models/seat-map";
import { headers as headersFn } from "next/headers";
import { User } from "@vieticket/db/pg/models/users";

export async function saveSeatMapAction(
    shapes: Shape[],
    name: string,
    imageUrl: string
) {
    try {
        const session = await getAuthSession(await headersFn());
        const user = session?.user;

        if (!user) {
            throw new Error("Unauthenticated: Please sign in to save seat maps.");
        }

        const savedSeatMap = await saveSeatMap(shapes, name, imageUrl, user as User);

        // Force the object to be plain and serializable before sending to the client.
        // This uses the `toJSON` transform in your schema to correctly handle the `_id` field.
        const plainData = JSON.parse(JSON.stringify(savedSeatMap));

        return { success: true, data: plainData };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: errorMessage };
    }
}

export async function getUserSeatMapsAction() {
    try {
        const session = await getAuthSession(await headersFn());
        const user = session?.user;

        if (!user) {
            throw new Error("Unauthenticated: Please sign in to access seat maps.");
        }

        const seatMaps = await getUserSeatMaps(user as User);

        // Force the objects to be plain and serializable
        const plainData = JSON.parse(JSON.stringify(seatMaps));

        return { success: true, data: plainData };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: errorMessage };
    }
}

export async function searchSeatMapsAction(searchQuery: string) {
    try {
        const session = await getAuthSession(await headersFn());
        const user = session?.user;

        if (!user) {
            throw new Error("Unauthenticated: Please sign in to search seat maps.");
        }

        const seatMaps = await searchUserSeatMaps(searchQuery, user as User);

        // Force the objects to be plain and serializable
        const plainData = JSON.parse(JSON.stringify(seatMaps));

        return { success: true, data: plainData };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: errorMessage };
    }
}