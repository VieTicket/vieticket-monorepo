"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  saveSeatMap,
  getUserSeatMaps,
  searchUserSeatMaps,
  getSeatMapById,
  updateSeatMap,
  getPublicSeatMaps,
  createSeatMapDraft,
} from "@vieticket/services/seat-map";
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

    const savedSeatMap = await saveSeatMap(
      shapes,
      name,
      imageUrl,
      user as User
    );

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

export async function loadSeatMapAction(seatMapId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to load seat maps.");
    }

    const seatMap = await getSeatMapById(seatMapId, user as User);

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(seatMap));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function updateSeatMapAction(
  seatMapId: string,
  shapes: Shape[],
  name?: string,
  imageUrl?: string
) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to update seat maps.");
    }

    const updatedSeatMap = await updateSeatMap(
      seatMapId,
      shapes,
      user as User,
      name,
      imageUrl
    );

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(updatedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function getPublicSeatMapsAction(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string
) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error(
        "Unauthenticated: Please sign in to access public seat maps."
      );
    }

    const result = await getPublicSeatMaps(page, limit, searchQuery);

    // Force the objects to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(result));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function createDraftFromPublicSeatMapAction(
  originalSeatMapId: string,
  draftName: string
) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to create drafts.");
    }

    const draft = await createSeatMapDraft(
      originalSeatMapId,
      draftName,
      user as User
    );

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(draft));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
