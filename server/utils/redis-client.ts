import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

export function useRedisClient() {
  if (!redisClient) {
    // Initialize client if it doesn't exist
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    });
  }
  
  return redisClient;
}

/**
 * Cache a value in Redis with an optional expiration time
 */
export async function cacheValue(key: string, value: any, ttlSeconds?: number): Promise<void> {
  try {
    const redis = useRedisClient();
    
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      await redis.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`Error caching value for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get a cached value from Redis
 */
export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const redis = useRedisClient();
    const result = await redis.get(key);
    
    if (!result) {
      return null;
    }
    
    return JSON.parse(result as string) as T;
  } catch (error) {
    console.error(`Error getting cached value for key ${key}:`, error);
    return null;
  }
}

/**
 * Delete a cached value from Redis
 */
export async function deleteCachedValue(key: string): Promise<void> {
  try {
    const redis = useRedisClient();
    await redis.del(key);
  } catch (error) {
    console.error(`Error deleting cached value for key ${key}:`, error);
    throw error;
  }
} 