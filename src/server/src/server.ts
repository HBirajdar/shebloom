// ══════════════════════════════════════════════════════
// src/server/src/server.ts — Entry Point (Resilient)
// ══════════════════════════════════════════════════════

import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { execSync } from 'child_process';

const PORT = process.env.PORT || process.env.APP_PORT || 8000;

async function runMigrations() {
  try {
    logger.info('Running database schema push...');
    execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
      timeout: 30000,
      stdio: 'pipe',
      env: process.env as any,
    });
    logger.info('Database schema synced');
  } catch (err: any) {
    logger.warn('Prisma db push warning (non-fatal): ' + (err.stderr?.toString() || err.message));
    // Continue anyway - schema might already be in sync
  }
}

async function bootstrap() {
  // 1. Start HTTP server immediately so Railway health checks pass
  const server = app.listen(PORT, () => {
    logger.info(`SheBloom API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health: http://0.0.0.0:${PORT}/api/health`);
  });

  // 2. Connect database (non-fatal in dev — server is already up)
  try {
    await connectDatabase();
    logger.info('Database connected');
    await runMigrations();
  } catch (error: any) {
    logger.error('Database connection failed: ' + error.message);
    if (process.env.NODE_ENV === 'production') {
      logger.error('Shutting down (production requires database)');
      server.close();
      process.exit(1);
    } else {
      logger.warn('Running without database (dev mode) — DB-dependent routes will fail');
    }
  }

  // 3. Connect Redis (always optional)
  try {
    await connectRedis();
    logger.info('Redis connected');
  } catch (redisErr: any) {
    logger.warn('Redis unavailable (caching disabled): ' + redisErr.message);
  }
}

process.on('SIGTERM', () => { logger.info('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { logger.info('SIGINT received'); process.exit(0); });
process.on('unhandledRejection', (r: any) => logger.error('Unhandled Rejection: ' + r));
process.on('uncaughtException', (e) => { logger.error('Uncaught Exception: ' + e.message); process.exit(1); });

bootstrap();
