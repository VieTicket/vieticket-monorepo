import { User } from "@vieticket/db/pg/schemas/users";
import { Shape } from "@vieticket/db/mongo/models/seat-map";
import { createSeatMap, findSeatMapsByCreator, findSeatMapsByName } from "@vieticket/repos/seat-map";
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
    const invalidShapes = shapes.filter(shape => 
        !shape ||
        typeof shape.id !== 'string' ||
        typeof shape.type !== 'string' ||
        typeof shape.x !== 'number' ||
        typeof shape.y !== 'number' ||
        !['rect', 'circle', 'text', 'polygon'].includes(shape.type)
    );

    if (invalidShapes.length > 0) {
        throw new Error("Invalid shapes detected: All shapes must have valid id, type, x, y properties");
    }

    // 4. Prepare seat map data
    const seatMapData: CreateSeatMapInput = {
        name: name.trim(),
        shapes: shapes,
        image: imageUrl.trim(),
        createdBy: user.id
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
        const plainSeatMaps = seatMaps.map(seatMap => ({
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
        const plainSeatMaps = seatMaps.map(seatMap => ({
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