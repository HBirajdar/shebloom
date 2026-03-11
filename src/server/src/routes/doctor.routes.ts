import { Router, Response, NextFunction, Request } from 'express';
import { DoctorService } from '../services/doctor.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';

const r = Router();
const s = new DoctorService();

// GET / — public search
r.get('/', async (q: Request, r: Response, n: NextFunction) => {
  try {
    r.json({ success: true, ...await s.search(q.query) });
  } catch (e) { n(e); }
});

// GET /:id — single doctor
r.get('/:id', async (q: Request, r: Response, n: NextFunction) => {
  try {
    const d = await s.getById(q.params.id);
    if (!d) r.status(404).json({ error: 'Not found' });
    else r.json({ success: true, data: d });
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
    res.status(201).json({ success: true, data: doctor });
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
    if (req.body.qualifications !== undefined) {
      data.qualifications = Array.isArray(req.body.qualifications) ? req.body.qualifications : (req.body.qualifications || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.languages !== undefined) data.languages = req.body.languages;
    if (req.body.tags !== undefined) {
      data.tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.clinicPhotos !== undefined) data.clinicPhotos = req.body.clinicPhotos;

    const doctor = await prisma.doctor.update({ where: { id }, data });
    res.json({ success: true, data: doctor });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    next(e);
  }
});

// DELETE /:id — admin delete doctor
r.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.doctor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    next(e);
  }
});

export default r;
