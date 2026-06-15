import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

export const redisClient: RedisClientType = createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redisClient.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttl) {
    await redisClient.setEx(key, ttl, serialized);
  } else {
    await redisClient.set(key, serialized);
  }
}

export async function deleteCache(key: string): Promise<void> {
  await redisClient.del(key);
}
