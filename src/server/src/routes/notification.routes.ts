import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
const r = Router(); r.use(authenticate);
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { s.json({ success: true, data: await prisma.notification.findMany({ where: { userId: q.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }) }); } catch(e) { n(e); }
});
r.patch('/:id/read', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { await prisma.notification.update({ where: { id: q.params.id }, data: { isRead: true } }); s.json({ success: true }); } catch(e) { n(e); }
});
export default r;
