// ══════════════════════════════════════════════════════
// src/server/src/routes/doctor-dashboard.routes.ts
// All routes: authenticate + requireDoctor (DOCTOR or ADMIN)
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireDoctor } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();
r.use(authenticate, requireDoctor);

// Helper: get doctor profile from the logged-in user
// 1. Find by userId link
// 2. Fallback: match by fullName and auto-link
// 3. Auto-create: if user has DOCTOR role but no profile, create one
async function getDoctorProfile(userId: string) {
  let doctor = await prisma.doctor.findFirst({ where: { userId } });
  if (doctor) return doctor;

  // Try to find unlinked doctor by matching user's name
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, role: true, avatarUrl: true } });
  if (user?.fullName) {
    doctor = await prisma.doctor.findFirst({ where: { fullName: user.fullName, userId: null } });
    if (doctor) {
      doctor = await prisma.doctor.update({ where: { id: doctor.id }, data: { userId } });
      return doctor;
    }
  }

  // Auto-create a doctor profile for users with DOCTOR role who don't have one
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
    const allowed = ['fullName', 'specialization', 'experienceYears', 'consultationFee', 'bio', 'languages', 'avatarUrl', 'hospitalName', 'location'];
    const data: any = {};
    for (const key of allowed) {
      if (q.body[key] !== undefined) data[key] = q.body[key];
    }
    // Also accept frontend-friendly field names
    if (q.body.experience !== undefined) data.experienceYears = Number(q.body.experience);
    if (q.body.fee !== undefined) data.consultationFee = Number(q.body.fee);
    if (q.body.qualification !== undefined) {
      data.qualifications = typeof q.body.qualification === 'string'
        ? q.body.qualification.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (q.body.about !== undefined) data.bio = q.body.about;

    const updated = await prisma.doctor.update({ where: { id: doctor.id }, data });
    successResponse(s, updated, 'Profile updated');
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

    const { title, content, category, tags, excerpt, emoji, coverImageUrl, readTimeMinutes } = q.body;
    if (!title || !content || !category) {
      errorResponse(s, 'Title, content and category are required', 400); return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

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

    const { title, content, category, tags, excerpt, emoji, coverImageUrl, readTimeMinutes } = q.body;
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

export default r;
