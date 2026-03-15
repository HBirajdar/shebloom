// ══════════════════════════════════════════════════════
// Safe Prisma DB Push
// 1. Backs up all data
// 2. Runs prisma db push (WITHOUT --accept-data-loss)
// 3. Verifies row counts match post-push
// Usage: npm run db:safe-push
// ══════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CORE_MODELS = [
  'user', 'userProfile', 'cycle', 'moodLog', 'symptomLog',
  'doctor', 'appointment', 'article', 'order', 'product',
  'subscription', 'communityPost',
] as const;

async function getRowCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const model of CORE_MODELS) {
    try {
      counts[model] = await (prisma as any)[model].count();
    } catch {
      counts[model] = -1; // model doesn't exist yet
    }
  }
  return counts;
}

async function safePush() {
  console.log('═══════════════════════════════════════');
  console.log('  Safe Prisma DB Push');
  console.log('═══════════════════════════════════════\n');

  // Step 1: Backup
  console.log('Step 1/3: Creating backup...');
  try {
    execSync('npx tsx scripts/db-backup.ts', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('\nBackup failed! Aborting push.\n');
    process.exit(1);
  }

  // Step 2: Get pre-push counts
  console.log('\nStep 2/3: Running prisma db push...');
  const preCounts = await getRowCounts();
  console.log('  Pre-push row counts:');
  for (const [model, count] of Object.entries(preCounts)) {
    if (count > 0) console.log(`    ${model}: ${count}`);
  }

  try {
    execSync('npx prisma db push', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (e) {
    console.error('\nprisma db push failed!');
    console.error('Your backup is safe in src/server/backups/');
    console.error('Review the error above and fix schema issues.\n');
    process.exit(1);
  }

  // Step 3: Verify counts
  console.log('\nStep 3/3: Verifying data integrity...');
  const postCounts = await getRowCounts();
  let hasLoss = false;

  for (const [model, preCount] of Object.entries(preCounts)) {
    const postCount = postCounts[model] ?? -1;
    if (preCount > 0 && postCount < preCount) {
      console.error(`  LOSS: ${model}: ${preCount} -> ${postCount}`);
      hasLoss = true;
    } else if (preCount > 0) {
      console.log(`  ${model}: ${preCount} -> ${postCount}`);
    }
  }

  if (hasLoss) {
    console.error('\n  DATA LOSS DETECTED! Check backup in src/server/backups/\n');
    process.exit(1);
  }

  console.log('\n  Safe push complete! All data verified.\n');
  await prisma.$disconnect();
}

safePush().catch((e) => {
  console.error('Safe push failed:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
