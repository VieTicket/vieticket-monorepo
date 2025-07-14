import { connect, Connection, connection } from 'mongoose';

// Use globalThis to ensure a single connection is used across hot reloads in development.
// This is a robust pattern for MongoDB connections in a Next.js/serverless environment.
const globalForMongo = globalThis as unknown as {
  mongoose: Connection | undefined;
};

/**
 * The primary, ready-to-use MongoDB connection.
 * It automatically infers the MONGODB_URI from the environment.
 */
export const mongoDb: Connection = globalForMongo.mongoose ?? createMongoInstance();

/**
 * Configuration function to create a new MongoDB connection, overriding the
 * default environment variable. This is useful for specific scenarios like
 * connecting to a different test database.
 *
 * @param {string} uri - The full MongoDB connection string.
 * @returns {Promise<Connection>} A new MongoDB connection.
 */
export async function configureMongo(uri: string): Promise<Connection> {
  return createMongoInstance(uri);
}

/**
 * The core function that creates the MongoDB connection.
 * It can be called with a specific URI or will fall back to the environment variable.
 */
function createMongoInstance(uri?: string): Connection {
  const connectionString = uri ?? process.env.MONGODB_URI;

  if (!connectionString) {
    throw new Error(
      "MONGODB_URI is not set. Please provide it in your .env file or via the configureMongo function.",
    );
  }

  // Connect to MongoDB
  connect(connectionString, {
    // Recommended MongoDB connection options
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
  });

  // Get the default connection
  const mongooseConnection = connection;

  // Cache the connection in the global object for subsequent calls if it's the default one.
  if (!uri) {
    globalForMongo.mongoose = mongooseConnection;
  }

  // Connection event listeners
  mongooseConnection.on('connected', () => {
    console.log('MongoDB connected successfully');
  });

  mongooseConnection.on('error', (err: Error) => {
    console.error('MongoDB connection error:', err);
  });

  mongooseConnection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  // Handle application termination
  process.on('SIGINT', async () => {
    await mongooseConnection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });

  return mongooseConnection;
}

/**
 * Helper function to ensure MongoDB is connected before using models.
 * This is particularly useful in serverless environments.
 */
export async function ensureMongoConnection(): Promise<void> {
  if (mongoDb.readyState === 1) {
    return; // Already connected
  }

  if (mongoDb.readyState === 2) {
    // Currently connecting, wait for connection
    await new Promise<void>((resolve) => {
      mongoDb.once('connected', resolve);
    });
    return;
  }

  // Not connected, trigger connection
  const connectionString = process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  await connect(connectionString);
}
