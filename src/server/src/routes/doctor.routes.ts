import { Router, Response, NextFunction, Request } from 'express';
import { DoctorService } from '../services/doctor.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();
const s = new DoctorService();

// GET / — public, only published doctors
r.get('/', async (q: Request, res: Response, n: NextFunction) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, doctors);
  } catch (e) { n(e); }
});

// GET /all — auth required, all doctors including unpublished
r.get('/all', authenticate, async (_req: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const doctors = await prisma.doctor.findMany({ orderBy: { createdAt: 'desc' } });
    successResponse(res, doctors);
  } catch (e) { n(e); }
});

// GET /:id — public, single doctor
r.get('/:id', async (q: Request, res: Response, n: NextFunction) => {
  try {
    const d = await s.getById(q.params.id);
    if (!d) { errorResponse(res, 'Not found', 404); return; }
    successResponse(res, d);
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
