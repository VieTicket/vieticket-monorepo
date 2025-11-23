import { SeatMapModel } from "@vieticket/db/mongo/schemas/seat-map";
import {
  SeatMap,
  CreateSeatMapInput,
  UpdateSeatMapInput,
} from "@vieticket/db/mongo/models/seat-map";
import { ensureMongoConnection } from "@vieticket/db/mongo";
import { v4 as uuidv4 } from "uuid";

/**
 * Retrieves a seat map by its ID.
 * @param id - The ID of the seat map to retrieve.
 * @returns The seat map object or null if not found.
 */
export async function findSeatMapById(id: string): Promise<SeatMap | null> {
  await ensureMongoConnection();
  const doc = await SeatMapModel.findById(id).exec();
  return doc ? (doc.toObject() as SeatMap) : null;
}

/**
 * Retrieves all seat maps created by a specific user.
 * @param createdBy - The ID of the user who created the seat maps.
 * @returns Array of seat map objects.
 */
export async function findSeatMapsByCreator(
  createdBy: string
): Promise<SeatMap[]> {
  await ensureMongoConnection();
  const docs = await SeatMapModel.find({ createdBy })
    .sort({ createdAt: -1 })
    .exec();
  return docs.map((doc) => doc.toObject() as SeatMap);
}

/**
 * Retrieves seat maps with pagination.
 * @param page - Page number (1-based).
 * @param limit - Number of items per page.
 * @param createdBy - Optional filter by creator ID.
 * @returns Object containing seat map objects and pagination info.
 */
export async function findSeatMapsWithPagination(
  page: number = 1,
  limit: number = 10,
  createdBy?: string
): Promise<{
  seatMaps: SeatMap[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  await ensureMongoConnection();

  const skip = (page - 1) * limit;
  const filter = createdBy ? { createdBy } : {};

  const [docs, total] = await Promise.all([
    SeatMapModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    SeatMapModel.countDocuments(filter).exec(),
  ]);

  const seatMaps = docs.map((doc) => doc.toObject() as SeatMap);

  return {
    seatMaps,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

/**
 * Creates a new seat map.
 * @param data - The seat map data to create.
 * @returns The created seat map object.
 */
export async function createSeatMap(
  data: CreateSeatMapInput
): Promise<SeatMap> {
  await ensureMongoConnection();

  const seatmap = await SeatMapModel.create(data);

  return seatmap.toObject() as SeatMap;
}

/**
 * Updates an existing seat map by ID.
 * @param id - The ID of the seat map to update.
 * @param updates - The updates to apply.
 * @returns The updated seat map object or null if not found.
 */
export async function updateSeatMapById(
  id: string,
  updates: UpdateSeatMapInput
): Promise<SeatMap | null> {
  await ensureMongoConnection();
  // The `timestamps: true` option in the schema will automatically handle `updatedAt`.
  const doc = await SeatMapModel.findByIdAndUpdate(id, updates).exec();

  return doc ? (doc.toObject() as SeatMap) : null;
}

/**
 * Deletes a seat map by ID.
 * @param id - The ID of the seat map to delete.
 * @returns The deleted seat map object or null if not found.
 */
export async function deleteSeatMapById(id: string): Promise<SeatMap | null> {
  await ensureMongoConnection();
  const doc = await SeatMapModel.findByIdAndDelete(id).exec();
  return doc ? (doc.toObject() as SeatMap) : null;
}

export async function duplicateSeatMapForEvent(
  originalSeatMapId: string,
  eventName: string,
  userId: string
): Promise<{ success: boolean; seatMapId?: string; error?: string }> {
  try {
    await ensureMongoConnection();
    const originalSeatMap = await SeatMapModel.findById(originalSeatMapId);
    if (!originalSeatMap) {
      return {
        success: false,
        error: "Original seat map not found",
      };
    }

    const duplicatedShapes: CanvasItem[] = JSON.parse(
      JSON.stringify(originalSeatMap.shapes)
    );

    const areaModeContainerIndex = duplicatedShapes.findIndex(
      (shape: any) =>
        shape.id === "area-mode-container-id" &&
        shape.type === "container" &&
        shape.defaultSeatSettings
    );

    if (areaModeContainerIndex === -1) {
      return {
        success: false,
        error: "No area mode container found in seat map",
      };
    }

    const areaModeContainer = duplicatedShapes[
      areaModeContainerIndex
    ] as AreaModeContainer;

    const idMappings: Record<string, string> = {};

    const processedGrids: GridShape[] = areaModeContainer.children.map(
      (grid: GridShape) => {
        const newGridId = uuidv4();
        idMappings[grid.id] = newGridId;

        const processedRows: RowShape[] = grid.children.map((row: RowShape) => {
          const newRowId = uuidv4();
          idMappings[row.id] = newRowId;

          const processedSeats: SeatShape[] = row.children.map(
            (seat: SeatShape) => {
              const newSeatId = uuidv4();
              idMappings[seat.id] = newSeatId;

              return {
                ...seat,
                id: newSeatId,
                rowId: newRowId,
                gridId: newGridId,
              };
            }
          );

          return {
            ...row,
            id: newRowId,
            gridId: newGridId,
            children: processedSeats,
          };
        });

        return {
          ...grid,
          id: newGridId,
          children: processedRows,
        };
      }
    );

    const updatedAreaModeContainer: AreaModeContainer = {
      ...areaModeContainer,
      children: processedGrids,
    };

    duplicatedShapes[areaModeContainerIndex] = updatedAreaModeContainer;

    const finalShapes = duplicatedShapes.map((shape) => {
      if (shape.id === "area-mode-container-id" && shape.type === "container") {
        return shape;
      }

      const newId = uuidv4();
      idMappings[shape.id] = newId;

      return {
        ...shape,
        id: newId,
      };
    });

    const timestamp = new Date().toISOString().slice(0, 16).replace("T", "_");
    const duplicatedName = `${originalSeatMap.name}_${eventName}_${timestamp}`;

    const duplicatedSeatMap = new SeatMapModel({
      name: duplicatedName,
      shapes: finalShapes,
      image: originalSeatMap.image,
      createdBy: userId,
      publicity: "private",
      draftedFrom: originalSeatMap._id,
      originalCreator: originalSeatMap.createdBy,
    });

    const savedSeatMap = await duplicatedSeatMap.save();

    const totalGrids = processedGrids.length;
    const totalRows = processedGrids.reduce(
      (sum, grid) => sum + grid.children.length,
      0
    );
    const totalSeats = processedGrids.reduce(
      (sum, grid) =>
        sum +
        grid.children.reduce((rowSum, row) => rowSum + row.children.length, 0),
      0
    );

    return {
      success: true,
      seatMapId: savedSeatMap.id,
    };
  } catch (error) {
    console.error("❌ Error duplicating seat map:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during duplication",
    };
  }
}

/**
 * Checks if a seat map exists by ID.
 * @param id - The ID of the seat map to check.
 * @returns True if the seat map exists, false otherwise.
 */
export async function seatMapExists(id: string): Promise<boolean> {
  await ensureMongoConnection();
  const count = await SeatMapModel.countDocuments({ _id: id }).exec();
  return count > 0;
}

/**
 * Retrieves seat maps by name pattern (case-insensitive search).
 * @param namePattern - The name pattern to search for.
 * @param createdBy - Optional filter by creator ID.
 * @returns Array of matching seat map objects.
 */
export async function findSeatMapsByName(
  namePattern: string,
  createdBy?: string
): Promise<SeatMap[]> {
  await ensureMongoConnection();

  const filter: any = {
    name: { $regex: namePattern, $options: "i" },
  };

  if (createdBy) {
    filter.createdBy = createdBy;
  }

  const docs = await SeatMapModel.find(filter).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => doc.toObject() as SeatMap);
}

/**
 * Counts total seat maps, optionally filtered by creator.
 * @param createdBy - Optional filter by creator ID.
 * @returns The total count of seat maps.
 */
export async function countSeatMaps(createdBy?: string): Promise<number> {
  await ensureMongoConnection();
  const filter = createdBy ? { createdBy } : {};
  return SeatMapModel.countDocuments(filter).exec();
}

/**
 * Retrieves the most recently created seat maps.
 * @param limit - Maximum number of seat maps to return.
 * @param createdBy - Optional filter by creator ID.
 * @returns Array of recent seat map objects.
 */
export async function findRecentSeatMaps(
  limit: number = 5,
  createdBy?: string
): Promise<SeatMap[]> {
  await ensureMongoConnection();

  const filter = createdBy ? { createdBy } : {};

  const docs = await SeatMapModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
  return docs.map((doc) => doc.toObject() as SeatMap);
}

/**
 * Bulk creates multiple seat maps.
 * @param seatMaps - Array of seat map data to create.
 * @returns Array of created seat map objects.
 */
export async function createMultipleSeatMaps(
  seatMaps: CreateSeatMapInput[]
): Promise<SeatMap[]> {
  await ensureMongoConnection();
  const docs = await SeatMapModel.insertMany(seatMaps, { ordered: false });
  return docs.map((doc) => doc.toObject() as SeatMap);
}

/**
 * Bulk deletes multiple seat maps by IDs.
 * @param ids - Array of seat map IDs to delete.
 * @returns Deletion result with count of deleted documents.
 */
export async function deleteMultipleSeatMaps(
  ids: string[]
): Promise<{ acknowledged: boolean; deletedCount: number }> {
  await ensureMongoConnection();
  return SeatMapModel.deleteMany({ _id: { $in: ids } }).exec();
}

/**
 * Retrieves a seat map by its ID with full data including shapes.
 * @param id - The ID of the seat map to retrieve.
 * @param createdBy - Optional filter by creator ID for security.
 * @returns The seat map object with shapes or null if not found.
 */
export async function findSeatMapWithShapesById(
  id: string
): Promise<SeatMap | null> {
  await ensureMongoConnection();

  const filter: any = { _id: id };

  const doc = await SeatMapModel.findOne(filter).exec();
  return doc ? (doc.toObject() as SeatMap) : null;
}

/**
 * Retrieves public seat maps that can be drafted by other users.
 * @param page - Page number (1-based).
 * @param limit - Number of items per page.
 * @param searchQuery - Optional search query for name.
 * @returns Object containing public seat maps and pagination info.
 */
export async function findPublicSeatMaps(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string
): Promise<{
  seatMaps: SeatMap[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  await ensureMongoConnection();

  const skip = (page - 1) * limit;
  const filter: any = { publicity: "public" };

  if (searchQuery) {
    filter.name = { $regex: searchQuery, $options: "i" };
  }

  const [docs, total] = await Promise.all([
    SeatMapModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    SeatMapModel.countDocuments(filter).exec(),
  ]);

  const seatMaps = docs.map((doc) => doc.toObject() as SeatMap);

  return {
    seatMaps,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

/**
 * Creates a draft from an existing public seat map.
 * @param originalSeatMapId - ID of the original public seat map.
 * @param draftData - Data for the new draft.
 * @returns The created draft seat map.
 */
export async function createDraftFromSeatMap(
  originalSeatMapId: string,
  draftData: { name: string; createdBy: string }
): Promise<SeatMap> {
  await ensureMongoConnection();

  // Get the original seat map
  const originalSeatMap = await SeatMapModel.findById(originalSeatMapId).exec();
  if (!originalSeatMap) {
    throw new Error("Original seat map not found");
  }

  if (originalSeatMap.publicity !== "public") {
    throw new Error("Can only draft from public seat maps");
  }

  // Create the draft with copied shapes
  const draftInput: CreateSeatMapInput = {
    name: draftData.name,
    shapes: originalSeatMap.shapes, // Copy the shapes
    image: originalSeatMap.image, // Copy the image initially
    createdBy: draftData.createdBy,
    publicity: "private", // Drafts start as private
    draftedFrom: originalSeatMapId,
    originalCreator:
      originalSeatMap.originalCreator || originalSeatMap.createdBy,
  };

  const doc = await SeatMapModel.create(draftInput);
  return doc.toObject() as SeatMap;
}

/**
 * Gets the draft count for a specific seat map.
 * @param seatMapId - ID of the seat map.
 * @returns Number of times this seat map was drafted.
 */
export async function getSeatMapDraftCount(seatMapId: string): Promise<number> {
  await ensureMongoConnection();
  return SeatMapModel.countDocuments({ draftedFrom: seatMapId }).exec();
}

/**
 * Gets the draft chain for a seat map (what it was drafted from and what drafted from it).
 * @param seatMapId - ID of the seat map.
 * @returns Object with parent and children information.
 */
export async function getSeatMapDraftChain(seatMapId: string): Promise<{
  parent?: SeatMap;
  children: SeatMap[];
  draftCount: number;
}> {
  await ensureMongoConnection();

  const [currentSeatMap, children] = await Promise.all([
    SeatMapModel.findById(seatMapId).exec(),
    SeatMapModel.find({ draftedFrom: seatMapId })
      .sort({ createdAt: -1 })
      .exec(),
  ]);

  let parent: SeatMap | undefined;
  if (currentSeatMap?.draftedFrom) {
    const parentDoc = await SeatMapModel.findById(
      currentSeatMap.draftedFrom
    ).exec();
    parent = parentDoc ? (parentDoc.toObject() as SeatMap) : undefined;
  }

  return {
    parent,
    children: children.map((doc) => doc.toObject() as SeatMap),
    draftCount: children.length,
  };
}

/**
 * Updates seat map publicity.
 * @param id - The ID of the seat map.
 * @param publicity - New publicity setting.
 * @param updatedBy - ID of user making the update (must be owner).
 * @returns Updated seat map or null if not found/unauthorized.
 */
export async function updateSeatMapPublicity(
  id: string,
  publicity: "public" | "private",
  updatedBy: string
): Promise<SeatMap | null> {
  await ensureMongoConnection();

  const doc = await SeatMapModel.findOneAndUpdate(
    { _id: id, createdBy: updatedBy }, // Only owner can update publicity
    { publicity },
    { new: true, runValidators: true }
  ).exec();

  return doc ? (doc.toObject() as SeatMap) : null;
}
