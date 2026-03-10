import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
const r = Router(); r.use(authenticate);

r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { doctorId, scheduledAt, reason, notes } = q.body;
    // Check if doctor exists in DB
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      // Doctor not in DB — return 404 so frontend falls back to localStorage
      return s.status(404).json({ success: false, error: 'Doctor not in database. Saved locally.' });
    }
    const appt = await prisma.appointment.create({
      data: { userId: q.user!.id, doctorId, scheduledAt: new Date(scheduledAt), amountPaid: doctor.consultationFee, notes: [reason, notes].filter(Boolean).join(' | ') },
      include: { doctor: { select: { fullName: true, specialization: true } } },
    });
    s.status(201).json({ success: true, data: appt });
  } catch (e) { n(e); }
});

r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    s.json({ success: true, data: await prisma.appointment.findMany({
      where: { userId: q.user!.id },
      include: { doctor: { select: { fullName: true, specialization: true } } },
      orderBy: { scheduledAt: 'desc' },
    })});
  } catch (e) { n(e); }
});

r.patch('/:id/cancel', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    s.json({ success: true, data: await prisma.appointment.update({
      where: { id: q.params.id }, data: { status: 'CANCELLED', cancellationReason: q.body.reason },
    })});
  } catch (e) { n(e); }
});

export default r;
