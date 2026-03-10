// ══════════════════════════════════════════════════════
// src/server/src/routes/achievements.routes.ts
// GET /achievements  – compute and return user's earned badges
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const r = Router();
r.use(authenticate);

// ─── Achievement definitions ─────────────────────────
const ACHIEVEMENT_DEFS = [
  {
    id: 'first_period',
    title: 'First Log',
    description: 'Logged your first period',
    icon: '🌸',
    category: 'tracking',
    check: async (uid: string) => {
      const count = await prisma.cycle.count({ where: { userId: uid } });
      return count >= 1;
    },
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Logged mood or symptoms 7 days in a row',
    icon: '🔥',
    category: 'consistency',
    check: async (uid: string) => {
      // Check last 7 days of mood logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const logs = await prisma.moodLog.findMany({
        where: { userId: uid, logDate: { gte: sevenDaysAgo } },
        select: { logDate: true },
        orderBy: { logDate: 'asc' },
      });
      const uniqueDays = new Set(logs.map(l => l.logDate.toISOString().slice(0, 10)));
      return uniqueDays.size >= 7;
    },
  },
  {
    id: 'three_cycles',
    title: 'Cycle Expert',
    description: 'Tracked 3 complete cycles',
    icon: '🌙',
    category: 'tracking',
    check: async (uid: string) => {
      const count = await prisma.cycle.count({ where: { userId: uid, endDate: { not: null } } });
      return count >= 3;
    },
  },
  {
    id: 'water_week',
    title: 'Hydration Hero',
    description: 'Hit your water goal 7 days in a row',
    icon: '💧',
    category: 'wellness',
    check: async (uid: string) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const logs = await prisma.waterLog.findMany({
        where: { userId: uid, logDate: { gte: sevenDaysAgo } },
      });
      const goalDays = logs.filter(l => l.glasses >= l.targetGlasses);
      return goalDays.length >= 7;
    },
  },
  {
    id: 'mood_master',
    title: 'Mood Master',
    description: 'Logged mood 30 times',
    icon: '😊',
    category: 'awareness',
    check: async (uid: string) => {
      const count = await prisma.moodLog.count({ where: { userId: uid } });
      return count >= 30;
    },
  },
  {
    id: 'symptom_tracker',
    title: 'Symptom Tracker',
    description: 'Tracked symptoms 10 times',
    icon: '📊',
    category: 'tracking',
    check: async (uid: string) => {
      const count = await prisma.symptomLog.count({ where: { userId: uid } });
      return count >= 10;
    },
  },
  {
    id: 'early_bird',
    title: 'Early Adopter',
    description: 'Member since the beginning',
    icon: '⭐',
    category: 'special',
    check: async (uid: string) => {
      const user = await prisma.user.findUnique({ where: { id: uid }, select: { createdAt: true } });
      if (!user) return false;
      // Earned if account is older than 30 days
      const thirtyDaysOld = new Date(user.createdAt);
      thirtyDaysOld.setDate(thirtyDaysOld.getDate() + 30);
      return new Date() >= thirtyDaysOld;
    },
  },
];

// ─── GET /achievements ───────────────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;

    // Run all checks in parallel
    const results = await Promise.allSettled(
      ACHIEVEMENT_DEFS.map(async (def) => ({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        earned: await def.check(uid).catch(() => false),
      }))
    );

    const achievements = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...ACHIEVEMENT_DEFS[i], earned: false }
    );

    const earned = achievements.filter(a => a.earned).length;

    s.json({
      success: true,
      data: {
        achievements,
        summary: { total: achievements.length, earned, remaining: achievements.length - earned },
      },
    });
  } catch (e) { n(e); }
});

export default r;
