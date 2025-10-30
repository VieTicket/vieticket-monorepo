import { User } from "@vieticket/db/pg/schemas/users";
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

/**
 * Service function to save a seat map to the database.
 * Only organizers are authorized to create seat maps.
 *
 * @param shapes - Array of PIXI.js canvas items that make up the seat map
 * @param name - Name of the seat map
 * @param imageUrl - URL to the seat map image/thumbnail
 * @param user - The authenticated user object
 * @returns The created seat map document
 * @throws Error if user is not authorized or if validation fails
 */
export async function saveSeatMap(
  shapes: CanvasItem[],
  name: string,
  imageUrl: string,
  user: User
) {
  // 1. Authorization check - only organizers can create seat maps
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can create seat maps");
  }

  // 2. Input validation
  if (!name || name.trim().length === 0) {
    throw new Error("Seat map name is required");
  }

  if (name.trim().length > 100) {
    throw new Error("Seat map name cannot exceed 100 characters");
  }

  if (!imageUrl || imageUrl.trim().length === 0) {
    throw new Error("Image URL is required");
  }

  // Validate URL format
  try {
    new URL(imageUrl);
  } catch {
    throw new Error("Invalid image URL format");
  }

  if (!Array.isArray(shapes)) {
    throw new Error("Shapes must be an array");
  }

  // 3. Validate shapes array structure for PIXI.js canvas items
  const invalidShapes = shapes.filter((shape) => {
    if (
      !shape ||
      typeof shape.id !== "string" ||
      typeof shape.type !== "string"
    ) {
      return true;
    }

    // Check required base properties
    if (
      typeof shape.x !== "number" ||
      typeof shape.y !== "number" ||
      typeof shape.scaleX !== "number" ||
      typeof shape.scaleY !== "number" ||
      typeof shape.rotation !== "number" ||
      typeof shape.opacity !== "number" ||
      typeof shape.visible !== "boolean" ||
      typeof shape.interactive !== "boolean"
    ) {
      return true;
    }

    // Validate specific shape types
    const validTypes = [
      "rectangle",
      "ellipse",
      "text",
      "polygon",
      "image",
      "svg",
      "container",
    ];

    if (!validTypes.includes(shape.type)) {
      return true;
    }

    // Type-specific validation
    switch (shape.type) {
      case "rectangle":
        const rect = shape as any;
        return (
          typeof rect.width !== "number" ||
          typeof rect.height !== "number" ||
          typeof rect.cornerRadius !== "number" ||
          typeof rect.color !== "number" ||
          typeof rect.strokeColor !== "number" ||
          typeof rect.strokeWidth !== "number"
        );

      case "ellipse":
        const ellipse = shape as any;
        return (
          typeof ellipse.radiusX !== "number" ||
          typeof ellipse.radiusY !== "number" ||
          typeof ellipse.color !== "number" ||
          typeof ellipse.strokeColor !== "number" ||
          typeof ellipse.strokeWidth !== "number"
        );

      case "text":
        const text = shape as any;
        return (
          typeof text.text !== "string" ||
          typeof text.fontSize !== "number" ||
          typeof text.fontFamily !== "string" ||
          typeof text.color !== "number"
        );

      case "polygon":
        const polygon = shape as any;
        return (
          !Array.isArray(polygon.points) ||
          typeof polygon.cornerRadius !== "number" ||
          typeof polygon.color !== "number" ||
          typeof polygon.strokeColor !== "number" ||
          typeof polygon.strokeWidth !== "number"
        );

      case "image":
        const image = shape as any;
        return (
          typeof image.src !== "string" ||
          typeof image.originalWidth !== "number" ||
          typeof image.originalHeight !== "number"
        );

      case "svg":
        const svg = shape as any;
        return (
          typeof svg.svgContent !== "string" ||
          typeof svg.originalWidth !== "number" ||
          typeof svg.originalHeight !== "number"
        );

      case "container":
        const container = shape as any;
        return !Array.isArray(container.children);

      default:
        return false;
    }
  });

  if (invalidShapes.length > 0) {
    throw new Error(
      "Invalid shapes detected: All shapes must be valid PIXI.js canvas items with required properties"
    );
  }

  // 4. Prepare seat map data
  const seatMapData: CreateSeatMapInput = {
    name: name.trim(),
    shapes: shapes,
    image: imageUrl.trim(),
    createdBy: user.id,
  };

  try {
    // 5. Save to database using repository
    const savedSeatMap = await createSeatMap(seatMapData);

    // 6. Return the created seat map (with MongoDB _id transformed to id)
    return savedSeatMap;
  } catch (error) {
    // Handle database errors
    if (error instanceof Error) {
      throw new Error(`Failed to save seat map: ${error.message}`);
    }
    throw new Error("An unknown error occurred while saving the seat map");
  }
}

/**
 * Service function to update an existing seat map.
 * Only organizers can update their own seat maps.
 *
 * @param seatMapId - The ID of the seat map to update
 * @param shapes - Array of PIXI.js canvas items that make up the seat map
 * @param user - The authenticated user object
 * @param name - Optional new name for the seat map
 * @param imageUrl - Optional new image URL
 * @returns The updated seat map document
 * @throws Error if user is not authorized or seat map not found
 */
export async function updateSeatMap(
  seatMapId: string,
  shapes: CanvasItem[],
  user: User,
  name?: string,
  imageUrl?: string
) {
  // 1. Authorization check - only organizers can update seat maps
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can update seat maps");
  }

  // 2. Input validation
  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  if (!Array.isArray(shapes)) {
    throw new Error("Shapes must be an array");
  }

  // 3. Validate shapes array structure (same validation as saveSeatMap)
  const invalidShapes = shapes.filter((shape) => {
    if (
      !shape ||
      typeof shape.id !== "string" ||
      typeof shape.type !== "string"
    ) {
      return true;
    }

    // Check required base properties
    if (
      typeof shape.x !== "number" ||
      typeof shape.y !== "number" ||
      typeof shape.scaleX !== "number" ||
      typeof shape.scaleY !== "number" ||
      typeof shape.rotation !== "number" ||
      typeof shape.opacity !== "number" ||
      typeof shape.visible !== "boolean" ||
      typeof shape.interactive !== "boolean"
    ) {
      return true;
    }

    const validTypes = [
      "rectangle",
      "ellipse",
      "text",
      "polygon",
      "image",
      "svg",
      "container",
    ];

    return !validTypes.includes(shape.type);
  });

  if (invalidShapes.length > 0) {
    throw new Error(
      "Invalid shapes detected: All shapes must be valid PIXI.js canvas items with required properties"
    );
  }

  try {
    // 4. First verify the seat map exists and user owns it
    const existingSeatMap = await findSeatMapWithShapesById(seatMapId.trim());

    if (!existingSeatMap) {
      throw new Error(
        "Seat map not found or you don't have permission to update it"
      );
    }

    // 5. Prepare update data
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

    // 6. Update the seat map
    const updatedSeatMap = await updateSeatMapById(
      seatMapId.trim(),
      updateData
    );

    if (!updatedSeatMap) {
      throw new Error("Failed to update seat map");
    }

    return updatedSeatMap;
  } catch (error) {
    // Handle database errors
    if (error instanceof Error) {
      throw new Error(`Failed to update seat map: ${error.message}`);
    }
    throw new Error("An unknown error occurred while updating the seat map");
  }
}

// ✅ Keep all other existing functions unchanged
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

// ... Keep all other existing functions (getPublicSeatMaps, createSeatMapDraft, etc.)
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
      throw new Error(
        "Seat map not found or you don't have permission to delete it"
      );
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
      throw new Error(`Failed to delete seat map: ${error.message}`);
    }
    throw new Error("An unknown error occurred while deleting the seat map");
  }
}
