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
  updateSeatMapPublicityService,
  deleteSeatMapService,
} from "@vieticket/services/seat-map";
import { CanvasItem } from "@vieticket/db/mongo/models/seat-map";
import { headers as headersFn } from "next/headers";
import { User } from "@vieticket/db/pg/models/users";
import { AreaModeContainer } from "@/components/seat-map/types";

// ✅ New action to create empty seat map
export async function createEmptySeatMapAction(name?: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to create seat maps.");
    }

    // Create empty seat map with no shapes
    const defaultName =
      name || `Untitled Seat Map ${new Date().toLocaleString()}`;
    const emptyShapes: CanvasItem[] = [];
    const placeholderImageUrl =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f8f9fa'/%3E%3Ctext x='200' y='150' text-anchor='middle' dominant-baseline='middle' fill='%23666' font-family='Arial' font-size='18'%3EEmpty Canvas%3C/text%3E%3C/svg%3E";

    const savedSeatMap = await saveSeatMap(
      emptyShapes,
      defaultName,
      placeholderImageUrl,
      user as User
    );

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(savedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

// ... rest of existing actions remain unchanged
export async function saveSeatMapAction(
  shapes: CanvasItem[],
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
    const plainData = JSON.parse(JSON.stringify(savedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function updateSeatMapAction(
  seatMapId: string,
  shapes: CanvasItem[],
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

// ✅ Keep all other existing actions unchanged
export async function getUserSeatMapsAction() {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to access seat maps.");
    }

    const seatMaps = await getUserSeatMaps(user as User);
    if (!seatMaps) {
      return { success: true, data: [] };
    }

    return { success: true, data: seatMaps };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

// Add this new action
export async function getSeatMapGridDataAction(seatMapId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to load seat maps.");
    }

    const seatMap = await getSeatMapById(seatMapId);

    if (!seatMap) {
      throw new Error("Seat map not found");
    }

    // ✅ Extract area mode container from shapes
    const areaModeContainer = seatMap.shapes?.find(
      (shape: any) =>
        shape.id === "area-mode-container-id" && shape.type === "container"
    ) as AreaModeContainer;

    if (!areaModeContainer) {
      console.warn("⚠️ No area mode container found in seat map");
      return {
        success: true,
        data: {
          seatMap: JSON.parse(JSON.stringify(seatMap)),
          gridData: null,
          preview: {
            areas: [],
            totalSeats: 0,
            totalRevenue: 0,
          },
        },
      };
    }

    // ✅ Extract grids and default settings
    const grids = areaModeContainer.grids || [];
    const defaultSeatSettings = areaModeContainer.defaultSeatSettings || {
      seatSpacing: 25,
      rowSpacing: 40,
      seatRadius: 8,
      seatColor: 0x4caf50,
      seatStrokeColor: 0x2e7d32,
      seatStrokeWidth: 1,
      price: 0,
    };

    // ✅ Calculate statistics for preview
    let totalSeats = 0;
    let totalRevenue = 0;
    const areas = grids
      .filter(
        (grid: any) =>
          grid.rows &&
          grid.rows.some((row: any) => row.seats && row.seats.length > 0)
      )
      .map((grid: any) => {
        const gridSeats = grid.rows.reduce(
          (acc: number, row: any) => acc + (row.seats?.length || 0),
          0
        );
        const gridPrice = grid.seatSettings?.price || defaultSeatSettings.price;
        const gridRevenue = gridSeats * gridPrice;

        totalSeats += gridSeats;
        totalRevenue += gridRevenue;

        return {
          id: grid.id,
          name: grid.name,
          rows: grid.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            seats: row.seats || [],
            bend: row.bend,
            seatSpacing: row.seatSpacing,
          })),
          price: gridPrice,
          seatCount: gridSeats,
        };
      });

    const plainData = {
      seatMap: JSON.parse(JSON.stringify(seatMap)),
      gridData: {
        grids: JSON.parse(JSON.stringify(grids)),
        defaultSeatSettings: JSON.parse(JSON.stringify(defaultSeatSettings)),
      },
      preview: {
        areas,
        totalSeats,
        totalRevenue,
      },
    };

    console.log("✅ Extracted seat map grid data:", {
      seatMapId,
      gridCount: grids.length,
      totalSeats,
      totalRevenue,
    });

    return { success: true, data: plainData };
  } catch (error) {
    console.error("❌ Error in getSeatMapGridDataAction:", error);
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

    const seatMap = await getSeatMapById(seatMapId);
    const plainData = JSON.parse(JSON.stringify(seatMap));

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
    const plainData = JSON.parse(JSON.stringify(result));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in getPublicSeatMapsAction:", error);
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

    const plainData = JSON.parse(JSON.stringify(draft));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in createDraftFromPublicSeatMapAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function publishSeatMapAction(seatMapId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to publish seat maps.");
    }

    const updatedSeatMap = await updateSeatMapPublicityService(
      seatMapId,
      "public",
      user as User
    );

    const plainData = JSON.parse(JSON.stringify(updatedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in publishSeatMapAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function deleteSeatMapAction(seatMapId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to delete seat maps.");
    }

    const deletedSeatMap = await deleteSeatMapService(seatMapId, user as User);
    const plainData = JSON.parse(JSON.stringify(deletedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in deleteSeatMapAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
