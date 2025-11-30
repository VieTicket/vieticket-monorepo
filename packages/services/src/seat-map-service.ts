import { User } from "@vieticket/db/pg/schemas/users";
import { Event, NewEvent } from "@vieticket/db/pg/schema";
import { CanvasItem } from "@vieticket/db/mongo/models/seat-map";
import {
  createSeatMap,
  findSeatMapsByCreator,
  findSeatMapsByName,
  findSeatMapWithShapesById,
  updateSeatMapById,
  findPublicSeatMaps,
  createDraftFromSeatMap,
  getSeatMapDraftCount,
  getSeatMapDraftChain,
  updateSeatMapPublicity,
  deleteSeatMapById,
} from "@vieticket/repos/seat-map";
import { CreateSeatMapInput } from "@vieticket/db/mongo/models/seat-map";

function validateShapesByType(shape: any): boolean {
  const validTypes = [
    "rectangle",
    "ellipse",
    "text",
    "polygon",
    "image",
    "svg",
    "container",
    "freeshape",
  ];

  if (!validTypes.includes(shape.type)) return false;

  switch (shape.type) {
    case "rectangle":
      return (
        typeof shape.width === "number" &&
        shape.width >= 0 &&
        typeof shape.height === "number" &&
        shape.height >= 0 &&
        typeof shape.cornerRadius === "number" &&
        shape.cornerRadius >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0
      );

    case "ellipse":
      const hasEllipseProps =
        typeof shape.radiusX === "number" &&
        shape.radiusX >= 0 &&
        typeof shape.radiusY === "number" &&
        shape.radiusY >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0;

      if (!hasEllipseProps) return false;

      if (shape.rowId && shape.gridId) {
        return (
          typeof shape.rowId === "string" &&
          shape.rowId.length > 0 &&
          typeof shape.gridId === "string" &&
          shape.gridId.length > 0 &&
          typeof shape.showLabel === "boolean" &&
          shape.labelStyle &&
          typeof shape.labelStyle === "object" &&
          typeof shape.labelStyle.fontFamily === "string" &&
          typeof shape.labelStyle.fontSize === "number" &&
          shape.labelStyle.fontSize > 0
        );
      }

      return true;

    case "text":
      return (
        typeof shape.text === "string" &&
        typeof shape.fontSize === "number" &&
        shape.fontSize > 0 &&
        typeof shape.fontFamily === "string" &&
        shape.fontFamily.length > 0 &&
        typeof shape.color === "number" &&
        ["normal", "bold"].includes(shape.fontWeight) &&
        ["left", "center", "right"].includes(shape.textAlign)
      );

    case "polygon":
      return (
        Array.isArray(shape.points) &&
        shape.points.length >= 3 &&
        shape.points.every(
          (point: any) =>
            typeof point.x === "number" &&
            typeof point.y === "number" &&
            (point.radius === undefined || typeof point.radius === "number")
        ) &&
        typeof shape.cornerRadius === "number" &&
        shape.cornerRadius >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0
      );

    case "image":
      return (
        typeof shape.src === "string" &&
        shape.src.length > 0 &&
        typeof shape.originalWidth === "number" &&
        shape.originalWidth > 0 &&
        typeof shape.originalHeight === "number" &&
        shape.originalHeight > 0 &&
        (!shape.uploadState ||
          ["uploading", "uploaded", "failed"].includes(shape.uploadState))
      );

    case "svg":
      return (
        typeof shape.svgContent === "string" &&
        shape.svgContent.length > 0 &&
        typeof shape.originalWidth === "number" &&
        shape.originalWidth > 0 &&
        typeof shape.originalHeight === "number" &&
        shape.originalHeight > 0
      );

    case "freeshape":
      return (
        Array.isArray(shape.points) &&
        shape.points.length >= 2 &&
        shape.points.every(
          (point: any) =>
            typeof point.x === "number" &&
            typeof point.y === "number" &&
            ["move", "curve", "line"].includes(point.type) &&
            (point.cp1x === undefined || typeof point.cp1x === "number") &&
            (point.cp1y === undefined || typeof point.cp1y === "number") &&
            (point.cp2x === undefined || typeof point.cp2x === "number") &&
            (point.cp2y === undefined || typeof point.cp2y === "number") &&
            (point.smoothness === undefined ||
              typeof point.smoothness === "number")
        ) &&
        typeof shape.closed === "boolean" &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0 &&
        typeof shape.smoothness === "number"
      );

    case "container":
      const hasContainerProps =
        Array.isArray(shape.children) && typeof shape.expanded === "boolean";

      if (!hasContainerProps) return false;

      if (shape.defaultSeatSettings) {
        const hasAreaModeProps =
          typeof shape.defaultSeatSettings === "object" &&
          typeof shape.defaultSeatSettings.seatSpacing === "number" &&
          shape.defaultSeatSettings.seatSpacing >= 0 &&
          typeof shape.defaultSeatSettings.rowSpacing === "number" &&
          shape.defaultSeatSettings.rowSpacing >= 0 &&
          typeof shape.defaultSeatSettings.seatRadius === "number" &&
          shape.defaultSeatSettings.seatRadius > 0 &&
          typeof shape.defaultSeatSettings.seatColor === "number" &&
          typeof shape.defaultSeatSettings.seatStrokeColor === "number" &&
          typeof shape.defaultSeatSettings.seatStrokeWidth === "number" &&
          shape.defaultSeatSettings.seatStrokeWidth >= 0 &&
          typeof shape.defaultSeatSettings.price === "number" &&
          shape.defaultSeatSettings.price >= 0;

        if (!hasAreaModeProps) return false;

        return shape.children.every(
          (child: any) =>
            child.type === "container" &&
            child.gridName &&
            typeof child.gridName === "string"
        );
      }

      if (shape.gridName) {
        const hasGridProps =
          typeof shape.gridName === "string" &&
          shape.gridName.length > 0 &&
          typeof shape.seatSettings === "object" &&
          validateSeatGridSettings(shape.seatSettings) &&
          shape.createdAt instanceof Date;

        if (!hasGridProps) return false;

        return shape.children.every(
          (child: any) =>
            child.type === "container" &&
            child.rowName &&
            typeof child.rowName === "string" &&
            child.gridId === shape.id
        );
      }

      if (shape.rowName && !shape.gridName) {
        const hasRowProps =
          typeof shape.rowName === "string" &&
          shape.rowName.length > 0 &&
          typeof shape.seatSpacing === "number" &&
          shape.seatSpacing >= 0 &&
          typeof shape.gridId === "string" &&
          shape.gridId.length > 0 &&
          ["left", "middle", "right", "none"].includes(shape.labelPlacement) &&
          shape.createdAt instanceof Date;

        if (!hasRowProps) return false;

        return shape.children.every(
          (child: any) =>
            child.type === "ellipse" &&
            child.rowId === shape.id &&
            child.gridId === shape.gridId &&
            typeof child.rowId === "string" &&
            typeof child.gridId === "string"
        );
      }

      return shape.children.every((child: any) => validateShapesByType(child));

    default:
      return false;
  }
}

function validateSeatGridSettings(settings: any): boolean {
  return (
    settings &&
    typeof settings === "object" &&
    typeof settings.seatSpacing === "number" &&
    settings.seatSpacing >= 0 &&
    typeof settings.rowSpacing === "number" &&
    settings.rowSpacing >= 0 &&
    typeof settings.seatRadius === "number" &&
    settings.seatRadius > 0 &&
    typeof settings.seatColor === "number" &&
    typeof settings.seatStrokeColor === "number" &&
    typeof settings.seatStrokeWidth === "number" &&
    settings.seatStrokeWidth >= 0 &&
    typeof settings.price === "number" &&
    settings.price >= 0
  );
}

/**
 * Service function to save a seat map to the database.
 * Only organizers are authorized to create seat maps.
 * Enhanced to support hierarchical structures and freeshape.
 */
export async function saveSeatMap(
  shapes: CanvasItem[],
  name: string,
  imageUrl: string,
  user: User
) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can create seat maps");
  }

  if (!name || name.trim().length === 0) {
    throw new Error("Seat map name is required");
  }

  if (name.trim().length > 100) {
    throw new Error("Seat map name cannot exceed 100 characters");
  }

  if (!imageUrl || imageUrl.trim().length === 0) {
    throw new Error("Image URL is required");
  }

  try {
    new URL(imageUrl);
  } catch {
    throw new Error("Invalid image URL format");
  }

  if (!Array.isArray(shapes)) {
    throw new Error("Shapes must be an array");
  }

  const invalidShapes = shapes.filter((shape) => {
    return !validateShapesByType(shape);
  });

  if (invalidShapes.length > 0) {
    console.error("Invalid shapes detected:", invalidShapes);
    throw new Error(
      "Invalid shapes detected: All shapes must be valid canvas items with required properties"
    );
  }

  const seatMapData: CreateSeatMapInput = {
    name: name.trim(),
    shapes: shapes,
    image: imageUrl.trim(),
    createdBy: user.id,
  };

  try {
    const savedSeatMap = await createSeatMap(seatMapData);

    return savedSeatMap;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save seat map: ${error.message}`);
    }
    throw new Error("An unknown error occurred while saving the seat map");
  }
}

/**
 * Service function to update an existing seat map.
 * Enhanced to support hierarchical structures and freeshape.
 */
export async function updateSeatMap(
  seatMapId: string,
  shapes: CanvasItem[],
  user: User,
  name?: string,
  imageUrl?: string
) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can update seat maps");
  }

  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  if (!Array.isArray(shapes)) {
    throw new Error("Shapes must be an array");
  }

  try {
    const existingSeatMap = await findSeatMapWithShapesById(seatMapId.trim());

    if (!existingSeatMap) {
      throw new Error("Seat map not found");
    }

    const updateData: any = {
      shapes: shapes,
    };

    if (name && name.trim().length > 0) {
      if (name.trim().length > 100) {
        throw new Error("Seat map name cannot exceed 100 characters");
      }
      updateData.name = name.trim();
    }

    if (imageUrl && imageUrl.trim().length > 0) {
      try {
        new URL(imageUrl);
      } catch {
        throw new Error("Invalid image URL format");
      }
      updateData.image = imageUrl.trim();
    }

    const updatedSeatMap = await updateSeatMapById(
      seatMapId.trim(),
      updateData
    );

    if (!updatedSeatMap) {
      throw new Error("Failed to update seat map");
    }

    return updatedSeatMap;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred while updating the seat map");
  }
}

export async function getUserSeatMaps(user: User) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can access seat maps");
  }

  try {
    const seatMaps = await findSeatMapsByCreator(user.id);

    const plainSeatMaps = seatMaps.map((seatMap) => ({
      id: seatMap.id,
      name: seatMap.name,
      shapes: seatMap.shapes,
      image: seatMap.image,
      createdBy: seatMap.createdBy,
      publicity: seatMap.publicity,
      createdAt: seatMap.createdAt,
      updatedAt: seatMap.updatedAt,
    }));

    return plainSeatMaps;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch seat maps: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching seat maps");
  }
}

export async function searchUserSeatMaps(searchQuery: string, user: User) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can search seat maps");
  }

  try {
    const seatMaps = await findSeatMapsByName(searchQuery, user.id);

    const plainSeatMaps = seatMaps.map((seatMap) => ({
      id: seatMap.id,
      name: seatMap.name,
      image: seatMap.image,
      createdBy: seatMap.createdBy,
      createdAt: seatMap.createdAt,
      updatedAt: seatMap.updatedAt,
    }));

    return plainSeatMaps;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search seat maps: ${error.message}`);
    }
    throw new Error("An unknown error occurred while searching seat maps");
  }
}

export async function getSeatMapById(seatMapId: string) {
  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  try {
    const seatMap = await findSeatMapWithShapesById(seatMapId.trim());

    if (!seatMap) {
      throw new Error(
        "Seat map not found or you don't have permission to access it"
      );
    }

    const plainSeatMap = {
      id: seatMap.id,
      name: seatMap.name,
      shapes: seatMap.shapes,
      image: seatMap.image,
      createdBy: seatMap.createdBy,
      publicity: seatMap.publicity,
      createdAt: seatMap.createdAt,
      updatedAt: seatMap.updatedAt,
    };

    return plainSeatMap;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch seat map: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching the seat map");
  }
}

export async function getPublicSeatMaps(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string
) {
  try {
    const result = await findPublicSeatMaps(page, limit, searchQuery);

    const seatMapsWithDraftCount = await Promise.all(
      result.seatMaps.map(async (seatMap) => {
        const draftCount = await getSeatMapDraftCount(seatMap.id!);
        return {
          ...seatMap,
          draftCount,
        };
      })
    );

    return {
      seatMaps: seatMapsWithDraftCount,
      pagination: result.pagination,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch public seat maps: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while fetching public seat maps"
    );
  }
}

export async function createSeatMapDraft(
  originalSeatMapId: string,
  draftName: string,
  user: User
) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can create drafts");
  }

  if (!originalSeatMapId || originalSeatMapId.trim().length === 0) {
    throw new Error("Original seat map ID is required");
  }

  if (!draftName || draftName.trim().length === 0) {
    throw new Error("Draft name is required");
  }

  if (draftName.trim().length > 100) {
    throw new Error("Draft name cannot exceed 100 characters");
  }

  try {
    const draft = await createDraftFromSeatMap(originalSeatMapId.trim(), {
      name: draftName.trim(),
      createdBy: user.id,
    });

    return draft;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create draft: ${error.message}`);
    }
    throw new Error("An unknown error occurred while creating the draft");
  }
}

export async function updateSeatMapPublicityService(
  seatMapId: string,
  publicity: "public" | "private",
  user: User
) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can update publicity");
  }

  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  if (!["public", "private"].includes(publicity)) {
    throw new Error("Publicity must be either 'public' or 'private'");
  }

  try {
    const updatedSeatMap = await updateSeatMapPublicity(
      seatMapId.trim(),
      publicity,
      user.id
    );

    if (!updatedSeatMap) {
      throw new Error(
        "Seat map not found or you don't have permission to update it"
      );
    }

    return updatedSeatMap;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update publicity: ${error.message}`);
    }
    throw new Error("An unknown error occurred while updating publicity");
  }
}

export async function getSeatMapDraftInfo(seatMapId: string, user: User) {
  if (user.role !== "organizer") {
    throw new Error(
      "Unauthorized: Only organizers can access draft information"
    );
  }

  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  try {
    const draftChain = await getSeatMapDraftChain(seatMapId.trim());
    return draftChain;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch draft information: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while fetching draft information"
    );
  }
}

export async function deleteSeatMapService(seatMapId: string, user: User) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can delete seat maps");
  }

  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  try {
    const existingSeatMap = await findSeatMapWithShapesById(seatMapId.trim());

    if (!existingSeatMap) {
      throw new Error("Seat map not found");
    }

    if (existingSeatMap.createdBy !== user.id) {
      throw new Error("You can only delete your own seat maps");
    }

    const deletedSeatMap = await deleteSeatMapById(seatMapId.trim());

    if (!deletedSeatMap) {
      throw new Error("Failed to delete seat map");
    }

    return deletedSeatMap;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred while deleting the seat map");
  }
}
