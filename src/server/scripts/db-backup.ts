// ══════════════════════════════════════════════════════
// Database Backup Tool
// Exports all tables to a timestamped JSON file
// Usage: npm run db:backup
// ══════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const MODELS = [
  'user', 'userProfile', 'doshaAssessment', 'doshaQuestion', 'userWeatherCache',
  'refreshToken', 'cycle', 'moodLog', 'symptomLog', 'bBTLog', 'cervicalMucusLog',
  'fertilityDailyLog', 'waterLog', 'pregnancy', 'pregnancyChecklist',
  'doctor', 'doctorSlot', 'doctorReview', 'appointment', 'hospital', 'hospitalPrice',
  'article', 'articleBookmark', 'articleLike', 'articleComment',
  'notification', 'notificationPreference',
  'wellnessActivity', 'otpStore', 'auditLog',
  'product', 'productReview', 'wishlistItem', 'callbackRequest', 'prescription',
  'order', 'orderItem', 'doctorPayout', 'platformConfig',
  'coupon', 'couponRedemption', 'couponAuditLog',
  'pendingSubscription', 'userEvent', 'npsSurvey', 'pushCampaign',
  'referral', 'userBadge', 'emailCampaign', 'productPayout', 'paymentAuditLog',
  'program', 'programContent', 'programEnrollment',
  'seller', 'sellerTransaction',
  'communityPost', 'communityReply', 'communityLike', 'communityReport',
  'communityPoll', 'communityPollVote',
  'ayurvedicRemedy', 'doshaPhaseGuidance', 'wellnessContent', 'aIChatResponse',
  'subscriptionPlan', 'userSubscription', 'subscriptionEvent', 'subscriptionPromotion',
] as const;

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const filePath = path.join(backupDir, `backup-${timestamp}.json`);

  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  console.log('Starting database backup...\n');

  const data: Record<string, any> = {};
  const counts: Record<string, number> = {};

  for (const model of MODELS) {
    try {
      const records = await (prisma as any)[model].findMany();
      data[model] = records;
      counts[model] = records.length;
      if (records.length > 0) {
        console.log(`  ${model}: ${records.length} records`);
      }
    } catch (e: any) {
      console.log(`  ${model}: skipped (${e.message?.slice(0, 60)})`);
    }
  }

  const backup = {
    timestamp: new Date().toISOString(),
    counts,
    data,
  };

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
  const fileSizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);

  console.log(`\n  Backup complete!`);
  console.log(`  Total records: ${totalRecords}`);
  console.log(`  File: ${filePath}`);
  console.log(`  Size: ${fileSizeMB} MB\n`);

  await prisma.$disconnect();
}

backup().catch((e) => {
  console.error('Backup failed:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
