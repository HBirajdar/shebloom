import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
const r = Router(); r.use(authenticate);
r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { const d = await prisma.doctor.findUnique({ where: { id: q.body.doctorId } }); if(!d) return s.status(404).json({error:'Not found'}); s.status(201).json({ success: true, data: await prisma.appointment.create({ data: { userId: q.user!.id, doctorId: q.body.doctorId, scheduledAt: new Date(q.body.scheduledAt), amountPaid: d.consultationFee } }) }); } catch(e) { n(e); }
});
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { s.json({ success: true, data: await prisma.appointment.findMany({ where: { userId: q.user!.id }, orderBy: { scheduledAt: 'desc' } }) }); } catch(e) { n(e); }
});
r.patch('/:id/cancel', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { s.json({ success: true, data: await prisma.appointment.update({ where: { id: q.params.id }, data: { status: 'CANCELLED' } }) }); } catch(e) { n(e); }
});
export default r;
