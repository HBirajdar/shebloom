import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
const r = Router(); r.use(authenticate);
r.get('/current', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { s.json({ success: true, data: await prisma.pregnancy.findFirst({ where: { userId: q.user!.id, isActive: true }, include: { checklistItems: true } }) }); } catch(e) { n(e); }
});
r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { const p = await prisma.pregnancy.create({ data: { userId: q.user!.id, dueDate: new Date(q.body.dueDate) } }); s.status(201).json({ success: true, data: p }); } catch(e) { n(e); }
});
export default r;
