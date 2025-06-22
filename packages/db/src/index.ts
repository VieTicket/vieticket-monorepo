export * from "./postgres/connection"
export * from "./postgres/schema"

// Method to get env POSTGRES_URL and create DB connector
//  createDB()

// Method to create singleton DB if not exists
// getDB() that calls createDB()

// Singleton db = null...

// Other functions call DB in other modules:
// const db = getDB()