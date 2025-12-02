"use server";

import { getAuthSession } from "@/lib/auth/auth";
import { auth } from "@/lib/auth/auth";
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
  getUserSeatMapsWithEventInfo,
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
  SeatGridSettings,
} from "@/components/seat-map/types";

/**
 * Helper function to get active organization ID from session
 */
async function getActiveOrganizationId(): Promise<string | null> {
  try {
    const fullOrg = await auth.api.getFullOrganization({
      headers: await headersFn(),
    });
    return fullOrg?.id ?? null;
  } catch (error) {
    return null;
  }
}

export async function createEmptySeatMapAction(name?: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to create seat maps.");
    }

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const defaultName = name || `New Seat Map`;
    const emptyShapes: CanvasItem[] = [];
    const placeholderImageUrl = "https://placehold.co/600x400";

    const savedSeatMap = await saveSeatMap(
      emptyShapes,
      defaultName,
      placeholderImageUrl,
      user as User,
      organizationId
    );

    const plainData = JSON.parse(JSON.stringify(savedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

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

    const validShapes = shapes.every((shape) => {
      if (!shape.id || !shape.type || !shape.name) {
        console.error("Invalid shape: missing required properties", shape);
        return false;
      }

      if (shape.id === "area-mode-container-id" && shape.type === "container") {
        const areaModeContainer = shape as AreaModeContainer;

        if (!areaModeContainer.defaultSeatSettings) {
          console.error(
            "Invalid area mode container: missing default settings"
          );
          return false;
        }

        const validGrids = areaModeContainer.children.every(
          (grid: GridShape) => {
            if (
              !grid.gridName ||
              !grid.seatSettings ||
              grid.type !== "container"
            ) {
              console.error(
                "Invalid grid: missing properties or wrong type",
                grid
              );
              return false;
            }

            const validRows = grid.children.every((row: RowShape) => {
              if (!row.rowName || !row.gridId || row.type !== "container") {
                console.error(
                  "Invalid row: missing properties or wrong type",
                  row
                );
                return false;
              }

              const validSeats = row.children.every((seat: SeatShape) => {
                if (!seat.rowId || !seat.gridId || seat.type !== "ellipse") {
                  console.error(
                    "Invalid seat: missing hierarchy properties or wrong type",
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

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const savedSeatMap = await saveSeatMap(
      shapes,
      name,
      imageUrl,
      user as User,
      organizationId
    );

    const plainData = JSON.parse(JSON.stringify(savedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in saveSeatMapAction:", error);
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

    const validShapes = shapes.every((shape) => {
      if (!shape.id || !shape.type || !shape.name) {
        console.error("Invalid shape: missing required properties", shape);
        return false;
      }

      if (shape.type === "freeshape") {
        const freeShape = shape as FreeShape;
        if (!Array.isArray(freeShape.points) || freeShape.points.length < 2) {
          console.error("Invalid freeshape: insufficient points", freeShape);
          return false;
        }
      }

      if (shape.id === "area-mode-container-id" && shape.type === "container") {
        const areaModeContainer = shape as AreaModeContainer;

        if (!areaModeContainer.defaultSeatSettings) {
          console.error(
            "Invalid area mode container: missing default settings"
          );
          return false;
        }

        const hasValidHierarchy = areaModeContainer.children.every(
          (grid: GridShape) => {
            if (
              grid.type !== "container" ||
              !grid.gridName ||
              !grid.seatSettings
            ) {
              return false;
            }

            return grid.children.every((row: RowShape) => {
              if (
                row.type !== "container" ||
                !row.rowName ||
                row.gridId !== grid.id
              ) {
                return false;
              }

              return row.children.every(
                (seat: SeatShape) =>
                  seat.type === "ellipse" &&
                  seat.rowId === row.id &&
                  seat.gridId === grid.id
              );
            });
          }
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

    const plainData = JSON.parse(JSON.stringify(updatedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in updateSeatMapAction:", error);
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

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const seatMaps = await getUserSeatMapsWithEventInfo(user as User, organizationId);
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

    const areaModeContainer = seatMap.shapes?.find(
      (shape: any) =>
        shape.id === "area-mode-container-id" &&
        shape.type === "container" &&
        shape.defaultSeatSettings
    ) as AreaModeContainer | undefined;

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

    const grids: GridShape[] =
      areaModeContainer.children?.filter(
        (child): child is GridShape =>
          child.type === "container" &&
          "gridName" in child &&
          "seatSettings" in child &&
          Array.isArray(child.children) &&
          typeof child.gridName === "string" &&
          typeof child.seatSettings === "object"
      ) || [];

    const defaultSeatSettings: SeatGridSettings =
      areaModeContainer.defaultSeatSettings || {
        seatSpacing: 25,
        rowSpacing: 40,
        seatRadius: 8,
        seatColor: 0x4caf50,
        seatStrokeColor: 0x2e7d32,
        seatStrokeWidth: 1,
        price: 100000,
      };

    let totalSeats = 0;
    let totalRevenue = 0;
    const areas = grids
      .filter((grid: GridShape) => {
        return (
          Array.isArray(grid.children) &&
          grid.children.some(
            (row: RowShape) =>
              row.type === "container" &&
              Array.isArray(row.children) &&
              row.children.length > 0 &&
              row.children.every((seat: SeatShape) => seat.type === "ellipse")
          )
        );
      })
      .map((grid: GridShape) => {
        const gridSeats = grid.children.reduce((acc: number, row: RowShape) => {
          if (row.type === "container" && Array.isArray(row.children)) {
            const validSeats = row.children.filter(
              (seat: SeatShape) => seat.type === "ellipse"
            );
            return acc + validSeats.length;
          }
          return acc;
        }, 0);

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
            seats: row.children
              .filter((seat: SeatShape) => seat.type === "ellipse")
              .map((seat: SeatShape) => seat.id),
            seatSpacing: row.seatSpacing || defaultSeatSettings.seatSpacing,
            labelPlacement: row.labelPlacement || "left",
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
    console.log("Seat map grid data retrieved:", grids);

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in getSeatMapGridDataAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

const validateSeatMapStructure = (
  shapes: CanvasItem[]
): {
  isValid: boolean;
  errors: string[];
  statistics: {
    totalShapes: number;
    areaContainers: number;
    grids: number;
    rows: number;
    seats: number;
  };
} => {
  const errors: string[] = [];
  const statistics = {
    totalShapes: shapes.length,
    areaContainers: 0,
    grids: 0,
    rows: 0,
    seats: 0,
  };

  const areaContainers = shapes.filter(
    (shape) => shape.type === "container" && "defaultSeatSettings" in shape
  ) as AreaModeContainer[];

  statistics.areaContainers = areaContainers.length;

  if (areaContainers.length > 1) {
    errors.push("Multiple area mode containers found. Only one is allowed.");
  }

  areaContainers.forEach((container, containerIndex) => {
    if (!container.defaultSeatSettings) {
      errors.push(
        `Area container ${containerIndex}: Missing default seat settings`
      );
      return;
    }

    container.children?.forEach((grid, gridIndex) => {
      if (grid.type !== "container" || !("gridName" in grid)) {
        errors.push(`Grid ${gridIndex}: Invalid grid structure`);
        return;
      }

      const gridShape = grid as GridShape;
      statistics.grids++;

      if (!gridShape.seatSettings) {
        errors.push(
          `Grid ${gridIndex} (${gridShape.gridName}): Missing seat settings`
        );
      }

      gridShape.children?.forEach((row, rowIndex) => {
        if (row.type !== "container" || !("rowName" in row)) {
          errors.push(
            `Row ${rowIndex} in grid ${gridShape.gridName}: Invalid row structure`
          );
          return;
        }

        const rowShape = row as RowShape;
        statistics.rows++;

        if (rowShape.gridId !== gridShape.id) {
          errors.push(
            `Row ${rowIndex} (${rowShape.rowName}): Grid ID mismatch (${rowShape.gridId} !== ${gridShape.id})`
          );
        }

        rowShape.children?.forEach((seat, seatIndex) => {
          if (seat.type !== "ellipse") {
            errors.push(
              `Seat ${seatIndex} in row ${rowShape.rowName}: Invalid seat type (${seat.type})`
            );
            return;
          }

          const seatShape = seat as SeatShape;
          statistics.seats++;

          if (seatShape.rowId !== rowShape.id) {
            errors.push(
              `Seat ${seatIndex}: Row ID mismatch (${seatShape.rowId} !== ${rowShape.id})`
            );
          }

          if (seatShape.gridId !== gridShape.id) {
            errors.push(
              `Seat ${seatIndex}: Grid ID mismatch (${seatShape.gridId} !== ${gridShape.id})`
            );
          }
        });
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    statistics,
  };
};

export async function validateSeatMapAction(seatMapId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to validate seat maps.");
    }

    const seatMap = await getSeatMapById(seatMapId);

    if (!seatMap) {
      throw new Error("Seat map not found");
    }

    const validation = validateSeatMapStructure(seatMap.shapes || []);

    return {
      success: true,
      data: {
        seatMapId,
        isValid: validation.isValid,
        errors: validation.errors,
        statistics: validation.statistics,
      },
    };
  } catch (error) {
    console.error("Error in validateSeatMapAction:", error);
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

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const seatMaps = await searchUserSeatMaps(searchQuery, user as User, organizationId);
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

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const draft = await createSeatMapDraft(
      originalSeatMapId,
      draftName,
      user as User,
      organizationId
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

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const updatedSeatMap = await updateSeatMapPublicityService(
      seatMapId,
      "public",
      user as User,
      organizationId
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

    // Get active organization context (if any)
    const organizationId = await getActiveOrganizationId();

    const deletedSeatMap = await deleteSeatMapService(seatMapId, user as User, organizationId);
    const plainData = JSON.parse(JSON.stringify(deletedSeatMap));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in deleteSeatMapAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
