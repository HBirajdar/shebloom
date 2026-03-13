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
