// Admin CMS routes — Full Prisma-backed implementation
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendWelcomeEmail } from '../services/email.service';
import doshaService from '../services/dosha.service';
import bcrypt from 'bcryptjs';

const r = Router();
r.use(authenticate, requireAdmin);

// ─── Admin PIN verification (server-side) ────────────
r.post('/verify-pin', async (req: AuthRequest, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      return errorResponse(res, 'PIN is required', 400);
    }
    const pinHash = process.env.ADMIN_PIN_HASH;
    if (!pinHash) {
      console.error('ADMIN_PIN_HASH environment variable is not set');
      return errorResponse(res, 'Server configuration error', 500);
    }
    const isValid = await bcrypt.compare(pin, pinHash);
    if (!isValid) {
      return errorResponse(res, 'Invalid admin PIN', 401);
    }
    return successResponse(res, { verified: true }, 'Admin PIN verified');
  } catch (err: any) {
    console.error('Admin PIN verification error:', err.message);
    return errorResponse(res, 'Verification failed', 500);
  }
});

// ─── Multer upload config ────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, Date.now() + '-' + path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','video/mp4','video/mov','video/avi','video/quicktime'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Helpers ─────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
}

function mapProduct(p: any) {
  return {
    id: p.id, name: p.name, category: p.category,
    price: p.price, discountPrice: p.discountPrice ?? undefined,
    description: p.description, ingredients: p.ingredients || [],
    benefits: p.benefits || [], howToUse: p.howToUse || '',
    size: p.size || '', emoji: p.emoji || '🌿',
    rating: p.rating || 5.0, reviews: p.reviews || 0,
    inStock: p.inStock ?? true, isPublished: p.isPublished ?? false,
    isFeatured: p.isFeatured ?? false,
    targetAudience: p.targetAudience || ['all'],
    tags: p.tags || [], imageUrl: p.imageUrl ?? undefined,
    galleryImages: p.galleryImages || [],
    status: p.status || 'draft',
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    approvedBy: p.approvedBy || null,
    approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
    stock: p.stock || 0,
    unit: p.unit || 'piece',
    ownerEmail: p.ownerEmail || null,
    ownerPhone: p.ownerPhone || null,
    createdAt: p.createdAt ? p.createdAt.toISOString().split('T')[0] : '',
  };
}

function mapArticle(a: any) {
  return {
    id: a.id, title: a.title, content: a.content, category: a.category,
    excerpt: a.excerpt || '',
    readTime: `${a.readTimeMinutes || 5} min`,
    readTimeMinutes: a.readTimeMinutes || 5,
    emoji: a.emoji || '📝',
    isPublished: a.status === 'PUBLISHED',
    isFeatured: a.isFeatured ?? false,
    targetAudience: a.targetAudience || ['all'],
    tags: a.tags || [],
    imageUrl: a.coverImageUrl ?? undefined,
    status: a.status || 'DRAFT',
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    approvedBy: a.approvedBy || null,
    approvedAt: a.approvedAt ? a.approvedAt.toISOString() : null,
    authorName: a.authorName || 'VedaClue Team',
    viewCount: a.viewCount || 0,
    createdAt: a.createdAt ? a.createdAt.toISOString().split('T')[0] : '',
  };
}

function mapDoctor(d: any) {
  return {
    id: d.id, name: d.fullName, specialization: d.specialization,
    experience: d.experienceYears || 0, rating: d.rating || 5.0,
    reviews: d.totalReviews || 0, fee: d.consultationFee || 0,
    feeFreeForPoor: false,
    qualification: Array.isArray(d.qualifications) ? d.qualifications.join(', ') : '',
    tags: d.tags || [], languages: d.languages || [],
    about: d.bio || '', isChief: d.isChief ?? false,
    isPublished: d.isPublished ?? false, isPromoted: d.isPromoted ?? false,
    avatarUrl: d.avatarUrl || d.photoUrl || undefined,
    hospitalName: d.hospitalName || null,
    location: d.location || null,
    status: d.status || 'pending',
    approvedBy: d.approvedBy || null,
    approvedAt: d.approvedAt ? d.approvedAt.toISOString() : null,
    publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
    createdAt: d.createdAt ? d.createdAt.toISOString().split('T')[0] : '',
  };
}

// ─── Stats ──────────────────────────────────────────
r.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, doctors, products, articles, appointments] = await Promise.all([
      prisma.user.count(),
      prisma.doctor.count(),
      prisma.product.count(),
      prisma.article.count(),
      prisma.appointment.count(),
    ]);
    successResponse(res, { users, doctors, products, articles, appointments });
  } catch (e) { next(e); }
});

// ─── Dashboard (Prisma) ─────────────────────────────
r.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [products, articles, doctors] = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.doctor.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    successResponse(res, {
      products: products.map(mapProduct),
      articles: articles.map(mapArticle),
      doctors: doctors.map(mapDoctor),
    });
  } catch (e) { next(e); }
});

// ─── Analytics (Prisma aggregates) ───────────────────
r.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers, totalCycles, totalAppointments, usersByRole, recentSignups, moodLogs, cyclesWithLength] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.cycle.count(),
      prisma.appointment.count(),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, fullName: true, email: true, createdAt: true, role: true },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      prisma.moodLog.groupBy({ by: ['mood'], _count: { id: true } }),
      prisma.cycle.findMany({
        where: { cycleLength: { not: null } },
        select: { cycleLength: true }, take: 500,
      }),
    ]);
    const avgCycleLength = cyclesWithLength.length > 0
      ? Math.round(cyclesWithLength.reduce((s, c) => s + (c.cycleLength || 0), 0) / cyclesWithLength.length) : 28;
    const moodDistribution: Record<string, number> = {};
    const totalMoods = moodLogs.reduce((s, m) => s + m._count.id, 0);
    for (const m of moodLogs) moodDistribution[m.mood] = totalMoods > 0 ? Math.round((m._count.id / totalMoods) * 100) : 0;
    const roleMap: Record<string, number> = {};
    for (const ur of usersByRole) roleMap[ur.role] = ur._count.id;

    // Additional CMS stats
    const [publishedArticles, activeProducts] = await Promise.all([
      prisma.article.count({ where: { status: 'PUBLISHED' } }),
      prisma.product.count({ where: { isPublished: true } }),
    ]);

    successResponse(res, { totalUsers, activeUsers, totalCycles, avgCycleLength, totalAppointments, moodDistribution, usersByRole: roleMap, recentSignups, publishedArticles, activeProducts });
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
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
    if (role && ['USER','DOCTOR','ADMIN'].includes(role)) where.role = role;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    successResponse(res, { users, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

r.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, isActive } = req.body;
    const data: any = {};
    if (role && ['USER','DOCTOR','ADMIN'].includes(role)) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    const user = await prisma.user.update({
      where: { id: req.params.id }, data,
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true, isActive: true, createdAt: true },
    });
    successResponse(res, user);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'User not found', 404); return; }
    next(e);
  }
});

r.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    successResponse(res, null, 'User deactivated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'User not found', 404); return; }
    next(e);
  }
});

// ─── Appointments (Prisma) ──────────────────────────
r.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-complete past appointments that are still PENDING/CONFIRMED
    const now = new Date();
    await prisma.appointment.updateMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: now },
      },
      data: { status: 'COMPLETED' },
    });

    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const where: any = {};
    if (status && ['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','REJECTED','NO_SHOW','CANCELLED'].includes(status)) where.status = status;
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          doctor: { select: { id: true, fullName: true, specialization: true, avatarUrl: true } },
        },
        orderBy: { scheduledAt: 'desc' }, skip, take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);
    successResponse(res, { appointments, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

r.patch('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status || !['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','REJECTED','NO_SHOW','CANCELLED'].includes(status)) {
      errorResponse(res, 'Invalid status'); return;
    }
    const appt = await prisma.appointment.update({
      where: { id: req.params.id }, data: { status },
      include: { user: { select: { id: true, fullName: true, email: true } }, doctor: { select: { id: true, fullName: true } } },
    });
    successResponse(res, appt);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Appointment not found', 404); return; }
    next(e);
  }
});

// ─── Products CRUD (Prisma) ─────────────────────────
r.get('/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    successResponse(res, products.map(mapProduct));
  } catch (e) { next(e); }
});

r.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    if (!b.name || !b.price) { errorResponse(res, 'Name and price are required', 400); return; }
    const product = await prisma.product.create({
      data: {
        name: b.name, category: b.category || 'skincare',
        price: Number(b.price) || 0, discountPrice: b.discountPrice ? Number(b.discountPrice) : null,
        description: b.description || '', ingredients: Array.isArray(b.ingredients) ? b.ingredients : [],
        benefits: Array.isArray(b.benefits) ? b.benefits : [], howToUse: b.howToUse || '',
        size: b.size || '', emoji: b.emoji || '🌿',
        targetAudience: Array.isArray(b.targetAudience) ? b.targetAudience : ['all'],
        tags: Array.isArray(b.tags) ? b.tags : [], imageUrl: b.imageUrl || null,
        galleryImages: Array.isArray(b.galleryImages) ? b.galleryImages : [],
        isPublished: false, isFeatured: b.isFeatured ?? false, inStock: true, rating: 5.0, reviews: 0,
        status: 'draft', stock: Number(b.stock) || 0, unit: b.unit || 'piece',
        ownerEmail: b.ownerEmail || null, ownerPhone: b.ownerPhone || null,
      },
    });
    successResponse(res, mapProduct(product), 'Product created', 201);
  } catch (e) { next(e); }
});

r.put('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.category !== undefined) data.category = b.category;
    if (b.price !== undefined) data.price = Number(b.price);
    if (b.discountPrice !== undefined) data.discountPrice = b.discountPrice ? Number(b.discountPrice) : null;
    if (b.description !== undefined) data.description = b.description;
    if (b.ingredients !== undefined) data.ingredients = Array.isArray(b.ingredients) ? b.ingredients : [];
    if (b.benefits !== undefined) data.benefits = Array.isArray(b.benefits) ? b.benefits : [];
    if (b.howToUse !== undefined) data.howToUse = b.howToUse;
    if (b.size !== undefined) data.size = b.size;
    if (b.emoji !== undefined) data.emoji = b.emoji;
    if (b.targetAudience !== undefined) data.targetAudience = Array.isArray(b.targetAudience) ? b.targetAudience : [];
    if (b.tags !== undefined) data.tags = Array.isArray(b.tags) ? b.tags : [];
    if (b.imageUrl !== undefined) data.imageUrl = b.imageUrl || null;
    if (b.galleryImages !== undefined) data.galleryImages = Array.isArray(b.galleryImages) ? b.galleryImages : [];
    if (typeof b.isFeatured === 'boolean') data.isFeatured = b.isFeatured;
    if (typeof b.inStock === 'boolean') data.inStock = b.inStock;
    if (b.stock !== undefined) data.stock = Number(b.stock);
    if (b.unit !== undefined) data.unit = b.unit;
    if (b.ownerEmail !== undefined) data.ownerEmail = b.ownerEmail || null;
    if (b.ownerPhone !== undefined) data.ownerPhone = b.ownerPhone || null;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    successResponse(res, mapProduct(product));
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

r.post('/products/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Product not found', 404); return; }
    const nowPublished = !existing.isPublished;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        isPublished: nowPublished,
        status: nowPublished ? 'published' : 'draft',
        publishedAt: nowPublished ? new Date() : null,
        approvedBy: nowPublished ? ((req as any).user?.id || 'admin') : existing.approvedBy,
        approvedAt: nowPublished ? new Date() : existing.approvedAt,
      },
    });
    successResponse(res, mapProduct(product));
  } catch (e) { next(e); }
});

r.patch('/products/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        isPublished: true, status: 'published',
        publishedAt: new Date(),
        approvedBy: (req as any).user?.id || 'admin',
        approvedAt: new Date(),
      },
    });
    successResponse(res, mapProduct(product), 'Product published');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

r.patch('/products/:id/unpublish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isPublished: false, status: 'draft', publishedAt: null },
    });
    successResponse(res, mapProduct(product), 'Product unpublished');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

r.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Product deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

// ─── Articles CRUD (Prisma) ─────────────────────────
r.get('/articles', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    successResponse(res, articles.map(mapArticle));
  } catch (e) { next(e); }
});

r.post('/articles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    if (!b.title || !b.content) { errorResponse(res, 'Title and content are required', 400); return; }
    const readTimeMinutes = typeof b.readTime === 'string' ? parseInt(b.readTime) || 5 : Number(b.readTime) || 5;
    const article = await prisma.article.create({
      data: {
        title: b.title, slug: slugify(b.title || 'article'),
        content: b.content || '', excerpt: b.excerpt || '',
        category: b.category || 'wellness',
        emoji: b.emoji || '📝', targetAudience: Array.isArray(b.targetAudience) ? b.targetAudience : ['all'],
        tags: Array.isArray(b.tags) ? b.tags : [], coverImageUrl: b.imageUrl || null,
        readTimeMinutes, isFeatured: b.isFeatured ?? false, status: 'DRAFT',
        authorName: b.authorName || 'VedaClue Team',
      },
    });
    successResponse(res, mapArticle(article), 'Article created', 201);
  } catch (e) { next(e); }
});

r.put('/articles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const data: any = {};
    if (b.title !== undefined) data.title = b.title;
    if (b.content !== undefined) data.content = b.content;
    if (b.excerpt !== undefined) data.excerpt = b.excerpt;
    if (b.category !== undefined) data.category = b.category;
    if (b.emoji !== undefined) data.emoji = b.emoji;
    if (b.targetAudience !== undefined) data.targetAudience = Array.isArray(b.targetAudience) ? b.targetAudience : [];
    if (b.tags !== undefined) data.tags = Array.isArray(b.tags) ? b.tags : [];
    if (b.imageUrl !== undefined) data.coverImageUrl = b.imageUrl || null;
    if (b.readTime !== undefined) data.readTimeMinutes = typeof b.readTime === 'string' ? parseInt(b.readTime) || 5 : Number(b.readTime) || 5;
    if (typeof b.isFeatured === 'boolean') data.isFeatured = b.isFeatured;
    if (b.authorName !== undefined) data.authorName = b.authorName;
    const article = await prisma.article.update({ where: { id: req.params.id }, data });
    successResponse(res, mapArticle(article));
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Article not found', 404); return; }
    next(e);
  }
});

r.post('/articles/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Article not found', 404); return; }
    const newStatus = existing.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'PUBLISHED' ? new Date() : null,
        approvedBy: newStatus === 'PUBLISHED' ? ((req as any).user?.id || 'admin') : existing.approvedBy,
        approvedAt: newStatus === 'PUBLISHED' ? new Date() : existing.approvedAt,
      },
    });
    successResponse(res, mapArticle(article));
  } catch (e) { next(e); }
});

r.patch('/articles/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        approvedBy: (req as any).user?.id || 'admin',
        approvedAt: new Date(),
      },
    });
    successResponse(res, mapArticle(article), 'Article published');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Article not found', 404); return; }
    next(e);
  }
});

r.patch('/articles/:id/unpublish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT', publishedAt: null },
    });
    successResponse(res, mapArticle(article), 'Article unpublished');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Article not found', 404); return; }
    next(e);
  }
});

r.delete('/articles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.article.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Article deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Article not found', 404); return; }
    next(e);
  }
});

// ─── Doctors CRUD (Prisma) ──────────────────────────
r.get('/doctors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await prisma.doctor.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    successResponse(res, doctors.map(mapDoctor));
  } catch (e) { next(e); }
});

r.post('/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    if (!b.name || !b.specialization) { errorResponse(res, 'Name and specialization are required', 400); return; }
    const qualifications = typeof b.qualification === 'string'
      ? b.qualification.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(b.qualifications) ? b.qualifications : [];
    const doctor = await prisma.doctor.create({
      data: {
        fullName: b.name, specialization: b.specialization || '',
        qualifications, experienceYears: Number(b.experience) || 0,
        consultationFee: Number(b.fee) || 0, bio: b.about || '',
        tags: Array.isArray(b.tags) ? b.tags : [],
        languages: Array.isArray(b.languages) ? b.languages.map((l: string) => (typeof l === 'string' ? l.toUpperCase() : l)).filter(Boolean) : [],
        avatarUrl: b.avatarUrl || null, isPublished: true, isChief: b.isChief ?? false, isPromoted: b.isPromoted ?? false,
        rating: 5.0, totalReviews: 0, isAvailable: true, isVerified: true,
        status: 'active', hospitalName: b.hospitalName || null, location: b.location || null,
        commissionRate: b.commissionRate ? Number(b.commissionRate) : null,
        approvedBy: (req as any).user?.id || 'admin', approvedAt: new Date(), publishedAt: new Date(),
      },
    });
    // If doctor has an email in the request, create linked User account
    if (b.email) {
      try {
        const crypto = require('crypto');
        const bcrypt = require('bcryptjs');
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({ where: { email: b.email } });
        if (existingUser) {
          // Link existing user to doctor and upgrade role
          await prisma.user.update({ where: { id: existingUser.id }, data: { role: 'DOCTOR' } });
          await prisma.doctor.update({ where: { id: doctor.id }, data: { userId: existingUser.id } });
        } else {
          const doctorUser = await prisma.user.create({
            data: {
              email: b.email,
              fullName: b.name || 'Doctor',
              passwordHash,
              role: 'DOCTOR',
              isActive: true,
            },
          });
          // Link user to doctor
          await prisma.doctor.update({
            where: { id: doctor.id },
            data: { userId: doctorUser.id },
          });
        }
      } catch (linkErr) {
        // Non-fatal: doctor was created, just linking failed
        console.error('Failed to create doctor user account:', linkErr);
      }
    }

    successResponse(res, mapDoctor(doctor), 'Doctor created', 201);
  } catch (e) { next(e); }
});

r.put('/doctors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const data: any = {};
    if (b.name !== undefined) data.fullName = b.name;
    if (b.specialization !== undefined) data.specialization = b.specialization;
    if (b.qualification !== undefined) {
      data.qualifications = typeof b.qualification === 'string'
        ? b.qualification.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (b.experience !== undefined) data.experienceYears = Number(b.experience);
    if (b.fee !== undefined) data.consultationFee = Number(b.fee);
    if (b.about !== undefined) data.bio = b.about;
    if (b.tags !== undefined) data.tags = Array.isArray(b.tags) ? b.tags : [];
    if (b.languages !== undefined) data.languages = Array.isArray(b.languages) ? b.languages.map((l: string) => (typeof l === 'string' ? l.toUpperCase() : l)).filter(Boolean) : [];
    if (b.avatarUrl !== undefined) data.avatarUrl = b.avatarUrl || null;
    if (typeof b.isChief === 'boolean') data.isChief = b.isChief;
    if (typeof b.isPromoted === 'boolean') data.isPromoted = b.isPromoted;
    if (b.hospitalName !== undefined) data.hospitalName = b.hospitalName;
    if (b.location !== undefined) data.location = b.location;
    const doctor = await prisma.doctor.update({ where: { id: req.params.id }, data });
    successResponse(res, mapDoctor(doctor));
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Doctor not found', 404); return; }
    next(e);
  }
});

r.post('/doctors/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Doctor not found', 404); return; }
    const nowPublished = !existing.isPublished;
    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: {
        isPublished: nowPublished,
        status: nowPublished ? 'active' : 'pending',
        approvedBy: nowPublished ? ((req as any).user?.id || 'admin') : existing.approvedBy,
        approvedAt: nowPublished ? new Date() : existing.approvedAt,
        publishedAt: nowPublished ? new Date() : null,
      },
    });
    successResponse(res, mapDoctor(doctor));
  } catch (e) { next(e); }
});

r.patch('/doctors/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: {
        isPublished: true, status: 'active',
        approvedBy: (req as any).user?.id || 'admin',
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    successResponse(res, mapDoctor(doctor), 'Doctor approved and published');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Doctor not found', 404); return; }
    next(e);
  }
});

r.patch('/doctors/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: { isPublished: false, status: 'inactive' },
    });
    successResponse(res, mapDoctor(doctor), 'Doctor rejected');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Doctor not found', 404); return; }
    next(e);
  }
});

r.post('/doctors/:id/toggle-promote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Doctor not found', 404); return; }
    const doctor = await prisma.doctor.update({ where: { id: req.params.id }, data: { isPromoted: !existing.isPromoted } });
    successResponse(res, mapDoctor(doctor));
  } catch (e) { next(e); }
});

r.delete('/doctors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.doctor.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Doctor deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Doctor not found', 404); return; }
    next(e);
  }
});

// ─── File Upload ─────────────────────────────────────
r.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) { errorResponse(res, 'No file uploaded'); return; }
  successResponse(res, { url: `/uploads/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
});

// ─── Callback Requests (Prisma) ─────────────────────

// GET /api/v1/admin/callbacks — list all callback requests
r.get('/callbacks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const callbacks = await prisma.callbackRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    successResponse(res, callbacks);
  } catch (e) { next(e); }
});

// PATCH /api/v1/admin/callbacks/:id — update status + notes
r.patch('/callbacks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminNotes } = req.body;
    const validCallbackStatuses = ['PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED'];
    if (status && !validCallbackStatuses.includes(status)) {
      errorResponse(res, `Invalid status. Must be one of: ${validCallbackStatuses.join(', ')}`, 400); return;
    }
    const callback = await prisma.callbackRequest.update({
      where: { id: req.params.id },
      data: { status, adminNotes, updatedAt: new Date() }
    });
    successResponse(res, callback, 'Callback updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Callback not found', 404); return; }
    next(e);
  }
});

// DELETE /api/v1/admin/callbacks/:id
r.delete('/callbacks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.callbackRequest.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Callback request deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Callback not found', 404); return; }
    next(e);
  }
});

// ─── Product Analytics ───────────────────────────────
r.get('/analytics/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, category: true, price: true, discountPrice: true,
        stock: true, reviews: true, rating: true, isPublished: true, inStock: true,
        createdAt: true,
      },
    });

    // Stock alerts: products with stock < 10
    const lowStock = products.filter(p => (p.stock || 0) < 10);

    // Top 5 by reviews (proxy for orders since we don't have an order table)
    const top5 = [...products]
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        reviews: p.reviews || 0,
        rating: p.rating || 5.0,
        revenue: ((p.discountPrice || p.price) * (p.reviews || 0)),
      }));

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    for (const p of products) {
      categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
    }

    successResponse(res, {
      total: products.length,
      published: products.filter(p => p.isPublished).length,
      outOfStock: products.filter(p => !p.inStock || p.stock === 0).length,
      lowStock: lowStock.map(p => ({ id: p.id, name: p.name, stock: p.stock || 0 })),
      top5,
      categoryBreakdown: categoryMap,
    });
  } catch (e) { next(e); }
});

// ─── Doctor Analytics ────────────────────────────────
r.get('/analytics/doctors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [doctors, appointments] = await Promise.all([
      prisma.doctor.findMany({
        select: { id: true, fullName: true, specialization: true, rating: true, totalReviews: true, isPublished: true },
      }),
      prisma.appointment.findMany({
        select: { doctorId: true, status: true, amountPaid: true },
        where: { doctorId: { not: null } },
      }),
    ]);

    const statsMap: Record<string, {
      totalBookings: number; confirmed: number; completed: number;
      rejected: number; cancelled: number; noShow: number; inProgress: number; revenue: number;
    }> = {};

    for (const a of appointments) {
      if (!a.doctorId) continue;
      if (!statsMap[a.doctorId]) {
        statsMap[a.doctorId] = { totalBookings: 0, confirmed: 0, completed: 0, rejected: 0, cancelled: 0, noShow: 0, inProgress: 0, revenue: 0 };
      }
      const s = statsMap[a.doctorId];
      s.totalBookings++;
      if (a.status === 'CONFIRMED') s.confirmed++;
      if (a.status === 'COMPLETED') { s.completed++; s.revenue += a.amountPaid || 0; }
      if (a.status === 'REJECTED') s.rejected++;
      if (a.status === 'CANCELLED') s.cancelled++;
      if (a.status === 'NO_SHOW') s.noShow++;
      if (a.status === 'IN_PROGRESS') s.inProgress++;
    }

    const doctorStats = doctors.map(d => {
      const s = statsMap[d.id] || { totalBookings: 0, confirmed: 0, completed: 0, rejected: 0, cancelled: 0, noShow: 0, inProgress: 0, revenue: 0 };
      const cancellationRate = s.totalBookings > 0 ? Math.round(((s.cancelled + s.noShow) / s.totalBookings) * 100) : 0;
      return {
        id: d.id,
        name: d.fullName,
        specialization: d.specialization,
        rating: d.rating,
        isPublished: d.isPublished,
        ...s,
        cancellationRate,
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings);

    const mostBooked = doctorStats[0] || null;

    successResponse(res, {
      doctors: doctorStats,
      mostBooked,
      totalAppointments: appointments.length,
      completionRate: appointments.length > 0
        ? Math.round((appointments.filter(a => a.status === 'COMPLETED').length / appointments.length) * 100)
        : 0,
    });
  } catch (e) { next(e); }
});

// ─── Prescriptions (Admin) ───────────────────────────
r.get('/prescriptions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, prescriptions);
  } catch (e) { next(e); }
});

// ─── Test Email ─────────────────────────────────────
r.post('/test-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) { errorResponse(res, 'Valid email required'); return; }
    await sendWelcomeEmail(email, 'VedaClue Admin');
    successResponse(res, null, 'Test email sent');
  } catch (e) { next(e); }
});

// ─── Orders (Admin) ─────────────────────────────────

// GET /api/v1/admin/orders
r.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, paymentStatus, page = '1', limit = '20' } = req.query as any;
    const where: any = {};
    if (status) where.orderStatus = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, user: { select: { id: true, fullName: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
      prisma.order.count({ where }),
    ]);
    successResponse(res, { orders, total, page: Number(page) });
  } catch (e) { next(e); }
});

// PATCH /api/v1/admin/orders/:id/status
r.patch('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validOrderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    if (!req.body.status || !validOrderStatuses.includes(req.body.status)) {
      errorResponse(res, `Invalid status. Must be one of: ${validOrderStatuses.join(', ')}`, 400); return;
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { orderStatus: req.body.status },
      include: { user: { select: { email: true, fullName: true } } },
    });
    // Restore stock for cancelled/returned orders
    if (['CANCELLED', 'RETURNED'].includes(req.body.status)) {
      const orderItems = await prisma.orderItem.findMany({ where: { orderId: req.params.id } });
      for (const item of orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    successResponse(res, order);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Order not found', 404); return; }
    next(e);
  }
});

// ══════════════════════════════════════════════════════════════════
// AYURVEDA MANAGEMENT — Dosha profiles, questions, analytics
// ══════════════════════════════════════════════════════════════════

// ─── GET /admin/dosha/profiles — All user dosha profiles (paginated) ──
r.get('/dosha/profiles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const dosha = req.query.dosha as string | undefined;
    const verified = req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined;
    const result = await doshaService.getAllDoshaProfiles(page, limit, { dosha, verified });
    successResponse(res, result);
  } catch (e: any) { next(e); }
});

// ─── GET /admin/dosha/profiles/:userId — Detailed dosha profile ──
r.get('/dosha/profiles/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await doshaService.getDoshaProfile(req.params.userId);
    const history = await doshaService.getAssessmentHistory(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
    });
    successResponse(res, { user, profile, assessmentHistory: history });
  } catch (e: any) { next(e); }
});

// ─── PATCH /admin/dosha/profiles/:userId/verify — Admin verify/override dosha ──
r.patch('/dosha/profiles/:userId/verify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { primaryDosha, secondaryDosha, vataScore, pittaScore, kaphaScore, notes } = req.body;
    if (!primaryDosha || vataScore == null || pittaScore == null || kaphaScore == null) {
      errorResponse(res, 'primaryDosha, vataScore, pittaScore, kaphaScore are required', 400); return;
    }
    const result = await doshaService.adminVerifyDosha(req.user!.id, req.params.userId, {
      primaryDosha, secondaryDosha, vataScore, pittaScore, kaphaScore, notes,
    });
    successResponse(res, result, 'Dosha verified by admin');
  } catch (e: any) { next(e); }
});

// ─── GET /admin/dosha/analytics — Dosha distribution & stats ──
r.get('/dosha/analytics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await doshaService.getDoshaAnalytics();
    successResponse(res, analytics);
  } catch (e: any) { next(e); }
});

// ─── GET /admin/dosha/questions — List all quiz questions ──
r.get('/dosha/questions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const questions = await prisma.doshaQuestion.findMany({ orderBy: { orderIndex: 'asc' } });
    successResponse(res, questions);
  } catch (e: any) { next(e); }
});

// ─── POST /admin/dosha/questions — Create quiz question ──
r.post('/dosha/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionText, questionCategory, options, weight, orderIndex } = req.body;
    if (!questionText || !questionCategory || !options) {
      errorResponse(res, 'questionText, questionCategory, options are required', 400); return;
    }
    const q = await doshaService.createQuestion({ questionText, questionCategory, options, weight, orderIndex });
    successResponse(res, q, 'Question created');
  } catch (e: any) { next(e); }
});

// ─── PUT /admin/dosha/questions/:id — Update quiz question ──
r.put('/dosha/questions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await doshaService.updateQuestion(req.params.id, req.body);
    successResponse(res, q, 'Question updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Question not found', 404); return; }
    next(e);
  }
});

// ─── DELETE /admin/dosha/questions/:id — Delete quiz question ──
r.delete('/dosha/questions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await doshaService.deleteQuestion(req.params.id);
    successResponse(res, null, 'Question deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Question not found', 404); return; }
    next(e);
  }
});

// ═══════════════════════════════════════════════════════
// ─── DOCTOR PAYOUTS & SETTLEMENTS ─────────────────────
// Revenue split like Practo/Zocdoc: platform keeps commission,
// rest is settled to doctors periodically.
// ═══════════════════════════════════════════════════════

// ─── GET /admin/payouts/summary — Overview: per-doctor unsettled earnings ──
r.get('/payouts/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all doctors with completed appointments
    const doctors = await prisma.doctor.findMany({
      select: {
        id: true,
        fullName: true,
        specialization: true,
        avatarUrl: true,
        consultationFee: true,
        commissionRate: true,
        appointments: {
          where: { status: 'COMPLETED' },
          select: { id: true, amountPaid: true, scheduledAt: true, paymentId: true },
        },
        payouts: {
          select: { id: true, totalEarnings: true, netPayout: true, status: true, periodStart: true, periodEnd: true, paidAt: true },
        },
      },
    });

    // Get platform default commission from config
    let platformConfig = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
    const defaultCommission = platformConfig?.defaultDoctorCommission ?? 20;

    const summary = doctors.map(doc => {
      const totalEarned = doc.appointments.reduce((sum, a) => sum + (a.amountPaid || 0), 0);
      const totalSettled = doc.payouts
        .filter(p => p.status === 'PAID' || p.status === 'PROCESSING')
        .reduce((sum, p) => sum + p.netPayout, 0);
      const totalPending = doc.payouts
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.netPayout, 0);

      // Per-doctor commission rate (Practo model: different rate per doctor)
      const docCommission = (doc as any).commissionRate ?? defaultCommission;

      // Calculate unsettled: total earned minus gross of all payouts
      const totalPayoutGross = doc.payouts.reduce((sum, p) => sum + p.totalEarnings, 0);
      const unsettledGross = totalEarned - totalPayoutGross;
      const platformFee = unsettledGross * (docCommission / 100);
      const unsettledNet = unsettledGross - platformFee;

      return {
        doctorId: doc.id,
        doctorName: doc.fullName,
        specialization: doc.specialization,
        avatarUrl: doc.avatarUrl,
        consultationFee: doc.consultationFee,
        commissionRate: docCommission,
        totalAppointments: doc.appointments.length,
        totalEarned,
        totalSettled,
        totalPending,
        unsettledGross: Math.max(0, unsettledGross),
        unsettledNet: Math.max(0, unsettledNet),
        lastPayout: doc.payouts.filter(p => p.status === 'PAID').sort((a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0))[0] || null,
      };
    }).filter(d => d.totalAppointments > 0);

    const platformTotalRevenue = summary.reduce((s, d) => s + d.totalEarned, 0);
    const platformCommissionTotal = summary.reduce((s, d) => s + (d.totalEarned - d.totalSettled - d.unsettledNet), 0);

    successResponse(res, {
      doctors: summary,
      platformStats: {
        totalRevenue: platformTotalRevenue,
        totalCommission: Math.max(0, platformCommissionTotal),
        totalPaidOut: summary.reduce((s, d) => s + d.totalSettled, 0),
        totalPending: summary.reduce((s, d) => s + d.totalPending, 0),
        totalUnsettled: summary.reduce((s, d) => s + d.unsettledNet, 0),
        defaultCommissionRate: defaultCommission,
      },
    });
  } catch (e) { next(e); }
});

// ─── GET /admin/payouts — List all payouts with filters ──
r.get('/payouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, doctorId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (doctorId) where.doctorId = doctorId;

    const payouts = await prisma.doctorPayout.findMany({
      where,
      include: {
        doctor: { select: { fullName: true, specialization: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, payouts);
  } catch (e) { next(e); }
});

// ─── POST /admin/payouts/generate — Generate settlement for a doctor ──
r.post('/payouts/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctorId, commissionRate: overrideRate } = req.body;
    if (!doctorId) { errorResponse(res, 'doctorId is required', 400); return; }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) { errorResponse(res, 'Doctor not found', 404); return; }

    // Priority: admin override > doctor's rate > platform default
    let pConfig = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
    const commissionRate = overrideRate ?? doctor.commissionRate ?? pConfig?.defaultDoctorCommission ?? 20;

    // Find the last payout end date for this doctor
    const lastPayout = await prisma.doctorPayout.findFirst({
      where: { doctorId },
      orderBy: { periodEnd: 'desc' },
    });

    const periodStart = lastPayout ? lastPayout.periodEnd : new Date('2024-01-01');
    const periodEnd = new Date();

    // Get completed appointments in this period that haven't been settled
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: 'COMPLETED',
        scheduledAt: { gte: periodStart, lte: periodEnd },
      },
    });

    if (appointments.length === 0) {
      errorResponse(res, 'No unsettled completed appointments found for this doctor', 400);
      return;
    }

    const totalEarnings = appointments.reduce((sum, a) => sum + (a.amountPaid || 0), 0);
    const platformFee = totalEarnings * (commissionRate / 100);
    const netPayout = totalEarnings - platformFee;

    const payout = await prisma.doctorPayout.create({
      data: {
        doctorId,
        periodStart,
        periodEnd,
        totalEarnings,
        platformFee,
        netPayout,
        commissionRate,
        appointmentCount: appointments.length,
        status: 'PENDING',
      },
      include: {
        doctor: { select: { fullName: true, specialization: true } },
      },
    });

    successResponse(res, payout, 'Settlement generated successfully');
  } catch (e) { next(e); }
});

// ─── PATCH /admin/payouts/:id — Update payout status (mark as paid, processing, etc.) ──
r.patch('/payouts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, transactionId, paymentMethod, adminNotes } = req.body;

    const validPayoutStatuses = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'];
    if (status && !validPayoutStatuses.includes(status)) {
      errorResponse(res, `Invalid status. Must be one of: ${validPayoutStatuses.join(', ')}`, 400); return;
    }
    const updateData: any = {};
    if (status) updateData.status = status;
    if (transactionId) updateData.transactionId = transactionId;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === 'PAID') updateData.paidAt = new Date();

    const payout = await prisma.doctorPayout.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        doctor: { select: { fullName: true, specialization: true } },
      },
    });

    successResponse(res, payout, `Payout ${status === 'PAID' ? 'marked as paid' : 'updated'}`);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Payout not found', 404); return; }
    next(e);
  }
});

// ─── DELETE /admin/payouts/:id — Delete a payout (only PENDING) ──
r.delete('/payouts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payout = await prisma.doctorPayout.findUnique({ where: { id: req.params.id } });
    if (!payout) { errorResponse(res, 'Payout not found', 404); return; }
    if (payout.status !== 'PENDING') { errorResponse(res, 'Only PENDING payouts can be deleted', 400); return; }

    await prisma.doctorPayout.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Payout deleted');
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════
// ─── Wellness Activities (Yoga / Breathwork / Meditation) ─
// ═══════════════════════════════════════════════════════════

function mapActivity(a: any) {
  return {
    id: a.id, title: a.title, description: a.description,
    category: a.category, durationMinutes: a.durationMinutes,
    difficulty: a.difficulty, cyclePhases: a.cyclePhases || [],
    imageUrl: a.imageUrl, audioUrl: a.audioUrl, videoUrl: a.videoUrl,
    instructions: a.instructions, isActive: a.isActive,
    createdAt: a.createdAt?.toISOString?.() || a.createdAt,
  };
}

// GET /admin/wellness — list all activities (active + inactive)
r.get('/wellness', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await prisma.wellnessActivity.findMany({ orderBy: { createdAt: 'desc' } });
    successResponse(res, activities.map(mapActivity));
  } catch (e) { next(e); }
});

// POST /admin/wellness — create activity
r.post('/wellness', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, category, durationMinutes, difficulty, cyclePhases,
            imageUrl, audioUrl, videoUrl, instructions } = req.body;
    if (!title || !category) { errorResponse(res, 'title and category are required', 400); return; }
    const validCategories = ['yoga', 'breathing', 'meditation', 'stress_management'];
    if (!validCategories.includes(category)) { errorResponse(res, `category must be one of: ${validCategories.join(', ')}`, 400); return; }
    const activity = await prisma.wellnessActivity.create({
      data: {
        title, description: description || '',
        category,
        durationMinutes: parseInt(durationMinutes) || 10,
        difficulty: difficulty || 'beginner',
        cyclePhases: cyclePhases || [],
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        videoUrl: videoUrl || null,
        instructions: instructions || null,
        isActive: false,
      },
    });
    successResponse(res, mapActivity(activity), 'Activity created');
  } catch (e) { next(e); }
});

// PUT /admin/wellness/:id — update activity
r.put('/wellness/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, category, durationMinutes, difficulty, cyclePhases,
            imageUrl, audioUrl, videoUrl, instructions } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (durationMinutes !== undefined) data.durationMinutes = parseInt(durationMinutes) || 10;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (cyclePhases !== undefined) data.cyclePhases = cyclePhases;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (audioUrl !== undefined) data.audioUrl = audioUrl;
    if (videoUrl !== undefined) data.videoUrl = videoUrl;
    if (instructions !== undefined) data.instructions = instructions;
    const activity = await prisma.wellnessActivity.update({ where: { id: req.params.id }, data });
    successResponse(res, mapActivity(activity), 'Activity updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Activity not found', 404); return; }
    next(e);
  }
});

// POST /admin/wellness/:id/toggle-publish — toggle active/inactive
r.post('/wellness/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.wellnessActivity.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Activity not found', 404); return; }
    const activity = await prisma.wellnessActivity.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    successResponse(res, mapActivity(activity), activity.isActive ? 'Activity published' : 'Activity unpublished');
  } catch (e) { next(e); }
});

// DELETE /admin/wellness/:id — delete activity
r.delete('/wellness/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.wellnessActivity.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Activity deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Activity not found', 404); return; }
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════
// ─── Programs Management ─────────────────────────────────
// ═══════════════════════════════════════════════════════════

// GET /admin/programs — list all programs
r.get('/programs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { contents: true, enrollments: true } },
      },
    });
    successResponse(res, programs.map(p => ({
      ...p, contentCount: p._count.contents, enrolledCount: p._count.enrollments, _count: undefined,
    })));
  } catch (e) { next(e); }
});

// POST /admin/programs — create program
r.post('/programs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, subtitle, description, emoji, imageUrl, category, duration, durationDays,
            isFree, price, discountPrice, targetAudiences, doshaTypes, difficulty,
            highlights, whatYouGet, prerequisites, doctorName, doctorId } = req.body;
    if (!title || !category) { errorResponse(res, 'title and category are required', 400); return; }
    const program = await prisma.program.create({
      data: {
        title, subtitle, description, emoji: emoji || '🌸', imageUrl,
        category, duration, durationDays: parseInt(durationDays) || 30,
        isFree: isFree ?? true, price: parseFloat(price) || 0, discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        targetAudiences: targetAudiences || [], doshaTypes: doshaTypes || [],
        difficulty: difficulty || 'beginner',
        highlights: highlights || [], whatYouGet: whatYouGet || [],
        prerequisites, doctorName, doctorId,
      },
    });
    successResponse(res, program, 'Program created');
  } catch (e) { next(e); }
});

// PUT /admin/programs/:id — update program
r.put('/programs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const d: any = {};
    const fields = ['title', 'subtitle', 'description', 'emoji', 'imageUrl', 'category', 'duration',
      'durationDays', 'isFree', 'price', 'discountPrice', 'targetAudiences', 'doshaTypes',
      'difficulty', 'highlights', 'whatYouGet', 'prerequisites', 'doctorName', 'doctorId', 'isFeatured'];
    for (const k of fields) { if (req.body[k] !== undefined) d[k] = req.body[k]; }
    if (d.durationDays) d.durationDays = parseInt(d.durationDays) || 30;
    if (d.price !== undefined) d.price = parseFloat(d.price) || 0;
    if (d.discountPrice !== undefined) d.discountPrice = d.discountPrice ? parseFloat(d.discountPrice) : null;
    const program = await prisma.program.update({ where: { id: req.params.id }, data: d });
    successResponse(res, program, 'Program updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Program not found', 404); return; }
    next(e);
  }
});

// POST /admin/programs/:id/toggle-publish
r.post('/programs/:id/toggle-publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.program.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Program not found', 404); return; }
    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: {
        isPublished: !existing.isPublished,
        status: !existing.isPublished ? 'PUBLISHED' : 'DRAFT',
        publishedAt: !existing.isPublished ? new Date() : null,
      },
    });
    successResponse(res, program, program.isPublished ? 'Program published' : 'Program unpublished');
  } catch (e) { next(e); }
});

// DELETE /admin/programs/:id
r.delete('/programs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.program.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Program deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Program not found', 404); return; }
    next(e);
  }
});

// ─── Program Content CRUD ──────────────────────────────

// GET /admin/programs/:id/contents
r.get('/programs/:id/contents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contents = await prisma.programContent.findMany({
      where: { programId: req.params.id },
      orderBy: [{ weekNumber: 'asc' }, { sortOrder: 'asc' }],
    });
    successResponse(res, contents);
  } catch (e) { next(e); }
});

// POST /admin/programs/:id/contents — add content item
r.post('/programs/:id/contents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, contentType, weekNumber, dayNumber, sortOrder,
            videoUrl, audioUrl, imageUrl, articleUrl, articleId, body,
            duration, instructions, metadata, isFree, isLocked } = req.body;
    if (!title || !contentType) { errorResponse(res, 'title and contentType are required', 400); return; }
    const content = await prisma.programContent.create({
      data: {
        programId: req.params.id, title, description, contentType,
        weekNumber: parseInt(weekNumber) || 1, dayNumber: dayNumber ? parseInt(dayNumber) : null,
        sortOrder: parseInt(sortOrder) || 0,
        videoUrl, audioUrl, imageUrl, articleUrl, articleId,
        body, duration, instructions, metadata,
        isFree: isFree ?? false, isLocked: isLocked ?? false,
      },
    });
    successResponse(res, content, 'Content added');
  } catch (e) { next(e); }
});

// PUT /admin/programs/contents/:contentId — update content
r.put('/programs/contents/:contentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const d: any = {};
    const fields = ['title', 'description', 'contentType', 'weekNumber', 'dayNumber', 'sortOrder',
      'videoUrl', 'audioUrl', 'imageUrl', 'articleUrl', 'articleId', 'body',
      'duration', 'instructions', 'metadata', 'isFree', 'isLocked'];
    for (const k of fields) { if (req.body[k] !== undefined) d[k] = req.body[k]; }
    if (d.weekNumber) d.weekNumber = parseInt(d.weekNumber) || 1;
    if (d.dayNumber !== undefined) d.dayNumber = d.dayNumber ? parseInt(d.dayNumber) : null;
    if (d.sortOrder !== undefined) d.sortOrder = parseInt(d.sortOrder) || 0;
    const content = await prisma.programContent.update({ where: { id: req.params.contentId }, data: d });
    successResponse(res, content, 'Content updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Content not found', 404); return; }
    next(e);
  }
});

// DELETE /admin/programs/contents/:contentId
r.delete('/programs/contents/:contentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.programContent.delete({ where: { id: req.params.contentId } });
    successResponse(res, null, 'Content deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Content not found', 404); return; }
    next(e);
  }
});

// GET /admin/programs/:id/enrollments — list enrollments for a program
r.get('/programs/:id/enrollments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await prisma.programEnrollment.findMany({
      where: { programId: req.params.id },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, enrollments);
  } catch (e) { next(e); }
});

export default r;
