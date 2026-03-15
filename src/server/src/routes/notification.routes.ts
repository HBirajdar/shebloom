// ══════════════════════════════════════════════════════
// src/server/src/routes/notification.routes.ts
// GET  /notifications            – list user notifications
// PUT  /notifications/:id/read   – mark one as read
// PUT  /notifications/read-all   – mark all as read
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import { getVapidPublicKey } from '../services/push.service';

const r = Router();

// ─── Public endpoint (no auth required) ──────────────
// GET /notifications/vapid-key — VAPID public key for client push subscription
r.get('/vapid-key', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) { res.status(503).json({ success: false, error: 'Push not configured' }); return; }
  successResponse(res, { publicKey: key });
});

r.use(authenticate);

// POST /notifications/subscribe — save push subscription
r.post('/subscribe', async (req: AuthRequest, res: Response) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) { errorResponse(res, 'Invalid subscription', 400); return; }
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { fcmToken: JSON.stringify(subscription) },
    });
    successResponse(res, null, 'Push subscription saved');
  } catch (e: any) { errorResponse(res, e.message, 500); }
});

// POST /notifications/unsubscribe — remove push subscription
r.post('/unsubscribe', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { fcmToken: null },
    });
    successResponse(res, null, 'Push subscription removed');
  } catch (e: any) { errorResponse(res, e.message, 500); }
});

// ─── GET /preferences ────────────────────────────────
r.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user!.id } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId: req.user!.id } });
    }
    successResponse(res, prefs);
  } catch (e: any) { errorResponse(res, e.message, 500); }
});

// ─── PUT /preferences ────────────────────────────────
r.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const allowed = [
      'pushEnabled', 'periodReminder', 'periodReminderDays',
      'ovulationReminder', 'waterReminder', 'waterIntervalHours',
      'waterStartHour', 'waterEndHour', 'moodReminder', 'moodReminderHour',
      'appointmentReminder', 'appointmentLeadMins',
    ];
    const data: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    // Validate ranges
    if (data.periodReminderDays !== undefined && (data.periodReminderDays < 1 || data.periodReminderDays > 7)) {
      errorResponse(res, 'periodReminderDays must be 1-7', 400); return;
    }
    if (data.waterIntervalHours !== undefined && (data.waterIntervalHours < 0.5 || data.waterIntervalHours > 6)) {
      errorResponse(res, 'waterIntervalHours must be 0.5-6', 400); return;
    }
    if (data.waterStartHour !== undefined && (data.waterStartHour < 0 || data.waterStartHour > 23)) {
      errorResponse(res, 'waterStartHour must be 0-23', 400); return;
    }
    if (data.waterEndHour !== undefined && (data.waterEndHour < 0 || data.waterEndHour > 23)) {
      errorResponse(res, 'waterEndHour must be 0-23', 400); return;
    }
    if (data.moodReminderHour !== undefined && (data.moodReminderHour < 0 || data.moodReminderHour > 23)) {
      errorResponse(res, 'moodReminderHour must be 0-23', 400); return;
    }
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      update: data,
      create: { userId: req.user!.id, ...data },
    });
    successResponse(res, prefs, 'Preferences updated');
  } catch (e: any) { errorResponse(res, e.message, 500); }
});

// ─── Smart notification generator ───────────────────
async function generateSmartNotifications(userId: string) {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile?.lastPeriodDate) return;
    const now = new Date();
    const cycleLength = profile.cycleLength || 28;
    const lastPeriod = new Date(profile.lastPeriodDate);
    const daysSince = Math.floor((now.getTime() - lastPeriod.getTime()) / 86400000);
    const nextPeriod = new Date(lastPeriod.getTime() + cycleLength * 86400000);
    const daysUntilPeriod = Math.floor((nextPeriod.getTime() - now.getTime()) / 86400000);
    const ovulationDay = cycleLength - 14;
    const cycleDay = (daysSince % cycleLength) + 1;

    const toCreate: any[] = [];

    // Period due in 3 days
    if (daysUntilPeriod === 3) {
      const exists = await prisma.notification.findFirst({ where: { userId, type: 'period_reminder', createdAt: { gte: new Date(now.getTime() - 86400000) } } });
      if (!exists) toCreate.push({ userId, title: 'Period Coming Soon 🩸', body: 'Your period is expected in 3 days. Stock up on essentials!', type: 'period_reminder' });
    }
    // Period is 7+ days late — alert once
    if (daysUntilPeriod <= -7) {
      const exists = await prisma.notification.findFirst({ where: { userId, type: 'period_late', createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } });
      if (!exists) toCreate.push({ userId, title: 'Period Delayed \u26A0\uFE0F', body: `Your period is ${Math.abs(daysUntilPeriod)} days late. Check your Tracker for Ayurvedic guidance, or consult a doctor if concerned.`, type: 'period_late' });
    }
    // Period is 1-3 days late — gentle nudge (once)
    if (daysUntilPeriod >= -3 && daysUntilPeriod < 0) {
      const exists = await prisma.notification.findFirst({ where: { userId, type: 'period_overdue', createdAt: { gte: new Date(now.getTime() - 3 * 86400000) } } });
      if (!exists) toCreate.push({ userId, title: 'Period Update \u{1F338}', body: `Your period is ${Math.abs(daysUntilPeriod)} day${Math.abs(daysUntilPeriod) !== 1 ? 's' : ''} past expected. This is normal sometimes \u2014 check your Dashboard for tips.`, type: 'period_overdue' });
    }
    // Ovulation today
    if (cycleDay === ovulationDay) {
      const exists = await prisma.notification.findFirst({ where: { userId, type: 'ovulation', createdAt: { gte: new Date(now.getTime() - 86400000) } } });
      if (!exists) toCreate.push({ userId, title: 'Ovulation Day ✨', body: "You're likely ovulating today — your peak fertility window!", type: 'ovulation' });
    }
    if (toCreate.length > 0) await prisma.notification.createMany({ data: toCreate });
  } catch (_) {}
}

// ─── GET / ───────────────────────────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    // Generate smart notifications on each fetch (idempotent, fire-and-forget)
    generateSmartNotifications(q.user!.id).catch(() => {});
    const notifications = await prisma.notification.findMany({
      where: { userId: q.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    // Return notifications array as data + unreadCount at top level for frontend compat
    s.status(200).json({ success: true, data: notifications, unreadCount, timestamp: new Date().toISOString() });
  } catch (e) { n(e); }
});

// ─── PUT /read-all ───────────────────────────────────
// Must come BEFORE /:id/read so it doesn't get consumed as an id
r.put('/read-all', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: q.user!.id, isRead: false },
      data: { isRead: true },
    });
    successResponse(s, null, 'All notifications marked as read');
  } catch (e) { n(e); }
});

// ─── PUT /:id/read ───────────────────────────────────
r.put('/:id/read', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: q.params.id, userId: q.user!.id },
    });
    if (!notification) { errorResponse(s, 'Notification not found', 404); return; }
    await prisma.notification.update({ where: { id: q.params.id }, data: { isRead: true } });
    successResponse(s, null, 'Marked as read');
  } catch (e) { n(e); }
});

// ─── PATCH /:id/read (legacy compat) ────────────────
r.patch('/:id/read', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: q.params.id, userId: q.user!.id },
    });
    if (!notification) { errorResponse(s, 'Notification not found', 404); return; }
    await prisma.notification.update({ where: { id: q.params.id }, data: { isRead: true } });
    successResponse(s, null, 'Marked as read');
  } catch (e) { n(e); }
});

export default r;
