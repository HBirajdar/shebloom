// Admin CMS routes — Full rewrite with Prisma endpoints
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
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
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mov', 'video/avi', 'video/quicktime',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Only images (jpeg, jpg, png, gif, webp) and videos (mp4, mov, avi) are supported.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── In-memory store (products/articles/doctors CMS) ───
interface AdminProduct {
  id: string; name: string; category: string; price: number; discountPrice?: number;
  description: string; ingredients: string[]; benefits: string[]; howToUse: string;
  size: string; emoji: string; rating: number; reviews: number; inStock: boolean;
  isPublished: boolean; isFeatured: boolean; targetAudience: string[]; tags: string[];
  preparationMethod?: string; doctorNote?: string; imageUrl?: string; createdAt: string;
}
interface AdminArticle {
  id: string; title: string; content: string; category: string; readTime: string;
  emoji: string; isPublished: boolean; isFeatured: boolean; targetAudience: string[];
  imageUrl?: string; createdAt: string;
}
interface AdminDoctor {
  id: string; name: string; specialization: string; experience: number; rating: number;
  reviews: number; fee: number; feeFreeForPoor: boolean; qualification: string;
  tags: string[]; languages: string[]; about: string; isChief: boolean; isPublished: boolean;
  isPromoted?: boolean; avatarUrl?: string;
}

const store: { products: AdminProduct[]; articles: AdminArticle[]; doctors: AdminDoctor[] } = {
  products: [],
  articles: [],
  doctors: [],
};

// Require JWT authentication for all admin routes
r.use(authenticate);

// ─── File Upload ─────────────────────────────────────
r.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url, filename: req.file.filename, size: req.file.size } });
});

// ─── Dashboard (in-memory store) ─────────────────────
r.get('/dashboard', (_req: Request, res: Response) => {
  res.json({ success: true, data: store });
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
      ? Math.round(cyclesWithLength.reduce((sum, c) => sum + (c.cycleLength || 0), 0) / cyclesWithLength.length)
      : 28;

    const moodDistribution: Record<string, number> = {};
    const totalMoods = moodLogs.reduce((s, m) => s + m._count.id, 0);
    for (const m of moodLogs) {
      moodDistribution[m.mood] = totalMoods > 0 ? Math.round((m._count.id / totalMoods) * 100) : 0;
    }

    const roleMap: Record<string, number> = {};
    for (const r of usersByRole) {
      roleMap[r.role] = r._count.id;
    }

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalCycles,
        avgCycleLength,
        totalAppointments,
        moodDistribution,
        usersByRole: roleMap,
        recentSignups,
      },
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
    if (role && ['USER', 'DOCTOR', 'ADMIN'].includes(role)) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, fullName: true, email: true, phone: true, avatarUrl: true,
          role: true, isActive: true, createdAt: true, lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) { next(e); }
});

r.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;
    const updateData: any = {};
    if (role && ['USER', 'DOCTOR', 'ADMIN'].includes(role)) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, fullName: true, email: true, phone: true, avatarUrl: true,
        role: true, isActive: true, createdAt: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (e: any) {
    if (e.code === 'P2025') {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    next(e);
  }
});

r.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'User deactivated' });
  } catch (e: any) {
    if (e.code === 'P2025') {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
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
    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

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

    res.json({
      success: true,
      data: {
        appointments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) { next(e); }
});

r.patch('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        doctor: { select: { id: true, fullName: true } },
      },
    });
    res.json({ success: true, data: appointment });
  } catch (e: any) {
    if (e.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Appointment not found' });
      return;
    }
    next(e);
  }
});

// ─── Products (in-memory) ───────────────────────────
r.post('/products', (req: Request, res: Response) => {
  const product: AdminProduct = {
    ...req.body,
    id: 'p_' + Date.now(),
    isPublished: false,
    isFeatured: false,
    rating: 5.0,
    reviews: 0,
    inStock: true,
    createdAt: new Date().toISOString().split('T')[0],
  };
  store.products.unshift(product);
  res.json({ success: true, data: product });
});

r.post('/products/:id/toggle-publish', (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = store.products.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    p.isPublished = !p.isPublished;
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
});

r.delete('/products/:id', (req: Request, res: Response) => {
  store.products = store.products.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── Articles (in-memory) ───────────────────────────
r.post('/articles', (req: Request, res: Response) => {
  const article: AdminArticle = {
    ...req.body,
    id: 'a_' + Date.now(),
    isPublished: false,
    isFeatured: false,
    createdAt: new Date().toISOString().split('T')[0],
  };
  store.articles.unshift(article);
  res.json({ success: true, data: article });
});

r.post('/articles/:id/toggle-publish', (req: Request, res: Response, next: NextFunction) => {
  try {
    const a = store.articles.find(x => x.id === req.params.id);
    if (!a) { res.status(404).json({ success: false, error: 'Article not found' }); return; }
    a.isPublished = !a.isPublished;
    res.json({ success: true, data: a });
  } catch (e) { next(e); }
});

r.delete('/articles/:id', (req: Request, res: Response) => {
  store.articles = store.articles.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── Doctors (in-memory) ────────────────────────────
r.post('/doctors', (req: Request, res: Response) => {
  const doctor: AdminDoctor = {
    ...req.body,
    id: 'd_' + Date.now(),
    isPublished: false,
    isChief: false,
    rating: 5.0,
    reviews: 0,
    feeFreeForPoor: false,
  };
  store.doctors.unshift(doctor);
  res.json({ success: true, data: doctor });
});

r.post('/doctors/:id/toggle-publish', (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = store.doctors.find(x => x.id === req.params.id);
    if (!d) { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    d.isPublished = !d.isPublished;
    res.json({ success: true, data: d });
  } catch (e) { next(e); }
});

r.post('/doctors/:id/toggle-promote', (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = store.doctors.find(x => x.id === req.params.id);
    if (!d) { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    d.isPromoted = !d.isPromoted;
    res.json({ success: true, data: d });
  } catch (e) { next(e); }
});

r.delete('/doctors/:id', (req: Request, res: Response) => {
  store.doctors = store.doctors.filter(x => x.id !== req.params.id);
  res.json({ success: true });
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
    res.status(400).json({ success: false, error: 'Valid email address required' });
    return;
  }
  await sendWelcomeEmail(email, 'VedaClue Admin');
  res.json({ success: true, message: 'Test email sent' });
});

export default r;
