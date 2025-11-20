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
import {
  AreaModeContainer,
  GridShape,
  RowShape,
  SeatShape,
  FreeShape,
} from "@/components/seat-map/types";

// ✅ Enhanced action to create empty seat map with area mode support
export async function createEmptySeatMapAction(name?: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to create seat maps.");
    }

    // Create empty seat map with no shapes
    const defaultName = name || `New Seat Map`;
    const emptyShapes: CanvasItem[] = [];
    const placeholderImageUrl = "https://placehold.co/600x400";

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

// ✅ Enhanced save action with hierarchical validation
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

    // ✅ Enhanced client-side validation for new shape types
    const validShapes = shapes.every((shape) => {
      // Basic validation
      if (!shape.id || !shape.type || !shape.name) {
        console.error("Invalid shape: missing required properties", shape);
        return false;
      }

      // ✅ Validate freeshape if present
      if (shape.type === "freeshape") {
        const freeShape = shape as FreeShape;
        if (!Array.isArray(freeShape.points) || freeShape.points.length < 2) {
          console.error("Invalid freeshape: insufficient points", freeShape);
          return false;
        }

        const validPoints = freeShape.points.every(
          (point) =>
            typeof point.x === "number" &&
            typeof point.y === "number" &&
            ["move", "curve", "line"].includes(point.type)
        );

        if (!validPoints) {
          console.error("Invalid freeshape: invalid points", freeShape.points);
          return false;
        }
      }

      // ✅ Validate area mode container if present
      if (shape.id === "area-mode-container-id" && shape.type === "container") {
        const areaModeContainer = shape as AreaModeContainer;

        if (!areaModeContainer.defaultSeatSettings) {
          console.error(
            "Invalid area mode container: missing default settings"
          );
          return false;
        }

        // Validate grid children
        const validGrids = areaModeContainer.children.every(
          (grid: GridShape) => {
            if (!grid.gridName || !grid.seatSettings) {
              console.error("Invalid grid: missing properties", grid);
              return false;
            }

            // Validate row children
            const validRows = grid.children.every((row: RowShape) => {
              if (!row.rowName || !row.gridId) {
                console.error("Invalid row: missing properties", row);
                return false;
              }

              // Validate seat children
              const validSeats = row.children.every((seat: SeatShape) => {
                if (!seat.rowId || !seat.gridId) {
                  console.error(
                    "Invalid seat: missing hierarchy properties",
                    seat
                  );
                  return false;
                }
                return true;
              });

              return validSeats;
            });

            return validRows;
          }
        );

        if (!validGrids) {
          console.error("Invalid area mode container: invalid hierarchy");
          return false;
        }
      }

      return true;
    });

    if (!validShapes) {
      throw new Error(
        "Invalid shapes detected. Please check your seat map data."
      );
    }

    const savedSeatMap = await saveSeatMap(
      shapes,
      name,
      imageUrl,
      user as User
    );

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(savedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in saveSeatMapAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

// ✅ Enhanced update action with hierarchical validation
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

    // ✅ Enhanced validation for hierarchical updates
    const validShapes = shapes.every((shape) => {
      if (!shape.id || !shape.type || !shape.name) {
        console.error("Invalid shape: missing required properties", shape);
        return false;
      }

      // ✅ Validate freeshape updates
      if (shape.type === "freeshape") {
        const freeShape = shape as FreeShape;
        if (!Array.isArray(freeShape.points) || freeShape.points.length < 2) {
          console.error("Invalid freeshape: insufficient points", freeShape);
          return false;
        }
      }

      // ✅ Validate area mode updates
      if (shape.id === "area-mode-container-id" && shape.type === "container") {
        const areaModeContainer = shape as AreaModeContainer;

        if (!areaModeContainer.defaultSeatSettings) {
          console.error(
            "Invalid area mode container: missing default settings"
          );
          return false;
        }

        // Check hierarchy integrity
        const hasValidHierarchy = areaModeContainer.children.every(
          (grid: GridShape) =>
            grid.children.every((row: RowShape) =>
              row.children.every(
                (seat: SeatShape) =>
                  seat.rowId === row.id && seat.gridId === grid.id
              )
            )
        );

        if (!hasValidHierarchy) {
          console.error("Invalid area mode container: broken hierarchy");
          return false;
        }
      }

      return true;
    });

    if (!validShapes) {
      throw new Error(
        "Invalid shapes detected. Please check your seat map data."
      );
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
    console.error("Error in updateSeatMapAction:", error);
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

// ✅ Enhanced getSeatMapGridDataAction with better area mode handling
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

    // ✅ Enhanced grid data extraction
    const grids = areaModeContainer.children || [];
    const defaultSeatSettings = areaModeContainer.defaultSeatSettings || {
      seatSpacing: 25,
      rowSpacing: 40,
      seatRadius: 8,
      seatColor: 0x4caf50,
      seatStrokeColor: 0x2e7d32,
      seatStrokeWidth: 1,
      price: 0,
    };

    // ✅ Calculate statistics with enhanced validation
    let totalSeats = 0;
    let totalRevenue = 0;
    const areas = grids
      .filter(
        (grid: GridShape) =>
          Array.isArray(grid.children) &&
          grid.children.some(
            (row: RowShape) =>
              Array.isArray(row.children) && row.children.length > 0
          )
      )
      .map((grid: GridShape) => {
        const gridSeats = grid.children.reduce(
          (acc: number, row: RowShape) => acc + (row.children?.length || 0),
          0
        );
        const gridPrice = grid.seatSettings?.price || defaultSeatSettings.price;
        const gridRevenue = gridSeats * gridPrice;

        totalSeats += gridSeats;
        totalRevenue += gridRevenue;

        return {
          id: grid.id,
          name: grid.gridName,
          rows: grid.children.map((row: RowShape) => ({
            id: row.id,
            name: row.rowName,
            seats: row.children || [],
            seatSpacing: row.seatSpacing,
            labelPlacement: row.labelPlacement,
          })),
          seatSettings: grid.seatSettings,
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

    console.log("✅ Enhanced seat map grid data extraction:", {
      seatMapId,
      gridCount: grids.length,
      totalSeats,
      totalRevenue,
      hasValidHierarchy: areas.length > 0,
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
