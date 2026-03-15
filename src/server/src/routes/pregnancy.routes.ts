// ══════════════════════════════════════════════════════
// src/server/src/routes/pregnancy.routes.ts
// GET    /pregnancy  – get active pregnancy + week data
// POST   /pregnancy  – create pregnancy (dueDate or lastPeriodDate)
// DELETE /pregnancy  – end/remove pregnancy
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';

const BABY_SIZES: Record<number, { emoji: string; name: string }> = {
  4:  { emoji: '🌱', name: 'poppy seed' },
  8:  { emoji: '🫐', name: 'raspberry' },
  12: { emoji: '🍋', name: 'lime' },
  16: { emoji: '🥑', name: 'avocado' },
  20: { emoji: '🍌', name: 'banana' },
  24: { emoji: '🌽', name: 'corn' },
  28: { emoji: '🍆', name: 'eggplant' },
  32: { emoji: '🎃', name: 'squash' },
  36: { emoji: '🍈', name: 'honeydew' },
  40: { emoji: '🍉', name: 'watermelon' },
};

const WEEKLY_MILESTONES: Record<number, { title: string; desc: string; symptoms: string; tips: string }> = {
  4:  { title: 'Implantation', desc: "The fertilised egg is implanting. Baby's heart cells are forming.", symptoms: 'Light spotting, mild cramping, fatigue', tips: 'Start prenatal vitamins with 400mcg folic acid today.' },
  8:  { title: 'All Organs Forming', desc: "Baby's heart is beating, fingers and toes are developing.", symptoms: 'Morning sickness, fatigue, tender breasts', tips: 'Ginger tea or crackers help morning sickness. Eat small frequent meals.' },
  12: { title: 'End of First Trimester', desc: 'Risk of miscarriage drops significantly. Placenta is fully formed.', symptoms: 'Nausea may ease, energy returning', tips: 'Schedule nuchal translucency scan this week.' },
  16: { title: 'Baby Can Hear', desc: 'Baby can now hear sounds! Tiny facial expressions are forming.', symptoms: 'Round ligament pain, skin changes', tips: 'Talk or sing to your baby — they can hear you!' },
  20: { title: 'Halfway There!', desc: "You're at the midpoint! Baby weighs about 300g now.", symptoms: 'Baby movements (quickening)', tips: 'Schedule your 20-week anatomy scan. Start sleeping on your side.' },
  24: { title: 'Viability Milestone', desc: 'Baby could now survive outside the womb with intensive care.', symptoms: 'Braxton Hicks contractions beginning', tips: 'Start pregnancy-safe exercise like walking or swimming.' },
  28: { title: 'Third Trimester Begins', desc: 'Baby opens eyes and can distinguish light from dark.', symptoms: 'Back pain, shortness of breath', tips: 'Begin kick counting — aim for 10 movements per hour.' },
  32: { title: 'Rapid Brain Growth', desc: "Baby's brain is growing rapidly. Fingernails have grown.", symptoms: 'Frequent urination, difficulty sleeping', tips: 'Pack your hospital bag. Tour the labour ward.' },
  36: { title: 'Almost Ready', desc: 'Baby is head-down (hopefully). Lungs are nearly mature.', symptoms: 'Pelvic pressure, nesting instinct', tips: 'Have your birth plan ready. Install the car seat.' },
  40: { title: 'Full Term!', desc: 'Baby is fully developed and ready to meet you!', symptoms: 'Strong contractions, water breaking', tips: 'Go to hospital when contractions are 5 min apart for 1 hour.' },
};

function getBabySize(week: number) {
  const milestones = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
  const key = milestones.reduce((prev, curr) => (Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev));
  return BABY_SIZES[key] || BABY_SIZES[40];
}

function getWeeklyMilestone(week: number) {
  const milestones = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
  const key = milestones.reduce((prev, curr) => (Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev));
  return WEEKLY_MILESTONES[key];
}

function calcWeekFromDueDate(dueDate: Date): number {
  const daysLeft = Math.floor((dueDate.getTime() - Date.now()) / 86400000);
  const daysPregnant = 280 - daysLeft;
  return Math.max(1, Math.min(40, Math.floor(daysPregnant / 7)));
}

const r = Router();
r.use(authenticate);

// ─── GET / ───────────────────────────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const pregnancy = await prisma.pregnancy.findFirst({
      where: { userId: q.user!.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!pregnancy) { successResponse(s, null); return; }
    const week = calcWeekFromDueDate(pregnancy.dueDate);
    const daysLeft = Math.max(0, Math.floor((pregnancy.dueDate.getTime() - Date.now()) / 86400000));
    const trimester = week <= 12 ? 1 : week <= 26 ? 2 : 3;
    successResponse(s, {
      id: pregnancy.id,
      dueDate: pregnancy.dueDate.toISOString(),
      pregnancyWeek: week,
      trimester,
      daysLeft,
      babySize: getBabySize(week),
      milestone: getWeeklyMilestone(week),
      progressPercent: Math.round((week / 40) * 100),
    });
  } catch (e) { n(e); }
});

// ─── POST / ──────────────────────────────────────────
r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { dueDate, lastPeriodDate } = q.body as { dueDate?: string; lastPeriodDate?: string };
    if (!dueDate && !lastPeriodDate) {
      errorResponse(s, 'Provide dueDate or lastPeriodDate', 400);
      return;
    }
    // Validate date strings
    if (dueDate && isNaN(new Date(dueDate).getTime())) { errorResponse(s, 'Invalid dueDate', 400); return; }
    if (lastPeriodDate && isNaN(new Date(lastPeriodDate).getTime())) { errorResponse(s, 'Invalid lastPeriodDate', 400); return; }
    const finalDueDate = dueDate
      ? new Date(dueDate)
      : new Date(new Date(lastPeriodDate!).getTime() + 280 * 86400000);
    // Sanity check: due date should be within reasonable range (not more than 10 months from now, not more than 9 months ago)
    const now = Date.now();
    if (finalDueDate.getTime() > now + 310 * 86400000 || finalDueDate.getTime() < now - 280 * 86400000) {
      errorResponse(s, 'Due date is out of valid range', 400); return;
    }

    await prisma.pregnancy.updateMany({ where: { userId: q.user!.id, isActive: true }, data: { isActive: false } });
    const pregnancy = await prisma.pregnancy.create({
      data: {
        userId: q.user!.id,
        dueDate: finalDueDate,
        conceptionDate: lastPeriodDate ? new Date(new Date(lastPeriodDate).getTime() + 14 * 86400000) : undefined,
      },
    });
    const week = calcWeekFromDueDate(finalDueDate);
    const daysLeft = Math.max(0, Math.floor((finalDueDate.getTime() - Date.now()) / 86400000));
    const trimester = week <= 12 ? 1 : week <= 26 ? 2 : 3;
    successResponse(s, {
      id: pregnancy.id,
      dueDate: pregnancy.dueDate.toISOString(),
      pregnancyWeek: week,
      trimester,
      daysLeft,
      babySize: getBabySize(week),
      milestone: getWeeklyMilestone(week),
      progressPercent: Math.round((week / 40) * 100),
    }, 'Pregnancy created', 201);
  } catch (e) { n(e); }
});

// ─── DELETE / ────────────────────────────────────────
r.delete('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await prisma.pregnancy.updateMany({ where: { userId: q.user!.id, isActive: true }, data: { isActive: false } });
    successResponse(s, null, 'Pregnancy data removed');
  } catch (e) { n(e); }
});

export default r;
