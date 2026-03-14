// TODO: Initialize Sentry for error tracking (npm install @sentry/node)
// ══════════════════════════════════════════════════════
// src/server/src/server.ts — Entry Point (Resilient)
// ══════════════════════════════════════════════════════

import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import prisma, { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { execSync } from 'child_process';
import cron from 'node-cron';

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
  // Schema push is handled by the start command (npm start / nixpacks cmd)
  // Only regenerate Prisma Client here so runtime JS matches current schema
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

  // ═══════════════════════════════════════════════════
  // CRON JOBS — automated time-based maintenance
  // ═══════════════════════════════════════════════════

  // 4a. Auto-complete past appointments (every 15 min)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await prisma.appointment.updateMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledAt: { lt: new Date() },
        },
        data: { status: 'COMPLETED' },
      });
      if (result.count > 0) {
        logger.info(`Cron: auto-completed ${result.count} past appointment(s)`);
      }
    } catch (err: any) {
      logger.warn('Cron auto-complete failed: ' + (err.message || '').slice(0, 200));
    }
  });

  // 4b. Deactivate expired community polls (every 15 min)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await prisma.communityPoll.updateMany({
        where: {
          isActive: true,
          expiresAt: { not: null, lt: new Date() },
        },
        data: { isActive: false },
      });
      if (result.count > 0) {
        logger.info(`Cron: deactivated ${result.count} expired poll(s)`);
      }
    } catch (err: any) {
      logger.warn('Cron poll expiry failed: ' + (err.message || '').slice(0, 200));
    }
  });

  // 4c. Deactivate expired coupons (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await prisma.coupon.updateMany({
        where: {
          isActive: true,
          validUntil: { not: null, lt: new Date() },
        },
        data: { isActive: false },
      });
      if (result.count > 0) {
        logger.info(`Cron: deactivated ${result.count} expired coupon(s)`);
      }
    } catch (err: any) {
      logger.warn('Cron coupon expiry failed: ' + (err.message || '').slice(0, 200));
    }
  });

  // 4d. Clean up expired OTPs (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await prisma.otpStore.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        logger.info(`Cron: cleaned up ${result.count} expired OTP(s)`);
      }
    } catch (err: any) {
      logger.warn('Cron OTP cleanup failed: ' + (err.message || '').slice(0, 200));
    }
  });

  // 4e. Expire seller licenses (FSSAI/AYUSH) + unpublish their products (daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      // Find sellers whose licenses are about to expire
      const expiringSellers = await prisma.seller.findMany({
        where: {
          OR: [
            { fssaiStatus: 'VERIFIED', fssaiExpiry: { not: null, lt: now } },
            { ayushStatus: 'VERIFIED', ayushExpiry: { not: null, lt: now } },
          ],
        },
        select: { id: true, fssaiStatus: true, fssaiExpiry: true, ayushStatus: true, ayushExpiry: true },
      });

      const fssai = await prisma.seller.updateMany({
        where: {
          fssaiStatus: 'VERIFIED',
          fssaiExpiry: { not: null, lt: now },
        },
        data: { fssaiStatus: 'EXPIRED' },
      });
      const ayush = await prisma.seller.updateMany({
        where: {
          ayushStatus: 'VERIFIED',
          ayushExpiry: { not: null, lt: now },
        },
        data: { ayushStatus: 'EXPIRED' },
      });

      // Unpublish products for sellers who now have NO valid license
      if (expiringSellers.length > 0) {
        for (const seller of expiringSellers) {
          const fssaiStillValid = seller.fssaiStatus === 'VERIFIED' && (!seller.fssaiExpiry || seller.fssaiExpiry > now);
          const ayushStillValid = seller.ayushStatus === 'VERIFIED' && (!seller.ayushExpiry || seller.ayushExpiry > now);
          // If neither license is valid after expiry, unpublish their products
          if (!fssaiStillValid && !ayushStillValid) {
            const hidden = await prisma.product.updateMany({
              where: { sellerId: seller.id, isPublished: true },
              data: { isPublished: false, status: 'suspended' },
            });
            if (hidden.count > 0) {
              logger.info(`Cron: unpublished ${hidden.count} product(s) for seller ${seller.id} (license expired)`);
            }
          }
        }
      }

      if (fssai.count > 0 || ayush.count > 0) {
        logger.info(`Cron: expired ${fssai.count} FSSAI + ${ayush.count} AYUSH license(s)`);
      }
    } catch (err: any) {
      logger.warn('Cron license expiry failed: ' + (err.message || '').slice(0, 200));
    }
  });

  logger.info('Cron: all scheduled jobs registered');
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
