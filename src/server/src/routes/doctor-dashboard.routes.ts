// ══════════════════════════════════════════════════════
// src/server/src/routes/doctor-dashboard.routes.ts
// All routes: authenticate + requireDoctor (DOCTOR or ADMIN)
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireDoctor } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';
import { sendPushNotification } from '../services/push.service';
import doshaService from '../services/dosha.service';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const r = Router();
r.use(authenticate, requireDoctor);

// Helper: get doctor profile from the logged-in user
// 1. Find by userId link
// 2. Fallback: match by fullName and auto-link
// 3. Auto-create: if user has DOCTOR role but no profile, create one
async function getDoctorProfile(userId: string) {
  let doctor = await prisma.doctor.findFirst({ where: { userId } });
  if (doctor) return doctor;

  // NOTE: Name-based auto-linking removed — it was an account takeover vector.
  // Admin must explicitly link doctor profiles via userId.

  // Auto-create a doctor profile for users with DOCTOR role who don't have one
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, role: true, avatarUrl: true } });
  if (user && user.role === 'DOCTOR') {
    doctor = await prisma.doctor.create({
      data: {
        userId,
        fullName: user.fullName || 'Doctor',
        specialization: 'General',
        qualifications: [],
        experienceYears: 0,
        consultationFee: 0,
        avatarUrl: user.avatarUrl || null,
        status: 'active',
      },
    });
    return doctor;
  }

  return null;
}

// ─── GET /doctor/dashboard ───────────────────────────
r.get('/dashboard', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, pendingCount, totalPatients, reviews, recentAppointments] = await Promise.all([
      prisma.appointment.count({
        where: { doctorId: doctor.id, scheduledAt: { gte: today, lt: tomorrow } },
      }),
      prisma.appointment.count({
        where: { doctorId: doctor.id, status: 'PENDING' },
      }),
      prisma.appointment.count({
        where: { doctorId: doctor.id, status: { in: ['COMPLETED'] } },
      }),
      prisma.doctorReview.findMany({
        where: { doctorId: doctor.id },
        select: { rating: true },
      }),
      prisma.appointment.findMany({
        where: { doctorId: doctor.id, scheduledAt: { gte: today }, status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } },
        include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
    ]);

    const averageRating = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    // Map user names for frontend compatibility
    const mappedRecent = recentAppointments.map((a: any) => ({
      ...a,
      user: a.user ? { id: a.user.id, name: a.user.fullName, email: a.user.email, phone: a.user.phone } : null,
    }));

    successResponse(s, { todayAppointments, pendingCount, totalPatients, averageRating, totalReviews: reviews.length, recentAppointments: mappedRecent });
  } catch (e) { n(e); }
});

// ─── GET /doctor/appointments ─────────────────────────
r.get('/appointments', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    // Mark past unattended appointments as NO_SHOW (not COMPLETED — completion requires explicit action)
    const now = new Date();
    await prisma.appointment.updateMany({
      where: {
        doctorId: doctor.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: now },
      },
      data: { status: 'NO_SHOW' },
    });

    const { status, date } = q.query as any;
    const where: any = { doctorId: doctor.id };
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      where.scheduledAt = { gte: d, lt: nextDay };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Map fullName to name for frontend compatibility
    const mapped = appointments.map((a: any) => ({
      ...a,
      user: a.user ? { id: a.user.id, name: a.user.fullName, email: a.user.email, phone: a.user.phone } : null,
    }));

    successResponse(s, mapped);
  } catch (e) { n(e); }
});

// ─── PATCH /doctor/appointments/:id/accept ───────────
r.patch('/appointments/:id/accept', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const appt = await prisma.appointment.findUnique({ where: { id: q.params.id } });
    if (!appt) { errorResponse(s, 'Appointment not found', 404); return; }
    if (appt.doctorId !== doctor.id) { errorResponse(s, 'Not authorized', 403); return; }
    if (appt.status !== 'PENDING') { errorResponse(s, 'Appointment is not pending', 400); return; }

    const updated = await prisma.appointment.update({
      where: { id: q.params.id },
      data: { status: 'CONFIRMED' },
      include: { user: { select: { email: true, fullName: true } } },
    });

    // Push notification to patient (best-effort)
    sendPushNotification(appt.userId, 'Appointment Confirmed', `Your appointment with Dr. ${doctor.fullName} has been confirmed.`, 'appointment', { url: '/appointments' }).catch(() => {});

    successResponse(s, updated, 'Appointment confirmed');
  } catch (e) { n(e); }
});

// ─── PATCH /doctor/appointments/:id/reject ───────────
r.patch('/appointments/:id/reject', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const appt = await prisma.appointment.findUnique({ where: { id: q.params.id } });
    if (!appt) { errorResponse(s, 'Appointment not found', 404); return; }
    if (appt.doctorId !== doctor.id) { errorResponse(s, 'Not authorized', 403); return; }
    if (!['PENDING', 'CONFIRMED'].includes(appt.status)) { errorResponse(s, 'Cannot reject this appointment', 400); return; }

    const { reason } = q.body;
    const updated = await prisma.appointment.update({
      where: { id: q.params.id },
      data: { status: 'REJECTED', rejectionReason: reason || 'No reason given' },
      include: { user: { select: { email: true, fullName: true } } },
    });

    // Auto-refund if the appointment was paid
    if ((appt as any).paymentId && (appt as any).amountPaid > 0) {
      try {
        await razorpay.payments.refund((appt as any).paymentId, {
          amount: Math.round((appt as any).amountPaid * 100),
          notes: { reason: 'Doctor rejected appointment', appointmentId: appt.id },
        });
        await prisma.appointment.update({ where: { id: appt.id }, data: { refundStatus: 'INITIATED' } as any });
        console.log(`[REFUND] Initiated refund for appointment ${appt.id}, paymentId: ${(appt as any).paymentId}`);
      } catch (refundErr: any) {
        console.error(`[CRITICAL] Refund failed for appointment ${appt.id}:`, refundErr.message);
      }
    }

    // Push notification to patient (best-effort)
    sendPushNotification(appt.userId, 'Appointment Declined', `Your appointment with Dr. ${doctor.fullName} could not be confirmed. ${reason ? 'Reason: ' + reason : 'Please book another slot.'}`, 'appointment', { url: '/appointments' }).catch(() => {});

    successResponse(s, updated, 'Appointment rejected');
  } catch (e) { n(e); }
});

// ─── PATCH /doctor/appointments/:id/complete ─────────
r.patch('/appointments/:id/complete', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const appt = await prisma.appointment.findUnique({ where: { id: q.params.id } });
    if (!appt) { errorResponse(s, 'Appointment not found', 404); return; }
    if (appt.doctorId !== doctor.id) { errorResponse(s, 'Not authorized', 403); return; }
    if (!['CONFIRMED', 'IN_PROGRESS'].includes(appt.status)) { errorResponse(s, 'Cannot complete this appointment', 400); return; }

    const updated = await prisma.appointment.update({
      where: { id: q.params.id },
      data: { status: 'COMPLETED' },
    });

    successResponse(s, updated, 'Appointment completed');
  } catch (e) { n(e); }
});

// ─── GET /doctor/profile ──────────────────────────────
r.get('/profile', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const docBase = await getDoctorProfile(q.user!.id);
    if (!docBase) { errorResponse(s, 'Doctor profile not found', 404); return; }
    // Re-fetch with reviews included
    const doctor = await prisma.doctor.findUnique({
      where: { id: docBase.id },
      include: { reviews: { select: { rating: true, comment: true, createdAt: true, user: { select: { fullName: true } } } } },
    });
    successResponse(s, doctor);
  } catch (e) { n(e); }
});

// ─── PATCH /doctor/profile ────────────────────────────
r.patch('/profile', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await prisma.doctor.findFirst({ where: { userId: q.user!.id } });
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    // Doctors can update their own profile fields but NOT admin-controlled fields
    const allowed = ['fullName', 'specialization', 'bio', 'avatarUrl', 'hospitalName', 'location'];
    const data: any = {};
    for (const key of allowed) {
      if (q.body[key] !== undefined) data[key] = q.body[key];
    }

    // Numeric fields — coerce to correct types for Prisma
    if (q.body.experienceYears !== undefined) data.experienceYears = parseInt(String(q.body.experienceYears), 10) || 0;
    if (q.body.experience !== undefined) data.experienceYears = parseInt(String(q.body.experience), 10) || 0;
    if (q.body.consultationFee !== undefined) data.consultationFee = parseFloat(String(q.body.consultationFee)) || 0;
    if (q.body.fee !== undefined) data.consultationFee = parseFloat(String(q.body.fee)) || 0;

    // Languages — ensure valid enum array
    if (q.body.languages !== undefined) {
      const validLangs = ['ENGLISH', 'HINDI', 'TAMIL', 'KANNADA', 'TELUGU', 'MARATHI', 'BENGALI', 'GUJARATI'];
      const langs = Array.isArray(q.body.languages) ? q.body.languages : [];
      data.languages = langs.filter((l: string) => validLangs.includes(l));
    }

    // Qualifications — accept comma-separated string or array
    if (q.body.qualification !== undefined) {
      data.qualifications = typeof q.body.qualification === 'string'
        ? q.body.qualification.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (q.body.about !== undefined) data.bio = q.body.about;

    const updated = await prisma.doctor.update({ where: { id: doctor.id }, data });
    successResponse(s, updated, 'Profile updated');
  } catch (e) { n(e); }
});

// ─── PATCH /doctor/availability — toggle isAvailable ──
r.patch('/availability', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const isAvailable = typeof q.body.isAvailable === 'boolean' ? q.body.isAvailable : !doctor.isAvailable;
    const updated = await prisma.doctor.update({ where: { id: doctor.id }, data: { isAvailable } });
    successResponse(s, { isAvailable: updated.isAvailable }, `You are now ${updated.isAvailable ? 'available' : 'unavailable'} for bookings`);
  } catch (e) { n(e); }
});

// ─── GET /doctor/slots — list time slots ─────────────
// NOTE: startTime/endTime strings are assumed to be in IST (Asia/Kolkata).
// For future multi-timezone support, store a timezone field per slot and
// convert when presenting to users in different timezones.
r.get('/slots', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const slots = await prisma.doctorSlot.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    successResponse(s, slots);
  } catch (e) { n(e); }
});

// ─── POST /doctor/slots — create a time slot ─────────
// NOTE: startTime/endTime are stored as plain strings (e.g. "09:00", "17:00")
// and assumed to be in IST (Asia/Kolkata) since this is an India-focused app.
r.post('/slots', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const { dayOfWeek, startTime, endTime } = q.body;
    if (dayOfWeek === undefined || !startTime || !endTime) {
      errorResponse(s, 'dayOfWeek, startTime, and endTime are required', 400); return;
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) { errorResponse(s, 'dayOfWeek must be 0-6', 400); return; }
    if (startTime >= endTime) { errorResponse(s, 'startTime must be before endTime', 400); return; }

    // Check for overlap on same day
    const existing = await prisma.doctorSlot.findMany({
      where: { doctorId: doctor.id, dayOfWeek: Number(dayOfWeek), isActive: true },
    });
    const hasOverlap = existing.some(s => startTime < s.endTime && endTime > s.startTime);
    if (hasOverlap) { errorResponse(s, 'This slot overlaps with an existing slot', 400); return; }

    const slot = await prisma.doctorSlot.create({
      data: { doctorId: doctor.id, dayOfWeek: Number(dayOfWeek), startTime, endTime, isActive: true },
    });
    successResponse(s, slot, 'Slot created', 201);
  } catch (e) { n(e); }
});

// ─── PUT /doctor/slots/:id — update a time slot ──────
r.put('/slots/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const slot = await prisma.doctorSlot.findUnique({ where: { id: q.params.id } });
    if (!slot || slot.doctorId !== doctor.id) { errorResponse(s, 'Slot not found', 404); return; }

    const data: any = {};
    if (q.body.dayOfWeek !== undefined) data.dayOfWeek = Number(q.body.dayOfWeek);
    if (q.body.startTime !== undefined) data.startTime = q.body.startTime;
    if (q.body.endTime !== undefined) data.endTime = q.body.endTime;
    if (q.body.isActive !== undefined) data.isActive = q.body.isActive;

    const updated = await prisma.doctorSlot.update({ where: { id: q.params.id }, data });
    successResponse(s, updated, 'Slot updated');
  } catch (e) { n(e); }
});

// ─── DELETE /doctor/slots/:id — remove a time slot ───
r.delete('/slots/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const slot = await prisma.doctorSlot.findUnique({ where: { id: q.params.id } });
    if (!slot || slot.doctorId !== doctor.id) { errorResponse(s, 'Slot not found', 404); return; }

    await prisma.doctorSlot.delete({ where: { id: q.params.id } });
    successResponse(s, null, 'Slot deleted');
  } catch (e) { n(e); }
});

// ─── GET /doctor/prescriptions ────────────────────────
r.get('/prescriptions', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctor.id },
      include: {
        appointment: {
          select: { scheduledAt: true, user: { select: { fullName: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map for frontend compatibility
    const mapped = prescriptions.map((rx: any) => ({
      ...rx,
      appointment: rx.appointment ? {
        ...rx.appointment,
        user: rx.appointment.user ? { name: rx.appointment.user.fullName, email: rx.appointment.user.email } : null,
      } : null,
    }));

    successResponse(s, mapped);
  } catch (e) { n(e); }
});

// ─── GET /doctor/reviews ──────────────────────────────
r.get('/reviews', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const reviews = await prisma.doctorReview.findMany({
      where: { doctorId: doctor.id },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Map for frontend compatibility
    const mapped = reviews.map((rev: any) => ({
      ...rev,
      user: rev.user ? { name: rev.user.fullName } : null,
    }));

    successResponse(s, mapped);
  } catch (e) { n(e); }
});

// ─── GET /doctor/articles ─────────────────────────────
r.get('/articles', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const articles = await prisma.article.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(s, articles);
  } catch (e) { n(e); }
});

// ─── POST /doctor/articles — create article (status=REVIEW for admin approval) ──
r.post('/articles', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const { title, content, category, tags, excerpt, emoji, coverImageUrl, readTimeMinutes,
      references, sources, disclaimer, evidenceLevel } = q.body;
    if (!title || !content || !category) {
      errorResponse(s, 'Title, content and category are required', 400); return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    // Build author qualification from doctor profile
    const authorQualification = (doctor.qualifications || []).join(', ') || null;

    const article = await prisma.article.create({
      data: {
        doctorId: doctor.id,
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        category,
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        emoji: emoji || '📝',
        coverImageUrl: coverImageUrl || null,
        readTimeMinutes: readTimeMinutes || Math.ceil(content.split(/\s+/).length / 200) || 5,
        authorName: doctor.fullName,
        authorQualification,
        references: Array.isArray(references) ? references : (references ? references.split('\n').map((r: string) => r.trim()).filter(Boolean) : []),
        sources: Array.isArray(sources) ? sources : (sources ? sources.split('\n').map((s: string) => s.trim()).filter(Boolean) : []),
        disclaimer: disclaimer || null,
        evidenceLevel: evidenceLevel || null,
        status: 'REVIEW',
      },
    });
    successResponse(s, article, 'Article submitted for review', 201);
  } catch (e) { n(e); }
});

// ─── PUT /doctor/articles/:id — edit own article ──
r.put('/articles/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const existing = await prisma.article.findFirst({ where: { id: q.params.id, doctorId: doctor.id } });
    if (!existing) { errorResponse(s, 'Article not found', 404); return; }

    const { title, content, category, tags, excerpt, emoji, coverImageUrl, readTimeMinutes,
      references, sources, disclaimer, evidenceLevel } = q.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) {
      data.content = content;
      data.readTimeMinutes = readTimeMinutes || Math.ceil(content.split(/\s+/).length / 200) || 5;
    }
    if (category !== undefined) data.category = category;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (emoji !== undefined) data.emoji = emoji;
    if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl;
    if (references !== undefined) data.references = Array.isArray(references) ? references : references.split('\n').map((r: string) => r.trim()).filter(Boolean);
    if (sources !== undefined) data.sources = Array.isArray(sources) ? sources : sources.split('\n').map((s: string) => s.trim()).filter(Boolean);
    if (disclaimer !== undefined) data.disclaimer = disclaimer || null;
    if (evidenceLevel !== undefined) data.evidenceLevel = evidenceLevel || null;
    // Update author qualification from current doctor profile
    data.authorQualification = (doctor.qualifications || []).join(', ') || null;
    // Re-submit for review on edit
    data.status = 'REVIEW';
    data.approvedBy = null;
    data.approvedAt = null;
    data.publishedAt = null;

    const article = await prisma.article.update({ where: { id: q.params.id }, data });
    successResponse(s, article, 'Article updated and re-submitted for review');
  } catch (e) { n(e); }
});

// ─── DELETE /doctor/articles/:id — request deletion (sets ARCHIVED, admin must approve actual delete) ──
r.delete('/articles/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    const existing = await prisma.article.findFirst({ where: { id: q.params.id, doctorId: doctor.id } });
    if (!existing) { errorResponse(s, 'Article not found', 404); return; }

    await prisma.article.update({ where: { id: q.params.id }, data: { status: 'ARCHIVED' } });
    successResponse(s, null, 'Delete request sent to admin for approval');
  } catch (e) { n(e); }
});

// ══════════════════════════════════════════════════════════════════
// PATIENT DOSHA / AYURVEDA — Doctor can view & update patient dosha
// ══════════════════════════════════════════════════════════════════

// ─── GET /doctor/patients/:userId/dosha — Patient dosha profile ──
r.get('/patients/:userId/dosha', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    // Verify doctor has appointment with this patient
    const hasAppointment = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id, userId: q.params.userId },
    });
    if (!hasAppointment) { errorResponse(s, 'No appointment history with this patient', 403); return; }

    const profile = await doshaService.getDoshaProfile(q.params.userId);
    const history = await doshaService.getAssessmentHistory(q.params.userId);
    const patient = await prisma.user.findUnique({
      where: { id: q.params.userId },
      select: { id: true, fullName: true, email: true, phone: true, dateOfBirth: true },
    });

    successResponse(s, { patient, doshaProfile: profile, assessmentHistory: history });
  } catch (e) { n(e); }
});

// ─── POST /doctor/patients/:userId/dosha/clinical — Doctor clinical assessment ──
r.post('/patients/:userId/dosha/clinical', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { primaryDosha, secondaryDosha, vataScore, pittaScore, kaphaScore, notes } = q.body;
    if (!primaryDosha || vataScore == null || pittaScore == null || kaphaScore == null) {
      errorResponse(s, 'primaryDosha, vataScore, pittaScore, kaphaScore are required', 400); return;
    }

    const result = await doshaService.doctorAssessment(q.user!.id, q.params.userId, {
      primaryDosha, secondaryDosha, vataScore, pittaScore, kaphaScore, notes,
    });
    successResponse(s, result, 'Clinical dosha assessment recorded');
  } catch (e: any) {
    if (e.message.includes('No appointment')) { errorResponse(s, e.message, 403); return; }
    if (e.message.includes('Doctor profile')) { errorResponse(s, e.message, 404); return; }
    n(e);
  }
});

// ─── GET /doctor/patients/dosha-stats — Dosha distribution across doctor's patients ──
r.get('/patients-dosha-stats', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    // Get unique patient IDs from appointments
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      select: { userId: true },
      distinct: ['userId'],
    });
    const patientIds = appointments.map(a => a.userId);

    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: patientIds } },
      select: { dosha: true, doshaVerified: true } as any,
    });

    const distribution: Record<string, number> = {};
    let verified = 0;
    for (const p of profiles) {
      const d = (p as any).dosha || 'Unknown';
      distribution[d] = (distribution[d] || 0) + 1;
      if ((p as any).doshaVerified) verified++;
    }

    successResponse(s, {
      totalPatients: patientIds.length,
      assessedPatients: profiles.filter((p: any) => p.dosha).length,
      verifiedPatients: verified,
      distribution,
    });
  } catch (e) { n(e); }
});

// ─── GET /doctor/earnings — Doctor's own earnings & payout history ──
r.get('/earnings', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const doctor = await getDoctorProfile(q.user!.id);
    if (!doctor) { errorResponse(s, 'Doctor profile not found', 404); return; }

    // Get completed appointments with earnings
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id, status: 'COMPLETED' },
      select: { id: true, amountPaid: true, scheduledAt: true, doctorName: true, user: { select: { fullName: true } } },
      orderBy: { scheduledAt: 'desc' },
    });

    // Get payouts
    const payouts = await prisma.doctorPayout.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarned = appointments.reduce((sum, a) => sum + (a.amountPaid || 0), 0);
    const totalPaidOut = payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.netPayout, 0);
    const totalPending = payouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING').reduce((sum, p) => sum + p.netPayout, 0);
    const totalPayoutGross = payouts.reduce((sum, p) => sum + p.totalEarnings, 0);
    const unsettled = Math.max(0, totalEarned - totalPayoutGross);

    successResponse(s, {
      totalEarned,
      totalPaidOut,
      totalPending,
      unsettled,
      totalAppointments: appointments.length,
      recentAppointments: appointments.slice(0, 20),
      payouts,
    });
  } catch (e) { n(e); }
});

export default r;
