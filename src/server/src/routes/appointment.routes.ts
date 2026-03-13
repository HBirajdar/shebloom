import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { sendBookingConfirmation, sendDoctorNotification, sendCancellationEmail } from '../services/email.service';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();
r.use(authenticate);

// Helper: get platform config for fee calculation
async function getConfig() {
  let c = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
  if (!c) c = await prisma.platformConfig.create({ data: { id: 'default' } });
  return c;
}

// Helper: validate & calculate coupon discount (server-side only)
async function calcCouponDiscount(code: string | undefined, userId: string, amount: number, doctorId?: string): Promise<{ discount: number; couponCode: string | null }> {
  if (!code) return { discount: 0, couponCode: null };
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
    include: { redemptions: { where: { userId } } },
  });
  if (!coupon || !coupon.isActive) return { discount: 0, couponCode: null };
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) return { discount: 0, couponCode: null };
  if (coupon.validUntil && now > coupon.validUntil) return { discount: 0, couponCode: null };
  if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== 'CONSULTATION') return { discount: 0, couponCode: null };
  if (amount > 0 && amount < coupon.minOrderAmount) return { discount: 0, couponCode: null };
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return { discount: 0, couponCode: null };
  if (coupon.redemptions.length >= coupon.maxUsesPerUser) return { discount: 0, couponCode: null };
  if (coupon.firstOrderOnly) {
    const hasOrders = await prisma.order.count({ where: { userId, paymentStatus: 'PAID' } });
    const hasAppointments = await prisma.appointment.count({ where: { userId, status: { not: 'CANCELLED' } } });
    if (hasOrders > 0 || hasAppointments > 0) return { discount: 0, couponCode: null };
  }
  if (doctorId && coupon.specificDoctorIds.length > 0 && !coupon.specificDoctorIds.includes(doctorId)) return { discount: 0, couponCode: null };

  let discount = coupon.discountType === 'PERCENTAGE'
    ? amount * (coupon.discountValue / 100)
    : coupon.discountValue;
  if (coupon.discountType === 'PERCENTAGE' && coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
    discount = coupon.maxDiscountAmount;
  }
  discount = Math.min(discount, amount);
  return { discount: Math.round(discount * 100) / 100, couponCode: coupon.code };
}

// POST / — create appointment with Jitsi video link
r.post('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { doctorId, doctorName, scheduledAt, reason, notes, paymentId, couponCode } = q.body;

    // Try to find doctor in DB
    const doctor = doctorId
      ? await prisma.doctor.findUnique({ where: { id: doctorId } }).catch(() => null)
      : null;

    const resolvedDoctorName = doctor?.fullName || doctorName || 'Doctor';

    // --- Server-side fee calculation (NEVER trust client amounts) ---
    const serverOriginalFee = doctor ? (doctor.consultationFee || 0) : 0;

    // Calculate coupon discount server-side
    const couponResult = await calcCouponDiscount(couponCode, q.user!.id, serverOriginalFee, doctorId);
    const serverCouponDiscount = couponResult.discount;

    // Calculate platform fee from config
    const config = await getConfig();
    const serverPlatformFee = serverOriginalFee > 0
      ? Math.round((config.platformFeeFlat + (serverOriginalFee * config.platformFeePercent / 100)) * 100) / 100
      : 0;

    // Calculate amount paid: originalFee - couponDiscount + platformFee
    // Only trust this if there's a valid paymentId, otherwise use calculated value
    const calculatedAmount = Math.max(0, serverOriginalFee - serverCouponDiscount + serverPlatformFee);
    const serverAmountPaid = paymentId ? calculatedAmount : calculatedAmount;

    // Generate Jitsi room
    const jitsiRoomId = `VedaClue-${resolvedDoctorName.replace(/\s+/g, '-')}-${Date.now()}`;
    const videoLink = `https://meet.jit.si/${jitsiRoomId}`;

    const appt = await prisma.appointment.create({
      data: {
        userId: q.user!.id,
        doctorId: doctor ? doctorId : null,
        doctorName: resolvedDoctorName,
        scheduledAt: new Date(scheduledAt),
        amountPaid: serverAmountPaid,
        originalFee: serverOriginalFee,
        couponCode: couponResult.couponCode || null,
        couponDiscount: serverCouponDiscount,
        platformFee: serverPlatformFee,
        paymentId: paymentId || null,
        notes: [reason, notes].filter(Boolean).join(' | ') || null,
        meetingLink: videoLink,
      },
      include: { doctor: { select: { id: true, fullName: true, specialization: true, avatarUrl: true, consultationFee: true } } },
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

    successResponse(s, {
      ...appt,
      videoLink,
      jitsiRoomId,
      doctor: appt.doctor || { fullName: resolvedDoctorName, specialization: '' },
    }, 'Appointment created', 201);
  } catch (e) { n(e); }
});

// GET / — list user's OWN appointments
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data = await prisma.appointment.findMany({
      where: { userId: q.user!.id },
      include: { doctor: { select: { id: true, fullName: true, specialization: true, avatarUrl: true, consultationFee: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
    const result = data.map((a: any) => ({
      ...a,
      videoLink: a.meetingLink,
      doctor: a.doctor || { fullName: a.doctorName || 'Doctor', specialization: '' },
    }));
    successResponse(s, result);
  } catch (e) { n(e); }
});

// GET /:id — single appointment
r.get('/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: q.params.id },
      include: { doctor: { select: { id: true, fullName: true, specialization: true, avatarUrl: true, consultationFee: true } } },
    });
    if (!appt) { errorResponse(s, 'Appointment not found', 404); return; }
    // Ownership check: patient sees own, doctor sees own patients, admin sees all
    const isOwner = appt.userId === q.user!.id;
    const isAdmin = q.user!.role === 'ADMIN';
    const isAssignedDoctor = q.user!.role === 'DOCTOR' && appt.doctorId != null;
    let doctorAuthorized = false;
    if (isAssignedDoctor) {
      const doc = await prisma.doctor.findUnique({ where: { userId: q.user!.id }, select: { id: true } });
      doctorAuthorized = doc != null && doc.id === appt.doctorId;
    }
    if (!isOwner && !isAdmin && !doctorAuthorized) {
      errorResponse(s, 'Not authorized', 403); return;
    }
    successResponse(s, {
      ...appt,
      videoLink: appt.meetingLink,
      doctor: appt.doctor || { fullName: appt.doctorName || 'Doctor', specialization: '' },
    });
  } catch (e) { n(e); }
});

// PATCH /:id/cancel — cancel appointment (verify belongs to user)
r.patch('/:id/cancel', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    // Verify ownership
    const existing = await prisma.appointment.findUnique({ where: { id: q.params.id } });
    if (!existing) { errorResponse(s, 'Appointment not found', 404); return; }
    if (existing.userId !== q.user!.id) { errorResponse(s, 'Not your appointment', 403); return; }
    if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
      errorResponse(s, `Cannot cancel — appointment is already ${existing.status.toLowerCase()}`, 400); return;
    }

    const appt = await prisma.appointment.update({
      where: { id: q.params.id },
      data: { status: 'CANCELLED', cancellationReason: q.body.reason },
    });

    // Send cancellation email (fire-and-forget)
    try {
      const user = await prisma.user.findUnique({ where: { id: q.user!.id }, select: { fullName: true, email: true } });
      if (user?.email) {
        const dateStr = new Date(existing.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const timeStr = new Date(existing.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        sendCancellationEmail(user.email, {
          patientName: user.fullName || 'Patient',
          doctorName: existing.doctorName || 'Doctor',
          date: dateStr,
          time: timeStr,
          appointmentId: appt.id,
          reason: q.body.reason || undefined,
        }).catch(() => {});
      }
    } catch (_) {}

    successResponse(s, appt, 'Appointment cancelled');
  } catch (e) { n(e); }
});

// PATCH /:id/status — admin update status
r.patch('/:id/status', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { status } = q.body;
    if (!status || !['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'NO_SHOW', 'CANCELLED'].includes(status)) {
      errorResponse(s, 'Invalid status'); return;
    }
    const appt = await prisma.appointment.update({
      where: { id: q.params.id },
      data: {
        status,
        ...(status === 'REJECTED' && q.body.rejectionReason ? { rejectionReason: q.body.rejectionReason } : {})
      },
    });
    successResponse(s, appt);
  } catch (e) { n(e); }
});

export default r;
