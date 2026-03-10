import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
const r = Router(); r.use(authenticate);

r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { doctorId, doctorName, scheduledAt, reason, notes } = q.body;
    // Try to find doctor in DB (may be an admin/local doctor not in DB)
    const doctor = doctorId ? await prisma.doctor.findUnique({ where: { id: doctorId } }).catch(() => null) : null;
    const appt = await prisma.appointment.create({
      data: {
        userId: q.user!.id,
        doctorId: doctor ? doctorId : null,
        doctorName: doctor?.fullName || doctorName || 'Doctor',
        scheduledAt: new Date(scheduledAt),
        amountPaid: doctor ? doctor.consultationFee : 0,
        notes: [reason, notes].filter(Boolean).join(' | ') || null,
      },
      include: { doctor: { select: { fullName: true, specialization: true } } },
    });
    s.status(201).json({
      success: true,
      data: {
        ...appt,
        doctor: appt.doctor || { fullName: appt.doctorName || 'Doctor', specialization: '' },
      },
    });
  } catch (e) { n(e); }
});

r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data = await prisma.appointment.findMany({
      where: { userId: q.user!.id },
      include: { doctor: { select: { fullName: true, specialization: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
    const result = data.map((a: any) => ({
      ...a,
      doctor: a.doctor || { fullName: a.doctorName || 'Doctor', specialization: '' },
    }));
    s.json({ success: true, data: result });
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
