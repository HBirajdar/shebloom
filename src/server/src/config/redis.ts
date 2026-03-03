import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis;

export const connectRedis = async (): Promise<Redis> => {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => logger.error('Redis connection error:', err));
  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redis.connect();
  return redis;
};

export const getRedis = (): Redis => {
  if (!redis) throw new Error('Redis not initialized');
  return redis;
};

export const cacheGet = async <T = any>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Cache GET error for key ${key}:`, err);
    return null;
  }
};

export const cacheSet = async (key: string, data: any, ttlSeconds = 3600): Promise<void> => {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    logger.error(`Cache SET error for key ${key}:`, err);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (err) {
    logger.error(`Cache DEL error for key ${key}:`, err);
  }
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.error(`Cache DEL pattern error for ${pattern}:`, err);
  }
};
