import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendBookingConfirmation, sendDoctorNotification } from '../services/email.service';

const r = Router();
r.use(authenticate);

// POST / — create appointment with Jitsi video link
r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { doctorId, doctorName, scheduledAt, reason, notes } = q.body;

    // Try to find doctor in DB
    const doctor = doctorId
      ? await prisma.doctor.findUnique({ where: { id: doctorId } }).catch(() => null)
      : null;

    const resolvedDoctorName = doctor?.fullName || doctorName || 'Doctor';

    // Generate Jitsi room
    const jitsiRoomId = `VedaClue-${resolvedDoctorName.replace(/\s+/g, '-')}-${Date.now()}`;
    const videoLink = `https://meet.jit.si/${jitsiRoomId}`;

    const appt = await prisma.appointment.create({
      data: {
        userId: q.user!.id,
        doctorId: doctor ? doctorId : null,
        doctorName: resolvedDoctorName,
        scheduledAt: new Date(scheduledAt),
        amountPaid: doctor ? doctor.consultationFee : 0,
        notes: [reason, notes].filter(Boolean).join(' | ') || null,
        meetingLink: videoLink,
      },
      include: { doctor: { select: { fullName: true, specialization: true } } },
    });

    // Send emails (fire-and-forget, never crash)
    try {
      const user = await prisma.user.findUnique({ where: { id: q.user!.id }, select: { fullName: true, email: true } });
      const dateStr = new Date(scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const timeStr = new Date(scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      if (user?.email) {
        await sendBookingConfirmation(user.email, {
          patientName: user.fullName,
          doctorName: resolvedDoctorName,
          specialization: doctor?.specialization || appt.doctor?.specialization || 'General',
          date: dateStr,
          time: timeStr,
          appointmentId: appt.id,
          notes: reason || undefined,
        });
      }

      // Notify doctor if they have an email via their user account
      if (doctor?.userId) {
        const doctorUser = await prisma.user.findUnique({ where: { id: doctor.userId }, select: { email: true } });
        if (doctorUser?.email) {
          await sendDoctorNotification(doctorUser.email, {
            doctorName: resolvedDoctorName,
            patientName: user?.fullName || 'Patient',
            date: dateStr,
            time: timeStr,
            appointmentId: appt.id,
            notes: reason || undefined,
          });
        }
      }
    } catch (emailErr) {
      console.error('[Appointment] Email sending failed (non-fatal):', emailErr);
    }

    s.status(201).json({
      success: true,
      data: {
        ...appt,
        videoLink,
        jitsiRoomId,
        doctor: appt.doctor || { fullName: resolvedDoctorName, specialization: '' },
      },
    });
  } catch (e) { n(e); }
});

// GET / — list user's appointments
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data = await prisma.appointment.findMany({
      where: { userId: q.user!.id },
      include: { doctor: { select: { fullName: true, specialization: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
    const result = data.map((a: any) => ({
      ...a,
      videoLink: a.meetingLink,
      doctor: a.doctor || { fullName: a.doctorName || 'Doctor', specialization: '' },
    }));
    s.json({ success: true, data: result });
  } catch (e) { n(e); }
});

// GET /:id — single appointment
r.get('/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: q.params.id },
      include: { doctor: { select: { fullName: true, specialization: true } } },
    });
    if (!appt) { s.status(404).json({ success: false, error: 'Appointment not found' }); return; }
    s.json({
      success: true,
      data: {
        ...appt,
        videoLink: appt.meetingLink,
        doctor: appt.doctor || { fullName: appt.doctorName || 'Doctor', specialization: '' },
      },
    });
  } catch (e) { n(e); }
});

// PATCH /:id/cancel — cancel appointment
r.patch('/:id/cancel', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    s.json({
      success: true,
      data: await prisma.appointment.update({
        where: { id: q.params.id },
        data: { status: 'CANCELLED', cancellationReason: q.body.reason },
      }),
    });
  } catch (e) { n(e); }
});

// PATCH /:id/status — admin update status
r.patch('/:id/status', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { status } = q.body;
    if (!status || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      s.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }
    const appt = await prisma.appointment.update({
      where: { id: q.params.id },
      data: { status },
    });
    s.json({ success: true, data: appt });
  } catch (e) { n(e); }
});

export default r;
