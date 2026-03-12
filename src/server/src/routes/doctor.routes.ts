import { Router, Response, NextFunction, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

function mapDoctor(d: any) {
  return {
    id: d.id,
    name: d.fullName,
    specialization: d.specialization,
    experience: d.experienceYears || 0,
    fee: d.consultationFee || 0,
    qualification: Array.isArray(d.qualifications) ? d.qualifications.join(', ') : (d.qualifications || ''),
    about: d.bio || '',
    rating: d.rating || 5.0,
    reviews: d.totalReviews || 0,
    isPublished: d.isPublished ?? false,
    isVerified: d.isVerified ?? false,
    isAvailable: d.isAvailable ?? true,
    avatarUrl: d.avatarUrl || d.photoUrl || null,
    tags: d.tags || [],
    languages: d.languages || [],
    hospitalName: d.hospitalName || null,
    isChief: d.isChief ?? false,
    isPromoted: d.isPromoted ?? false,
    commissionRate: d.commissionRate ?? null,
  };
}

// GET / — public, only published doctors
r.get('/', async (q: Request, res: Response, n: NextFunction) => {
  try {
    const where: any = { isPublished: true };
    if (q.query.specialization) where.specialization = { contains: q.query.specialization as string, mode: 'insensitive' };
    if (q.query.search) where.OR = [
      { fullName: { contains: q.query.search as string, mode: 'insensitive' } },
      { specialization: { contains: q.query.search as string, mode: 'insensitive' } },
    ];
    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(q.query.limit) || 50,
      skip: Number(q.query.offset) || 0,
    });
    successResponse(res, doctors.map(mapDoctor));
  } catch (e) { n(e); }
});

// GET /all — admin only, all doctors including unpublished
r.get('/all', authenticate, requireAdmin, async (_req: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const doctors = await prisma.doctor.findMany({ orderBy: { createdAt: 'desc' } });
    successResponse(res, doctors.map(mapDoctor));
  } catch (e) { n(e); }
});

// GET /:id/slots — public, get doctor's available time slots
r.get('/:id/slots', async (q: Request, res: Response, n: NextFunction) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { id: q.params.id }, select: { id: true, isAvailable: true, isPublished: true } });
    if (!doctor || !doctor.isPublished) { errorResponse(res, 'Doctor not found', 404); return; }

    const slots = await prisma.doctorSlot.findMany({
      where: { doctorId: doctor.id, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    successResponse(res, { isAvailable: doctor.isAvailable, slots });
  } catch (e) { n(e); }
});

// GET /:id — public, single doctor
r.get('/:id', async (q: Request, res: Response, n: NextFunction) => {
  try {
    const d = await prisma.doctor.findUnique({ where: { id: q.params.id } });
    if (!d || !d.isPublished) { errorResponse(res, 'Doctor not found', 404); return; }
    successResponse(res, mapDoctor(d));
  } catch (e) { n(e); }
});

// POST / — admin create doctor
r.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      fullName, specialization, qualifications, experienceYears, hospitalName,
      consultationFee, bio, avatarUrl, photoUrl, languages, tags,
    } = req.body;
    const doctor = await prisma.doctor.create({
      data: {
        fullName: fullName || '',
        specialization: specialization || '',
        qualifications: Array.isArray(qualifications) ? qualifications : (qualifications || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        experienceYears: Number(experienceYears) || 0,
        hospitalName: hospitalName || null,
        consultationFee: Number(consultationFee) || 0,
        bio: bio || null,
        avatarUrl: avatarUrl || photoUrl || null,
        photoUrl: photoUrl || avatarUrl || null,
        languages: Array.isArray(languages) ? languages : [],
        tags: Array.isArray(tags) ? tags : (tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        isAvailable: true,
        isVerified: true,
      },
    });
    successResponse(res, doctor, 'Doctor created', 201);
  } catch (e) { next(e); }
});

// PUT /:id — admin update doctor
r.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data: any = {};
    const fields = ['fullName', 'specialization', 'hospitalName', 'bio', 'avatarUrl', 'photoUrl', 'introVideoUrl'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (req.body.experienceYears !== undefined) data.experienceYears = Number(req.body.experienceYears);
    if (req.body.consultationFee !== undefined) data.consultationFee = Number(req.body.consultationFee);
    if (req.body.commissionRate !== undefined) data.commissionRate = req.body.commissionRate === null || req.body.commissionRate === '' ? null : Number(req.body.commissionRate);
    if (req.body.isAvailable !== undefined) data.isAvailable = req.body.isAvailable;
    if (req.body.isVerified !== undefined) data.isVerified = req.body.isVerified;
    if (req.body.isPublished !== undefined) data.isPublished = req.body.isPublished;
    if (req.body.isPromoted !== undefined) data.isPromoted = req.body.isPromoted;
    if (req.body.isChief !== undefined) data.isChief = req.body.isChief;
    if (req.body.qualifications !== undefined) {
      data.qualifications = Array.isArray(req.body.qualifications) ? req.body.qualifications : (req.body.qualifications || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.languages !== undefined) data.languages = req.body.languages;
    if (req.body.tags !== undefined) {
      data.tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.clinicPhotos !== undefined) data.clinicPhotos = req.body.clinicPhotos;

    const doctor = await prisma.doctor.update({ where: { id }, data });
    successResponse(res, doctor);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Doctor not found', 404); return; }
    next(e);
  }
});

// DELETE /:id — admin delete doctor
r.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.doctor.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Doctor deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Doctor not found', 404); return; }
    next(e);
  }
});

export default r;
