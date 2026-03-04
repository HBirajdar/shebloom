// ══════════════════════════════════════════════════════
// src/server/src/server.ts — Entry Point
// ══════════════════════════════════════════════════════

import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

const PORT = process.env.PORT || process.env.APP_PORT || 8000;

async function bootstrap() {
  try {
    await connectDatabase();
    logger.info('Database connected');
    await connectRedis();
    logger.info('Redis connected');

    app.listen(PORT, () => {
      logger.info(`SheBloom API running on port ${PORT}`);
      logger.info(`Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => { logger.info('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { logger.info('SIGINT received'); process.exit(0); });
process.on('unhandledRejection', (r) => logger.error('Unhandled Rejection:', r));

bootstrap();
