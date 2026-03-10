// ══════════════════════════════════════════════════════
// src/server/src/routes/wellness.routes.ts
// GET  /wellness              – list wellness activities
// GET  /wellness/daily-score  – computed score for today
// POST /wellness/log          – log water / sleep / exercise
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const r = Router();

// ─── Public: list activities ────────────────────────
r.get('/', async (q: Request, s: Response, n: NextFunction) => {
  try {
    const w: any = { isActive: true };
    if (q.query.category) w.category = q.query.category;
    if (q.query.phase) w.cyclePhases = { has: String(q.query.phase).toUpperCase() };
    const activities = await prisma.wellnessActivity.findMany({
      where: w,
      orderBy: { createdAt: 'desc' },
    });
    s.json({ success: true, data: activities });
  } catch (e) { n(e); }
});

// ─── Authenticated: daily wellness score ────────────
r.get('/daily-score', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Gather today's logged data
    const [waterLog, moodLog, symptomLog] = await Promise.all([
      prisma.waterLog.findFirst({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.moodLog.findFirst({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } }, orderBy: { logDate: 'desc' } }),
      prisma.symptomLog.findFirst({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } }, orderBy: { logDate: 'desc' } }),
    ]);

    // Score components (each out of 100)
    const moodScore = moodLog ? { GREAT: 100, GOOD: 80, OKAY: 60, LOW: 40, BAD: 20 }[moodLog.mood as string] ?? 60 : 60;
    const waterGlasses = waterLog?.glasses ?? 0;
    const waterTarget = waterLog?.targetGlasses ?? 8;
    const waterScore = Math.min(100, Math.round((waterGlasses / waterTarget) * 100));
    const symptomCount = symptomLog?.symptoms?.length ?? 0;
    const symptomScore = Math.max(0, 100 - symptomCount * 15);

    // Weighted composite
    const composite = Math.round(moodScore * 0.4 + waterScore * 0.3 + symptomScore * 0.3);

    s.json({
      success: true,
      data: {
        score: composite,
        components: {
          mood: { score: moodScore, logged: !!moodLog },
          water: { score: waterScore, glasses: waterGlasses, target: waterTarget },
          symptoms: { score: symptomScore, count: symptomCount },
        },
        date: todayStart.toISOString(),
      },
    });
  } catch (e) { n(e); }
});

// ─── Authenticated: log water / sleep / exercise ────
r.post('/log', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const { type, value, notes } = q.body as { type: 'water' | 'sleep' | 'exercise'; value: number; notes?: string };

    if (!type || value === undefined) {
      s.status(400).json({ success: false, error: 'type and value are required' });
      return;
    }

    if (type === 'water') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const existing = await prisma.waterLog.findFirst({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } } });
      if (existing) {
        const updated = await prisma.waterLog.update({
          where: { id: existing.id },
          data: { glasses: Math.min(value, 20) },
        });
        s.json({ success: true, data: updated, message: 'Water log updated' });
      } else {
        const created = await prisma.waterLog.create({
          data: { userId: uid, glasses: Math.min(value, 20), targetGlasses: 8 },
        });
        s.json({ success: true, data: created, message: 'Water log created' });
      }
      return;
    }

    // For sleep / exercise – store as a symptom-style note (no dedicated models)
    // We encode these as special entries so they're queryable later
    const log = await prisma.symptomLog.create({
      data: {
        userId: uid,
        symptoms: [`${type}:${value}`],
        notes: notes || null,
      },
    });

    s.json({ success: true, data: log, message: `${type} log saved` });
  } catch (e) { n(e); }
});

export default r;
