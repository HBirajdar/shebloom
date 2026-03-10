// ══════════════════════════════════════════════════════
// src/server/src/routes/notification.routes.ts
// GET  /notifications            – list user notifications
// PUT  /notifications/:id/read   – mark one as read
// PUT  /notifications/read-all   – mark all as read
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const r = Router();
r.use(authenticate);

// ─── GET / ───────────────────────────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: q.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    s.json({ success: true, data: notifications, unreadCount });
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
    s.json({ success: true, message: 'All notifications marked as read' });
  } catch (e) { n(e); }
});

// ─── PUT /:id/read ───────────────────────────────────
r.put('/:id/read', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: q.params.id, userId: q.user!.id },
    });
    if (!notification) { s.status(404).json({ success: false, error: 'Notification not found' }); return; }
    await prisma.notification.update({ where: { id: q.params.id }, data: { isRead: true } });
    s.json({ success: true, message: 'Marked as read' });
  } catch (e) { n(e); }
});

// ─── PATCH /:id/read (legacy compat) ────────────────
r.patch('/:id/read', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await prisma.notification.update({ where: { id: q.params.id }, data: { isRead: true } });
    s.json({ success: true });
  } catch (e) { n(e); }
});

export default r;
