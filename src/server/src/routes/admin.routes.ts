// Admin CMS routes — Full Prisma-backed implementation
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendWelcomeEmail } from '../services/email.service';

const r = Router();

// ─── Multer upload config ────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','video/mp4','video/mov','video/avi','video/quicktime'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Helpers ─────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
}

function mapProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    discountPrice: p.discountPrice ?? undefined,
    description: p.description,
    ingredients: p.ingredients || [],
    benefits: p.benefits || [],
    howToUse: p.howToUse || '',
    size: p.size || '',
    emoji: p.emoji || '🌿',
    rating: p.rating || 5.0,
    reviews: p.reviews || 0,
    inStock: p.inStock ?? true,
    isPublished: p.isPublished ?? false,
    isFeatured: p.isFeatured ?? false,
    targetAudience: p.targetAudience || ['all'],
    tags: p.tags || [],
    preparationMethod: p.preparationMethod ?? undefined,
    doctorNote: p.doctorNote ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
    galleryImages: p.galleryImages || [],
    createdAt: p.createdAt ? p.createdAt.toISOString().split('T')[0] : '',
  };
}

function mapArticle(a: any) {
  const mins = a.readTimeMinutes || 5;
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    readTime: `${mins} min`,
    emoji: a.emoji || '📝',
    isPublished: a.status === 'PUBLISHED',
    isFeatured: a.isFeatured ?? false,
    targetAudience: a.targetAudience || ['all'],
    imageUrl: a.coverImageUrl ?? undefined,
    createdAt: a.createdAt ? a.createdAt.toISOString().split('T')[0] : '',
  };
}

function mapDoctor(d: any) {
  const quals = Array.isArray(d.qualifications) ? d.qualifications : [];
  const langs = Array.isArray(d.languages) ? d.languages : [];
  return {
    id: d.id,
    name: d.fullName,
    specialization: d.specialization,
    experience: d.experienceYears || 0,
    rating: d.rating || 5.0,
    reviews: d.totalReviews || 0,
    fee: d.consultationFee || 0,
    feeFreeForPoor: false,
    qualification: quals.join(', '),
    tags: d.tags || [],
    languages: langs,
    about: d.bio || '',
    isChief: d.isChief ?? false,
    isPublished: d.isPublished ?? false,
    isPromoted: d.isPromoted ?? false,
    avatarUrl: d.avatarUrl || d.photoUrl || undefined,
  };
}

// Require JWT authentication for all admin routes
r.use(authenticate);

// ─── File Upload ─────────────────────────────────────
r.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url, filename: req.file.filename, size: req.file.size } });
});

// ─── Dashboard (Prisma) ─────────────────────────────
r.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [products, articles, doctors] = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.article.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.doctor.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({
      success: true,
      data: {
        products: products.map(mapProduct),
        articles: articles.map(mapArticle),
        doctors: doctors.map(mapDoctor),
      },
    });
  } catch (e) { next(e); }
});

// ─── Analytics (Prisma aggregates) ───────────────────
r.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalCycles,
      totalAppointments,
      usersByRole,
      recentSignups,
      moodLogs,
      cyclesWithLength,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.cycle.count(),
      prisma.appointment.count(),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, fullName: true, email: true, createdAt: true, role: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.moodLog.groupBy({ by: ['mood'], _count: { id: true } }),
      prisma.cycle.findMany({
        where: { cycleLength: { not: null } },
        select: { cycleLength: true },
        take: 500,
      }),
    ]);

    const avgCycleLength = cyclesWithLength.length > 0
      ? Math.round(cyclesWithLength.reduce((s, c) => s + (c.cycleLength || 0), 0) / cyclesWithLength.length)
      : 28;

    const moodDistribution: Record<string, number> = {};
    const totalMoods = moodLogs.reduce((s, m) => s + m._count.id, 0);
    for (const m of moodLogs) {
      moodDistribution[m.mood] = totalMoods > 0 ? Math.round((m._count.id / totalMoods) * 100) : 0;
    }

    const roleMap: Record<string, number> = {};
    for (const ur of usersByRole) { roleMap[ur.role] = ur._count.id; }

    res.json({
      success: true,
      data: { totalUsers, activeUsers, totalCycles, avgCycleLength, totalAppointments, moodDistribution, usersByRole: roleMap, recentSignups },
    });
  } catch (e) { next(e); }
});

// ─── Users (Prisma) ─────────────────────────────────
r.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (role && ['USER', 'DOCTOR', 'ADMIN'].includes(role)) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, fullName: true, email: true, phone: true,
          avatarUrl: true, role: true, isActive: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

r.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;
    const data: any = {};
    if (role && ['USER', 'DOCTOR', 'ADMIN'].includes(role)) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'User not found' }); return; }
    next(e);
  }
});

r.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'User deactivated' });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'User not found' }); return; }
    next(e);
  }
});

// ─── Appointments (Prisma) ──────────────────────────
r.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || '';

    const where: any = {};
    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) where.status = status;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          doctor: { select: { id: true, fullName: true, specialization: true, avatarUrl: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({ success: true, data: { appointments, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

r.patch('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['PENDING','CONFIRMED','COMPLETED','CANCELLED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' }); return;
    }
    const appt = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        doctor: { select: { id: true, fullName: true } },
      },
    });
    res.json({ success: true, data: appt });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'Appointment not found' }); return; }
    next(e);
  }
});

// ─── Products (Prisma) ──────────────────────────────
r.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const product = await prisma.product.create({
      data: {
        name: b.name,
        category: b.category || 'skincare',
        price: Number(b.price) || 0,
        discountPrice: b.discountPrice ? Number(b.discountPrice) : null,
        description: b.description || '',
        ingredients: Array.isArray(b.ingredients) ? b.ingredients : [],
        benefits: Array.isArray(b.benefits) ? b.benefits : [],
        howToUse: b.howToUse || '',
        size: b.size || '',
        emoji: b.emoji || '🌿',
        targetAudience: Array.isArray(b.targetAudience) ? b.targetAudience : ['all'],
        tags: Array.isArray(b.tags) ? b.tags : [],
        imageUrl: b.imageUrl || null,
        galleryImages: Array.isArray(b.galleryImages) ? b.galleryImages : [],
        isPublished: false,
        isFeatured: false,
        inStock: true,
        rating: 5.0,
        reviews: 0,
      },
    });
    res.json({ success: true, data: mapProduct(product) });
  } catch (e) { next(e); }
});

r.post('/products/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isPublished: !existing.isPublished },
    });
    res.json({ success: true, data: mapProduct(product) });
  } catch (e) { next(e); }
});

r.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    next(e);
  }
});

// ─── Articles (Prisma) ──────────────────────────────
r.post('/articles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const readTimeMinutes = typeof b.readTime === 'string' ? parseInt(b.readTime) || 5 : Number(b.readTime) || 5;
    const article = await prisma.article.create({
      data: {
        title: b.title,
        slug: slugify(b.title || 'article'),
        content: b.content || '',
        category: b.category || 'wellness',
        emoji: b.emoji || '📝',
        targetAudience: Array.isArray(b.targetAudience) ? b.targetAudience : ['all'],
        tags: Array.isArray(b.tags) ? b.tags : [],
        coverImageUrl: b.imageUrl || null,
        readTimeMinutes,
        isFeatured: b.isFeatured ?? false,
        status: 'DRAFT',
      },
    });
    res.json({ success: true, data: mapArticle(article) });
  } catch (e) { next(e); }
});

r.post('/articles/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Article not found' }); return; }
    const newStatus = existing.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'PUBLISHED' ? new Date() : null,
      },
    });
    res.json({ success: true, data: mapArticle(article) });
  } catch (e) { next(e); }
});

r.delete('/articles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'Article not found' }); return; }
    next(e);
  }
});

// ─── Doctors (Prisma) ────────────────────────────────
r.post('/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const qualifications = typeof b.qualification === 'string'
      ? b.qualification.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(b.qualifications) ? b.qualifications : [];
    const langs = Array.isArray(b.languages) ? b.languages : [];
    const doctor = await prisma.doctor.create({
      data: {
        fullName: b.name,
        specialization: b.specialization || '',
        qualifications,
        experienceYears: Number(b.experience) || 0,
        consultationFee: Number(b.fee) || 0,
        bio: b.about || '',
        tags: Array.isArray(b.tags) ? b.tags : [],
        languages: langs,
        avatarUrl: b.avatarUrl || null,
        isPublished: false,
        isChief: false,
        isPromoted: false,
        rating: 5.0,
        totalReviews: 0,
        isAvailable: true,
        isVerified: false,
      },
    });
    res.json({ success: true, data: mapDoctor(doctor) });
  } catch (e) { next(e); }
});

r.post('/doctors/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: { isPublished: !existing.isPublished },
    });
    res.json({ success: true, data: mapDoctor(doctor) });
  } catch (e) { next(e); }
});

r.post('/doctors/:id/toggle-promote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: { isPromoted: !existing.isPromoted },
    });
    res.json({ success: true, data: mapDoctor(doctor) });
  } catch (e) { next(e); }
});

r.delete('/doctors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.doctor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    next(e);
  }
});

// ─── Stats ──────────────────────────────────────────
r.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, appointments] = await Promise.all([
      prisma.user.count(),
      prisma.appointment.count().catch(() => 0),
    ]);
    res.json({ success: true, data: { users, appointments } });
  } catch (e) { next(e); }
});

// ─── Test Email ─────────────────────────────────────
r.post('/test-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ success: false, error: 'Valid email address required' }); return;
  }
  await sendWelcomeEmail(email, 'VedaClue Admin');
  res.json({ success: true, message: 'Test email sent' });
});

export default r;
