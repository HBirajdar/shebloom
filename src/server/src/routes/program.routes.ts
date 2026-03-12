// ═══════════════════════════════════════════════════════
// Program Routes — Browse, Enroll, Track Progress
// ═══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// ─── Public: list published programs ────────────────
r.get('/', async (q: Request, s: Response, n: NextFunction) => {
  try {
    const where: any = { isPublished: true, status: 'PUBLISHED' };
    if (q.query.category) where.category = q.query.category;
    if (q.query.featured === 'true') where.isFeatured = true;

    const programs = await prisma.program.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { totalEnrolled: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { contents: true, enrollments: true } },
      },
    });

    successResponse(s, programs.map(p => ({
      ...p,
      contentCount: p._count.contents,
      enrolledCount: p._count.enrollments,
      _count: undefined,
    })));
  } catch (e) { n(e); }
});

// ─── Public: get program details with content outline ─
r.get('/:id', async (q: Request, s: Response, n: NextFunction) => {
  try {
    const program = await prisma.program.findUnique({
      where: { id: q.params.id },
      include: {
        contents: {
          orderBy: [{ weekNumber: 'asc' }, { sortOrder: 'asc' }],
          select: {
            id: true, weekNumber: true, dayNumber: true, sortOrder: true,
            title: true, description: true, contentType: true,
            duration: true, isFree: true, imageUrl: true,
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!program || (!program.isPublished && program.status !== 'PUBLISHED')) {
      errorResponse(s, 'Program not found', 404); return;
    }
    successResponse(s, { ...program, enrolledCount: program._count.enrollments, _count: undefined });
  } catch (e) { n(e); }
});

// ─── Authenticated: get my enrollments ──────────────
r.get('/me/enrolled', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const enrollments = await prisma.programEnrollment.findMany({
      where: { userId: q.user!.id },
      include: {
        program: {
          select: {
            id: true, title: true, subtitle: true, emoji: true, imageUrl: true,
            category: true, duration: true, durationDays: true, isFree: true, price: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    successResponse(s, enrollments);
  } catch (e) { n(e); }
});

// ─── Authenticated: get enrollment detail with full content ─
r.get('/me/enrolled/:programId', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const enrollment = await prisma.programEnrollment.findUnique({
      where: { userId_programId: { userId: q.user!.id, programId: q.params.programId } },
      include: {
        program: {
          include: {
            contents: {
              orderBy: [{ weekNumber: 'asc' }, { sortOrder: 'asc' }],
            },
          },
        },
      },
    });
    if (!enrollment) { errorResponse(s, 'Not enrolled in this program', 404); return; }
    successResponse(s, enrollment);
  } catch (e) { n(e); }
});

// ─── Authenticated: enroll in a free program ────────
r.post('/:id/enroll', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const program = await prisma.program.findUnique({ where: { id: q.params.id } });
    if (!program || !program.isPublished) { errorResponse(s, 'Program not found', 404); return; }

    // Check if already enrolled
    const existing = await prisma.programEnrollment.findUnique({
      where: { userId_programId: { userId: q.user!.id, programId: q.params.id } },
    });
    if (existing) {
      if (existing.status === 'CANCELLED' || existing.status === 'PAUSED') {
        // Re-activate
        const updated = await prisma.programEnrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', startDate: new Date(), completedAt: null },
        });
        successResponse(s, updated, 'Program re-enrolled!');
        return;
      }
      errorResponse(s, 'Already enrolled in this program', 400); return;
    }

    if (!program.isFree && program.price > 0) {
      errorResponse(s, 'This is a paid program. Use the payment endpoint.', 400); return;
    }

    const enrollment = await prisma.programEnrollment.create({
      data: {
        userId: q.user!.id,
        programId: q.params.id,
        isPaid: false,
        amountPaid: 0,
        progress: { completed: [], currentWeek: 1 },
      },
    });

    // Increment enrolled count
    await prisma.program.update({
      where: { id: q.params.id },
      data: { totalEnrolled: { increment: 1 } },
    }).catch(() => {});

    successResponse(s, enrollment, 'Enrolled successfully!');
  } catch (e) { n(e); }
});

// ─── Authenticated: enroll in paid program (after Razorpay payment) ─
r.post('/:id/enroll-paid', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, amountPaid, couponCode, couponDiscount } = q.body;
    const program = await prisma.program.findUnique({ where: { id: q.params.id } });
    if (!program || !program.isPublished) { errorResponse(s, 'Program not found', 404); return; }

    // Check if already enrolled
    const existing = await prisma.programEnrollment.findUnique({
      where: { userId_programId: { userId: q.user!.id, programId: q.params.id } },
    });
    if (existing && existing.status === 'ACTIVE') {
      errorResponse(s, 'Already enrolled', 400); return;
    }

    const data: any = {
      userId: q.user!.id,
      programId: q.params.id,
      isPaid: true,
      amountPaid: amountPaid || program.discountPrice || program.price,
      paymentId: razorpayPaymentId || null,
      razorpayOrderId: razorpayOrderId || null,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount || 0,
      progress: { completed: [], currentWeek: 1 },
    };

    let enrollment;
    if (existing) {
      enrollment = await prisma.programEnrollment.update({
        where: { id: existing.id },
        data: { ...data, status: 'ACTIVE', startDate: new Date() },
      });
    } else {
      enrollment = await prisma.programEnrollment.create({ data });
    }

    await prisma.program.update({
      where: { id: q.params.id },
      data: { totalEnrolled: { increment: 1 } },
    }).catch(() => {});

    successResponse(s, enrollment, 'Enrolled successfully!');
  } catch (e) { n(e); }
});

// ─── Authenticated: mark content as completed ───────
r.post('/me/progress', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { programId, contentId } = q.body;
    if (!programId || !contentId) { errorResponse(s, 'programId and contentId required', 400); return; }

    const enrollment = await prisma.programEnrollment.findUnique({
      where: { userId_programId: { userId: q.user!.id, programId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      errorResponse(s, 'Not enrolled or program paused', 400); return;
    }

    const progress = (enrollment.progress as any) || { completed: [], currentWeek: 1 };
    const completed: string[] = progress.completed || [];
    if (!completed.includes(contentId)) completed.push(contentId);

    // Get total content count to check if program is done
    const totalContents = await prisma.programContent.count({ where: { programId } });

    const updated = await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progress: { ...progress, completed },
        completedCount: completed.length,
        lastAccessedAt: new Date(),
        ...(completed.length >= totalContents ? { status: 'COMPLETED', completedAt: new Date() } : {}),
      },
    });

    successResponse(s, updated, completed.length >= totalContents ? 'Program completed! 🎉' : 'Progress saved');
  } catch (e) { n(e); }
});

// ─── Authenticated: leave / cancel program ──────────
r.post('/:id/leave', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const enrollment = await prisma.programEnrollment.findUnique({
      where: { userId_programId: { userId: q.user!.id, programId: q.params.id } },
    });
    if (!enrollment) { errorResponse(s, 'Not enrolled', 404); return; }

    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'CANCELLED' },
    });

    successResponse(s, null, 'Program cancelled');
  } catch (e) { n(e); }
});

export default r;
