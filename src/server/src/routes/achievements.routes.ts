// ══════════════════════════════════════════════════════
// src/server/src/routes/achievements.routes.ts
// GET /achievements  – compute and return user's earned badges
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response.utils';

const r = Router();
r.use(authenticate);

// ─── GET /achievements ───────────────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;

    // Fetch all counts in parallel to avoid N+1 queries
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      cycleCount,
      completedCycleCount,
      symptomCount,
      moodCount,
      moodLogsLast7Days,
      waterLogsLast7Days,
      user,
    ] = await Promise.all([
      prisma.cycle.count({ where: { userId: uid } }),
      prisma.cycle.count({ where: { userId: uid, endDate: { not: null } } }),
      prisma.symptomLog.count({ where: { userId: uid } }),
      prisma.moodLog.count({ where: { userId: uid } }),
      prisma.moodLog.findMany({
        where: { userId: uid, logDate: { gte: sevenDaysAgo } },
        select: { logDate: true },
        orderBy: { logDate: 'asc' },
      }),
      prisma.waterLog.findMany({
        where: { userId: uid, logDate: { gte: sevenDaysAgo } },
      }),
      prisma.user.findUnique({ where: { id: uid }, select: { createdAt: true } }),
    ]);

    const uniqueMoodDays = new Set(moodLogsLast7Days.map(l => l.logDate.toISOString().slice(0, 10)));
    const waterGoalDays = waterLogsLast7Days.filter(l => l.glasses >= l.targetGlasses);

    const thirtyDaysOld = user ? new Date(user.createdAt) : new Date();
    thirtyDaysOld.setDate(thirtyDaysOld.getDate() + 30);

    const achievements = [
      {
        id: 'first_period',
        title: 'First Log',
        description: 'Logged your first period',
        icon: '🌸',
        category: 'tracking',
        earned: cycleCount >= 1,
      },
      {
        id: 'streak_7',
        title: '7-Day Streak',
        description: 'Logged mood or symptoms 7 days in a row',
        icon: '🔥',
        category: 'consistency',
        earned: uniqueMoodDays.size >= 7,
      },
      {
        id: 'three_cycles',
        title: 'Cycle Expert',
        description: 'Tracked 3 complete cycles',
        icon: '🌙',
        category: 'tracking',
        earned: completedCycleCount >= 3,
      },
      {
        id: 'water_week',
        title: 'Hydration Hero',
        description: 'Hit your water goal 7 days in a row',
        icon: '💧',
        category: 'wellness',
        earned: waterGoalDays.length >= 7,
      },
      {
        id: 'mood_master',
        title: 'Mood Master',
        description: 'Logged mood 30 times',
        icon: '😊',
        category: 'awareness',
        earned: moodCount >= 30,
      },
      {
        id: 'symptom_tracker',
        title: 'Symptom Tracker',
        description: 'Tracked symptoms 10 times',
        icon: '📊',
        category: 'tracking',
        earned: symptomCount >= 10,
      },
      {
        id: 'early_bird',
        title: 'Early Adopter',
        description: 'Member since the beginning',
        icon: '⭐',
        category: 'special',
        earned: !!user && new Date() >= thirtyDaysOld,
      },
    ];

    const earned = achievements.filter(a => a.earned).length;

    successResponse(s, {
      achievements,
      summary: { total: achievements.length, earned, remaining: achievements.length - earned },
    });
  } catch (e) { n(e); }
});

export default r;
