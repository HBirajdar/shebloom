// ══════════════════════════════════════════════════════
// src/server/src/server.ts — Entry Point (Resilient)
// ══════════════════════════════════════════════════════

import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import prisma, { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { execSync } from 'child_process';

const PORT = process.env.PORT || process.env.APP_PORT || 8000;

async function ensureChiefDoctor() {
  try {
    const chief = await prisma.doctor.findFirst({ where: { isChief: true } });
    if (chief) {
      logger.info(`Chief doctor exists: ${chief.fullName}`);
      return;
    }
    // Also check if Dr. Shruthi R exists but isn't marked chief
    const shruthi = await prisma.doctor.findFirst({ where: { fullName: { contains: 'Shruthi' } } });
    if (shruthi) {
      await prisma.doctor.update({
        where: { id: shruthi.id },
        data: { isChief: true, isPublished: true, isPromoted: true, status: 'active', isVerified: true },
      });
      logger.info('Marked existing Dr. Shruthi R as Chief Doctor');
      return;
    }
    // Create Dr. Shruthi R
    await prisma.doctor.create({
      data: {
        fullName: 'Dr. Shruthi R',
        specialization: 'Ayurvedic Women\'s Health & Wellness',
        qualifications: ['BAMS', 'MD (Ayurveda — Streeroga & Prasuti Tantra)', 'Panchakarma Specialist', 'Certified Yoga Therapist'],
        experienceYears: 10,
        consultationFee: 500,
        hospitalName: 'VedaClue Ayurveda Clinic',
        bio: 'Dr. Shruthi R is the founder and chief Ayurvedic physician at VedaClue. With over 10 years of experience in Streeroga (Ayurvedic Gynecology), she specializes in PCOD/PCOS management, menstrual health, fertility support, and prenatal care through traditional Ayurvedic protocols.',
        tags: ['Ayurveda', 'PCOD', 'Fertility', 'Menstrual Health', 'Pregnancy', 'Panchakarma', 'Dosha', 'Herbal Medicine'],
        languages: ['ENGLISH', 'HINDI', 'KANNADA', 'MARATHI'],
        rating: 4.9, totalReviews: 312,
        isVerified: true, isAvailable: true, isPublished: true,
        isChief: true, isPromoted: true,
        status: 'active', location: 'Pune, Maharashtra',
        approvedAt: new Date(), publishedAt: new Date(),
      },
    });
    logger.info('Created Dr. Shruthi R as Chief Doctor');
  } catch (err: any) {
    logger.warn('ensureChiefDoctor skipped: ' + (err.message || '').slice(0, 200));
  }
}

async function runMigrations() {
  // Step 1: Push schema changes — non-fatal, DB may already be in sync
  try {
    logger.info('Running database schema push...');
    execSync('npx prisma db push --accept-data-loss', {
      timeout: 60000,
      stdio: 'pipe',
      env: process.env as any,
    });
    logger.info('Database schema synced');
  } catch (err: any) {
    const msg = (err.stdout?.toString() || err.stderr?.toString() || err.message || '').slice(0, 400);
    logger.warn('Prisma db push skipped (already in sync or conflict): ' + msg);
  }

  // Step 2: Always regenerate Prisma Client so runtime JS matches current schema file
  try {
    execSync('npx prisma generate', {
      timeout: 30000,
      stdio: 'pipe',
      env: process.env as any,
    });
    logger.info('Prisma client regenerated');
  } catch (err: any) {
    logger.warn('Prisma generate warning: ' + (err.message || '').slice(0, 200));
  }
}

async function bootstrap() {
  // 1. Start HTTP server immediately so Railway health checks pass
  const server = app.listen(PORT, () => {
    logger.info(`VedaClue API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health: http://0.0.0.0:${PORT}/api/health`);
  });

  // 2. Connect database (non-fatal in dev — server is already up)
  try {
    await connectDatabase();
    logger.info('Database connected');
    await runMigrations();
    await ensureChiefDoctor();
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
// Log uncaught exceptions but don't exit — Railway will restart on real crashes anyway
process.on('uncaughtException', (e) => {
  logger.error('Uncaught Exception: ' + e.message + '\n' + e.stack);
  // Only exit on truly unrecoverable errors (not Prisma/route errors)
  if (e.message.includes('EADDRINUSE') || e.message.includes('Cannot find module')) {
    process.exit(1);
  }
});

bootstrap();
