import { Redis } from "@upstash/redis";

// Single HTTP-based client; works on Node & Edge
export const redis = Redis.fromEnv();

/**
 * Helper for basic string get/set
 */

export async function get(key: string) {
  return redis.get<string>(key);
}

export async function set(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<string | null> {
  if (ttlSeconds) {
    return redis.set(key, value, { ex: ttlSeconds });
  }
  return redis.set(key, value);
}

/**
 * JSON convenience helpers – optional
 */

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function setJSON(
  key: string,
  data: unknown,
  ttlSeconds?: number,
): Promise<string | null> {
  const serialized = JSON.stringify(data);
  if (ttlSeconds) {
    return redis.set(key, serialized, { ex: ttlSeconds });
  }
  return redis.set(key, serialized);
}
