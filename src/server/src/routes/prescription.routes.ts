// prescription.routes.ts
import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireDoctor } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();
r.use(authenticate);

// POST / — doctor creates prescription for a completed appointment
r.post('/', requireDoctor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId, diagnosis, medicines, instructions, followUpDate } = req.body;
    if (!appointmentId || !diagnosis || !medicines) {
      errorResponse(res, 'appointmentId, diagnosis, and medicines are required', 400); return;
    }

    // Verify appointment exists and is COMPLETED or IN_PROGRESS
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) { errorResponse(res, 'Appointment not found', 404); return; }
    if (!['COMPLETED', 'IN_PROGRESS'].includes(appt.status)) {
      errorResponse(res, 'Can only prescribe for completed or in-progress appointments', 400); return;
    }
    if (!appt.doctorId) {
      errorResponse(res, 'Appointment must be linked to a registered doctor to issue a prescription', 400); return;
    }

    // Verify the logged-in doctor is the appointment's doctor (admin can bypass)
    if (req.user!.role !== 'ADMIN') {
      const doc = await prisma.doctor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
      if (!doc || doc.id !== appt.doctorId) {
        errorResponse(res, 'You can only prescribe for your own appointments', 403); return;
      }
    }

    // Check no prescription already exists
    const existing = await prisma.prescription.findUnique({ where: { appointmentId } });
    if (existing) { errorResponse(res, 'Prescription already exists for this appointment', 400); return; }

    const prescription = await prisma.prescription.create({
      data: {
        appointmentId,
        doctorId: appt.doctorId,
        userId: appt.userId,
        diagnosis,
        medicines: Array.isArray(medicines) ? medicines : [],
        instructions: instructions || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    successResponse(res, prescription, 'Prescription created', 201);
  } catch (e) { next(e); }
});

// GET /my — patient views their own prescriptions
r.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { userId: req.user!.id },
      include: {
        appointment: {
          select: {
            scheduledAt: true,
            doctorName: true,
            doctor: { select: { fullName: true, specialization: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, prescriptions);
  } catch (e) { next(e); }
});

// GET /appointment/:appointmentId — get prescription for a specific appointment
// MUST be before /:id to avoid "appointment" being matched as an id
r.get('/appointment/:appointmentId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await prisma.prescription.findUnique({
      where: { appointmentId: req.params.appointmentId },
      include: {
        appointment: {
          select: {
            scheduledAt: true,
            doctorName: true,
            doctor: { select: { fullName: true, specialization: true, avatarUrl: true } },
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
    if (!p) { errorResponse(res, 'No prescription for this appointment', 404); return; }
    if (p.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      errorResponse(res, 'Unauthorized', 403); return;
    }
    successResponse(res, p);
  } catch (e) { next(e); }
});

// GET /:id — get single prescription
r.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: {
        appointment: {
          select: {
            scheduledAt: true,
            doctorName: true,
            doctor: { select: { fullName: true, specialization: true } },
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
    if (!p) { errorResponse(res, 'Prescription not found', 404); return; }
    // Only owner or admin can view
    if (p.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      errorResponse(res, 'Unauthorized', 403); return;
    }
    successResponse(res, p);
  } catch (e) { next(e); }
});

export default r;
