import { SeatMapModel } from '@vieticket/db/mongo/schemas/seat-map';
import { SeatMap, CreateSeatMapInput, UpdateSeatMapInput } from '@vieticket/db/mongo/models/seat-map';
import { ensureMongoConnection } from '@vieticket/db/mongo';

/**
 * Retrieves a seat map by its ID.
 * @param id - The ID of the seat map to retrieve.
 * @returns The seat map object or null if not found.
 */
export async function findSeatMapById(id: string): Promise<SeatMap | null> {
    await ensureMongoConnection();
    const doc = await SeatMapModel.findById(id).exec();
    return doc ? doc.toObject() : null;
}

/**
 * Retrieves all seat maps created by a specific user.
 * @param createdBy - The ID of the user who created the seat maps.
 * @returns Array of seat map objects.
 */
export async function findSeatMapsByCreator(createdBy: string): Promise<SeatMap[]> {
    await ensureMongoConnection();
    const docs = await SeatMapModel.find({ createdBy }).sort({ createdAt: -1 }).exec();
    return docs.map(doc => doc.toObject());
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
        SeatMapModel.countDocuments(filter).exec()
    ]);

    const seatMaps = docs.map(doc => doc.toObject());

    return {
        seatMaps,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        }
    };
}

/**
 * Creates a new seat map.
 * @param data - The seat map data to create.
 * @returns The created seat map object.
 */
export async function createSeatMap(data: CreateSeatMapInput): Promise<SeatMap> {
    await ensureMongoConnection();
    const doc = await SeatMapModel.create(data);
    return doc.toObject();
}

/**
 * Updates an existing seat map by ID.
 * @param id - The ID of the seat map to update.
 * @param updates - The updates to apply.
 * @returns The updated seat map object or null if not found.
 */
export async function updateSeatMapById(id: string, updates: UpdateSeatMapInput): Promise<SeatMap | null> {
    await ensureMongoConnection();
    // The `timestamps: true` option in the schema will automatically handle `updatedAt`.
    const doc = await SeatMapModel.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    ).exec();
    return doc ? doc.toObject() : null;
}

/**
 * Deletes a seat map by ID.
 * @param id - The ID of the seat map to delete.
 * @returns The deleted seat map object or null if not found.
 */
export async function deleteSeatMapById(id: string): Promise<SeatMap | null> {
    await ensureMongoConnection();
    const doc = await SeatMapModel.findByIdAndDelete(id).exec();
    return doc ? doc.toObject() : null;
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
export async function findSeatMapsByName(namePattern: string, createdBy?: string): Promise<SeatMap[]> {
    await ensureMongoConnection();

    const filter: any = {
        name: { $regex: namePattern, $options: 'i' }
    };

    if (createdBy) {
        filter.createdBy = createdBy;
    }

    const docs = await SeatMapModel.find(filter).sort({ createdAt: -1 }).exec();
    return docs.map(doc => doc.toObject());
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
export async function findRecentSeatMaps(limit: number = 5, createdBy?: string): Promise<SeatMap[]> {
    await ensureMongoConnection();

    const filter = createdBy ? { createdBy } : {};

    const docs = await SeatMapModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
    return docs.map(doc => doc.toObject());
}

/**
 * Bulk creates multiple seat maps.
 * @param seatMaps - Array of seat map data to create.
 * @returns Array of created seat map objects.
 */
export async function createMultipleSeatMaps(seatMaps: CreateSeatMapInput[]): Promise<SeatMap[]> {
    await ensureMongoConnection();
    const docs = await SeatMapModel.insertMany(seatMaps, { ordered: false });
    return docs.map(doc => doc.toObject());
}

/**
 * Bulk deletes multiple seat maps by IDs.
 * @param ids - Array of seat map IDs to delete.
 * @returns Deletion result with count of deleted documents.
 */
export async function deleteMultipleSeatMaps(ids: string[]) {
    await ensureMongoConnection();
    return SeatMapModel.deleteMany({ _id: { $in: ids } }).exec();
}