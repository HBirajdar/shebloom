// ══════════════════════════════════════════════════════
// src/server/src/routes/reports.routes.ts
// GET /reports/summary – full health analytics for user
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response.utils';

const r = Router();
r.use(authenticate);

r.get('/summary', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;

    // ── Fetch all data in parallel ──────────────────
    const [cycles, moodLogs, symptomLogs, waterLogs] = await Promise.all([
      prisma.cycle.findMany({
        where: { userId: uid },
        orderBy: { startDate: 'asc' },
      }),
      prisma.moodLog.findMany({
        where: { userId: uid },
        orderBy: { logDate: 'desc' },
        take: 90,
      }),
      prisma.symptomLog.findMany({
        where: { userId: uid },
        orderBy: { logDate: 'desc' },
        take: 200,
      }),
      prisma.waterLog.findMany({
        where: { userId: uid, logDate: { gte: new Date(Date.now() - 14 * 86400000) } },
        orderBy: { logDate: 'asc' },
      }),
    ]);

    const totalCycles = cycles.length;

    // ── Avg cycle length ────────────────────────────
    const completedCycles = cycles.filter(c => c.endDate && c.cycleLength);
    const avgCycleLength = completedCycles.length
      ? Math.round(completedCycles.reduce((sum, c) => sum + (c.cycleLength || 28), 0) / completedCycles.length)
      : 28;

    // ── Avg period duration ─────────────────────────
    const avgDuration = completedCycles.length
      ? Math.round(completedCycles.reduce((sum, c) => sum + (c.periodLength || 5), 0) / completedCycles.length)
      : 5;

    // ── Regularity (how consistent cycle lengths are) ──
    let regularity = 85;
    if (completedCycles.length >= 3) {
      const lengths = completedCycles.map(c => c.cycleLength || 28);
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);
      regularity = Math.max(0, Math.min(100, Math.round(100 - stdDev * 10)));
    }

    // ── First period date ───────────────────────────
    const firstPeriodDate = cycles.length > 0 ? cycles[0].startDate.toISOString() : null;

    // ── All cycles formatted ────────────────────────
    const allCycles = [...cycles].reverse().map((c, i) => ({
      id: c.id,
      number: cycles.length - i,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() || null,
      cycleLength: c.cycleLength || avgCycleLength,
      periodLength: c.periodLength || avgDuration,
      notes: c.notes || '',
    }));

    // ── Symptom frequency ───────────────────────────
    const symptomCount: Record<string, number> = {};
    symptomLogs.forEach(log => {
      (log.symptoms || []).forEach(sym => {
        // Skip sleep/exercise encoded entries
        if (sym.includes(':')) return;
        symptomCount[sym] = (symptomCount[sym] || 0) + 1;
      });
    });
    // Convert to percentage of total cycles
    const symptomFrequency: Record<string, number> = {};
    Object.entries(symptomCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .forEach(([sym, count]) => {
        symptomFrequency[sym] = totalCycles > 0 ? Math.round((count / totalCycles) * 100) : count;
      });

    // ── Mood by phase (simplified — based on cycle day when logged) ──
    const moodByPhase: Record<string, string> = {
      menstrual: 'LOW',
      follicular: 'GOOD',
      ovulation: 'GREAT',
      luteal: 'OKAY',
    };
    // Override with actual data if enough mood logs exist
    if (moodLogs.length >= 10) {
      const phaseGroups: Record<string, string[]> = { menstrual: [], follicular: [], ovulation: [], luteal: [] };
      moodLogs.forEach(ml => {
        // Rough phase assignment based on day of month as a proxy
        const day = new Date(ml.logDate).getDate();
        const phase = day <= 5 ? 'menstrual' : day <= 14 ? 'follicular' : day <= 17 ? 'ovulation' : 'luteal';
        phaseGroups[phase].push(ml.mood);
      });
      Object.entries(phaseGroups).forEach(([phase, moods]) => {
        if (moods.length === 0) return;
        const freq: Record<string, number> = {};
        moods.forEach(m => { freq[m] = (freq[m] || 0) + 1; });
        moodByPhase[phase] = Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0];
      });
    }

    // ── Wellness history (last 14 days scores) ──────
    const wellnessHistory: { date: string; score: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayMood = moodLogs.find(m => {
        const d = new Date(m.logDate);
        return d >= day && d <= dayEnd;
      });
      const dayWater = waterLogs.find(w => {
        const d = new Date(w.logDate);
        return d >= day && d <= dayEnd;
      });

      const moodScore = dayMood
        ? ({ GREAT: 100, GOOD: 80, OKAY: 60, LOW: 40, BAD: 20 } as Record<string, number>)[dayMood.mood] ?? 60
        : 60;
      const waterScore = dayWater ? Math.min(100, Math.round((dayWater.glasses / 8) * 100)) : 40;
      const score = Math.round(moodScore * 0.6 + waterScore * 0.4);

      wellnessHistory.push({ date: day.toISOString(), score });
    }

    successResponse(s, {
      totalCycles,
      avgCycleLength,
      avgDuration,
      regularity,
      firstPeriodDate,
      allCycles,
      symptomFrequency,
      moodByPhase,
      wellnessHistory,
    });
  } catch (e) { n(e); }
});

export default r;
