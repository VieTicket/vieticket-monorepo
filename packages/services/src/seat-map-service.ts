import { User } from "@vieticket/db/pg/schemas/users";
import { Shape } from "@vieticket/db/mongo/models/seat-map";
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
} from "@vieticket/repos/seat-map";
import { CreateSeatMapInput } from "@vieticket/db/mongo/models/seat-map";

/**
 * Service function to save a seat map to the database.
 * Only organizers are authorized to create seat maps.
 *
 * @param shapes - Array of shapes that make up the seat map
 * @param name - Name of the seat map
 * @param imageUrl - URL to the seat map image/thumbnail
 * @param user - The authenticated user object
 * @returns The created seat map document
 * @throws Error if user is not authorized or if validation fails
 */
export async function saveSeatMap(
  shapes: Shape[],
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

  // 3. Validate shapes array structure
  const invalidShapes = shapes.filter(
    (shape) =>
      !shape ||
      typeof shape.id !== "string" ||
      typeof shape.type !== "string" ||
      typeof shape.x !== "number" ||
      typeof shape.y !== "number" ||
      !["rect", "circle", "text", "polygon"].includes(shape.type)
  );

  if (invalidShapes.length > 0) {
    throw new Error(
      "Invalid shapes detected: All shapes must have valid id, type, x, y properties"
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
 * Service function to fetch seat maps created by a specific user.
 * Only organizers are authorized to fetch their own seat maps.
 *
 * @param user - The authenticated user object
 * @returns Array of seat maps with plain JavaScript objects
 * @throws Error if user is not authorized
 */
export async function getUserSeatMaps(user: User) {
  // 1. Authorization check - only organizers can fetch seat maps
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can access seat maps");
  }

  try {
    // 2. Fetch seat maps from database
    const seatMaps = await findSeatMapsByCreator(user.id);

    // 3. Transform to plain JavaScript objects and ensure proper serialization
    const plainSeatMaps = seatMaps.map((seatMap) => ({
      id: seatMap.id,
      name: seatMap.name,
      image: seatMap.image,
      createdBy: seatMap.createdBy,
      createdAt: seatMap.createdAt,
      updatedAt: seatMap.updatedAt,
      // Don't include shapes array for listing performance
    }));

    return plainSeatMaps;
  } catch (error) {
    // Handle database errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch seat maps: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching seat maps");
  }
}

/**
 * Service function to search seat maps by name pattern.
 * Only organizers are authorized to search their own seat maps.
 *
 * @param searchQuery - The search query string
 * @param user - The authenticated user object
 * @returns Array of matching seat maps
 * @throws Error if user is not authorized
 */
export async function searchUserSeatMaps(searchQuery: string, user: User) {
  // 1. Authorization check - only organizers can search seat maps
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can search seat maps");
  }

  try {
    // 2. Search seat maps by name pattern
    const seatMaps = await findSeatMapsByName(searchQuery, user.id);

    // 3. Transform to plain JavaScript objects
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
    // Handle database errors
    if (error instanceof Error) {
      throw new Error(`Failed to search seat maps: ${error.message}`);
    }
    throw new Error("An unknown error occurred while searching seat maps");
  }
}

/**
 * Service function to get a specific seat map by ID with full data.
 * Only organizers can access their own seat maps.
 *
 * @param seatMapId - The ID of the seat map to retrieve
 * @param user - The authenticated user object
 * @returns The seat map with full data including shapes
 * @throws Error if user is not authorized or seat map not found
 */
export async function getSeatMapById(seatMapId: string) {
  // 1. Input validation
  if (!seatMapId || seatMapId.trim().length === 0) {
    throw new Error("Seat map ID is required");
  }

  try {
    // 2. Fetch seat map from database with security filter
    const seatMap = await findSeatMapWithShapesById(seatMapId.trim());

    if (!seatMap) {
      throw new Error(
        "Seat map not found or you don't have permission to access it"
      );
    }

    // 3. Transform to plain JavaScript object
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
    // Handle database errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch seat map: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching the seat map");
  }
}

/**
 * Service function to update an existing seat map.
 * Only organizers can update their own seat maps.
 *
 * @param seatMapId - The ID of the seat map to update
 * @param shapes - Array of shapes that make up the seat map
 * @param user - The authenticated user object
 * @param name - Optional new name for the seat map
 * @param imageUrl - Optional new image URL
 * @returns The updated seat map document
 * @throws Error if user is not authorized or seat map not found
 */
export async function updateSeatMap(
  seatMapId: string,
  shapes: Shape[],
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

  // 3. Validate shapes array structure
  const invalidShapes = shapes.filter(
    (shape) =>
      !shape ||
      typeof shape.id !== "string" ||
      typeof shape.type !== "string" ||
      typeof shape.x !== "number" ||
      typeof shape.y !== "number" ||
      !["rect", "circle", "text", "polygon"].includes(shape.type)
  );

  if (invalidShapes.length > 0) {
    throw new Error(
      "Invalid shapes detected: All shapes must have valid id, type, x, y properties"
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

/**
 * Service function to get public seat maps that can be drafted.
 * @param page - Page number.
 * @param limit - Items per page.
 * @param searchQuery - Optional search query.
 * @returns Public seat maps with pagination.
 */
export async function getPublicSeatMaps(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string
) {
  try {
    const result = await findPublicSeatMaps(page, limit, searchQuery);

    // Add draft counts for each seat map
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

/**
 * Service function to create a draft from a public seat map.
 * @param originalSeatMapId - ID of the original seat map.
 * @param draftName - Name for the new draft.
 * @param user - The user creating the draft.
 * @returns The created draft.
 */
export async function createSeatMapDraft(
  originalSeatMapId: string,
  draftName: string,
  user: User
) {
  // Authorization check
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can create drafts");
  }

  // Input validation
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

/**
 * Service function to update seat map publicity.
 * @param seatMapId - ID of the seat map.
 * @param publicity - New publicity setting.
 * @param user - The user making the update.
 * @returns Updated seat map.
 */
export async function updateSeatMapPublicityService(
  seatMapId: string,
  publicity: "public" | "private",
  user: User
) {
  // Authorization check
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can update publicity");
  }

  // Input validation
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

/**
 * Service function to get seat map draft information.
 * @param seatMapId - ID of the seat map.
 * @param user - The requesting user.
 * @returns Draft chain information.
 */
export async function getSeatMapDraftInfo(seatMapId: string, user: User) {
  // Authorization check
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
