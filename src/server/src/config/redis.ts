import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis | null = null;
let isConnected = false;

export const connectRedis = async (): Promise<Redis> => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
    connectTimeout: 10000,
  });

  redis.on('error', (err) => {
    if (isConnected) logger.error('Redis connection error:', err.message);
    isConnected = false;
  });
  redis.on('connect', () => {
    isConnected = true;
    logger.info('Redis connected');
  });
  redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redis.connect();
  isConnected = true;
  return redis;
};

export const getRedis = (): Redis | null => redis;

// All cache operations fail silently if Redis is unavailable
export const cacheGet = async <T = any>(key: string): Promise<T | null> => {
  if (!redis || !isConnected) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err: any) {
    logger.error(`Cache GET error for key ${key}: ${err.message}`);
    return null;
  }
};

export const cacheSet = async (key: string, data: any, ttlSeconds = 3600): Promise<void> => {
  if (!redis || !isConnected) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err: any) {
    logger.error(`Cache SET error for key ${key}: ${err.message}`);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  if (!redis || !isConnected) return;
  try {
    await redis.del(key);
  } catch (err: any) {
    logger.error(`Cache DEL error for key ${key}: ${err.message}`);
  }
};

/** Increment a counter key with TTL. Returns the new count. Used for per-key rate limiting. */
export const cacheIncr = async (key: string, ttlSeconds: number): Promise<number> => {
  if (!redis || !isConnected) return 0; // fail-open if Redis is down
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds); // set TTL on first hit
    return count;
  } catch (err: any) {
    logger.error(`Cache INCR error for key ${key}: ${err.message}`);
    return 0;
  }
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  if (!redis || !isConnected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err: any) {
    logger.error(`Cache DEL pattern error for ${pattern}: ${err.message}`);
  }
};
