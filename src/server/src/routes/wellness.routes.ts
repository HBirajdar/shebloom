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
    const [waterLog, moodLog, allSymptomLogs] = await Promise.all([
      prisma.waterLog.findFirst({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.moodLog.findFirst({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } }, orderBy: { logDate: 'desc' } }),
      prisma.symptomLog.findMany({ where: { userId: uid, logDate: { gte: todayStart, lte: todayEnd } }, orderBy: { logDate: 'desc' } }),
    ]);

    // Extract sleep and exercise from encoded symptom entries
    let sleepHours = 0;
    let exerciseDone = false;
    const realSymptoms: string[] = [];
    allSymptomLogs.forEach(log => {
      (log.symptoms || []).forEach(sym => {
        if (sym.startsWith('sleep:')) { sleepHours = parseFloat(sym.split(':')[1]) || 0; }
        else if (sym.startsWith('exercise:')) { exerciseDone = true; }
        else { realSymptoms.push(sym); }
      });
    });

    // Score components (each out of 100)
    const moodScore = moodLog ? { GREAT: 100, GOOD: 80, OKAY: 60, LOW: 40, BAD: 20 }[moodLog.mood as string] ?? 60 : 60;
    const waterGlasses = waterLog?.glasses ?? 0;
    const waterTarget = waterLog?.targetGlasses ?? 8;
    const waterScore = Math.min(100, Math.round((waterGlasses / waterTarget) * 100));
    const symptomCount = realSymptoms.length;
    const symptomScore = Math.max(0, 100 - symptomCount * 15);

    // Weighted composite
    const composite = Math.round(moodScore * 0.4 + waterScore * 0.3 + symptomScore * 0.3);

    s.json({
      success: true,
      data: {
        score: composite,
        components: {
          mood: { score: moodScore, logged: !!moodLog, value: moodLog?.mood || null },
          water: { score: waterScore, glasses: waterGlasses, target: waterTarget },
          sleep: { logged: sleepHours > 0, hours: sleepHours },
          exercise: { logged: exerciseDone },
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

// ─── Authenticated: wellness history ──────────────
r.get('/history', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const days = Math.min(Math.max(parseInt(String(q.query.days)) || 30, 1), 90);

    const MOOD_EMOJI: Record<string, string> = { GREAT: '🤩', GOOD: '😊', OKAY: '😐', LOW: '😔', BAD: '😭' };
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Build date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Query all logs in parallel
    const [waterLogs, moodLogs, symptomLogs] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId: uid, logDate: { gte: startDate, lte: endDate } } }),
      prisma.moodLog.findMany({ where: { userId: uid, logDate: { gte: startDate, lte: endDate } }, orderBy: { logDate: 'desc' } }),
      prisma.symptomLog.findMany({ where: { userId: uid, logDate: { gte: startDate, lte: endDate } }, orderBy: { logDate: 'desc' } }),
    ]);

    // Index logs by date string (YYYY-MM-DD)
    const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

    const waterByDate: Record<string, typeof waterLogs[0]> = {};
    waterLogs.forEach(l => { waterByDate[toDateKey(new Date(l.logDate))] = l; });

    const moodByDate: Record<string, typeof moodLogs[0]> = {};
    moodLogs.forEach(l => { const k = toDateKey(new Date(l.logDate)); if (!moodByDate[k]) moodByDate[k] = l; });

    const symptomsByDate: Record<string, typeof symptomLogs> = {};
    symptomLogs.forEach(l => {
      const k = toDateKey(new Date(l.logDate));
      if (!symptomsByDate[k]) symptomsByDate[k] = [];
      symptomsByDate[k].push(l);
    });

    const todayKey = toDateKey(now);

    // Build daily records
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = toDateKey(d);
      const dayLabel = DAY_LABELS[d.getDay()];

      // Water
      const wl = waterByDate[key];
      const glasses = wl?.glasses ?? 0;
      const target = wl?.targetGlasses ?? 8;
      const waterPct = Math.round((glasses / target) * 100);

      // Mood
      const ml = moodByDate[key];

      // Sleep & exercise from symptom logs
      let sleepHours = 0;
      let exerciseDone = false;
      const daySymptoms = symptomsByDate[key] || [];
      daySymptoms.forEach(log => {
        (log.symptoms || []).forEach((sym: string) => {
          if (sym.startsWith('sleep:')) sleepHours = parseFloat(sym.split(':')[1]) || 0;
          else if (sym.startsWith('exercise:')) exerciseDone = true;
        });
      });

      // Score: water(30) + mood(25) + sleep(25) + exercise(20)
      const waterScore = Math.min(30, Math.round((glasses / 8) * 30));
      const moodScore = ml ? 25 : 0;
      const sleepScore = sleepHours > 0 ? 25 : 0;
      const exerciseScore = exerciseDone ? 20 : 0;
      const score = waterScore + moodScore + sleepScore + exerciseScore;

      result.push({
        date: key,
        dayLabel,
        water: { glasses, target, pct: waterPct },
        sleep: { hours: sleepHours, logged: sleepHours > 0 },
        exercise: { done: exerciseDone },
        mood: ml ? { value: ml.mood, emoji: MOOD_EMOJI[ml.mood as string] || '😐' } : null,
        score,
        isToday: key === todayKey,
      });
    }

    s.json({ success: true, data: result });
  } catch (e) { n(e); }
});

export default r;
