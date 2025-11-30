import mongoose from "mongoose";

interface CachedMongoose {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

const globalForMongo = globalThis as unknown as { mongoose?: CachedMongoose };

if (!globalForMongo.mongoose) {
  globalForMongo.mongoose = { conn: null, promise: null };
}

export async function ensureMongoConnection(): Promise<mongoose.Connection | null> {
  const { conn, promise } = globalForMongo.mongoose!;

  if (conn && conn.readyState === 1) {
    return conn;
  }

  if (!promise) {
    const connectionString = process.env.MONGODB_URI;
    if (!connectionString) {
      throw new Error("MONGODB_URI is not set in environment variables");
    }

    console.log("🔗 Creating new MongoDB connection...");

    globalForMongo.mongoose!.promise = mongoose
      .connect(connectionString, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((mongoose) => {
        console.log("✅ MongoDB connection established");
        return mongoose.connection;
      });
  }

  globalForMongo.mongoose!.conn = await globalForMongo.mongoose!.promise;
  return globalForMongo.mongoose!.conn;
}

// Export the connection for backwards compatibility if needed
export const mongoDb = globalForMongo.mongoose?.conn || null;
