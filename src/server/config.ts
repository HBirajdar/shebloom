// config/database.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const connectDatabase = async () => await prisma.$connect();
export default prisma;

// config/redis.ts
import Redis from 'ioredis';
let redis: Redis;
export const connectRedis = async () => {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  return redis;
};
export const getRedis = () => redis;
export const cacheGet = async (key: string) => {
  const d = await redis.get(key); return d ? JSON.parse(d) : null;
};
export const cacheSet = async (key: string, data: any, ttl = 3600) => {
  await redis.setex(key, ttl, JSON.stringify(data));
};

// config/logger.ts
import winston from 'winston';
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  })],
});

// config/env.ts
import { z } from 'zod';
export const validateEnv = () => {
  const schema = z.object({
    NODE_ENV: z.enum(['development','production','test']).default('development'),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
  });
  return schema.parse(process.env);
};
