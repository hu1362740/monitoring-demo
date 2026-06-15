import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

/**
 * @description Redis 客户端单例，使用 node-redis v4 创建
 */
export const redisClient: RedisClientType = createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`
});

// 监听 Redis 客户端错误事件，防止未捕获的错误导致进程崩溃
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

/**
 * @description 建立与 Redis 服务器的连接
 * @returns {Promise<void>} 连接成功后 resolve
 * @throws {Error} 当 Redis 服务器不可达或认证失败时抛出错误
 * @example
 * await connectRedis();
 */
export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

/**
 * @description 从 Redis 获取缓存值，自动尝试 JSON 反序列化
 * @param {string} key - 缓存键名
 * @returns {Promise<T | null>} 缓存值（反序列化后）或 null（键不存在时）
 * @example
 * const user = await getCache<{ name: string }>('user:1');
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redisClient.get(key);
  if (!value) return null;
  try {
    // 尝试 JSON 反序列化，因为大多数缓存值以 JSON 字符串存储
    return JSON.parse(value) as T;
  } catch {
    // 非 JSON 格式的原始字符串值，直接作为 T 返回
    return value as unknown as T;
  }
}

/**
 * @description 将值写入 Redis 缓存，支持设置过期时间
 * @param {string} key - 缓存键名
 * @param {T} value - 要缓存的值，对象/数组会自动 JSON 序列化
 * @param {number} [ttl] - 过期时间（秒），不传则永不过期
 * @returns {Promise<void>} 写入完成后 resolve
 * @example
 * await setCache('user:1', { name: 'Alice' }, 3600); // 缓存 1 小时
 */
export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttl) {
    // 使用 setEx 原子性地设置值和过期时间
    await redisClient.setEx(key, ttl, serialized);
  } else {
    await redisClient.set(key, serialized);
  }
}

/**
 * @description 从 Redis 中删除指定缓存键
 * @param {string} key - 要删除的缓存键名
 * @returns {Promise<void>} 删除完成后 resolve
 * @example
 * await deleteCache('user:1');
 */
export async function deleteCache(key: string): Promise<void> {
  await redisClient.del(key);
}
