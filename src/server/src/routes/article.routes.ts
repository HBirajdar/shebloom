// ══════════════════════════════════════════════════════
// src/server/src/routes/article.routes.ts
// GET  /articles                 – paginated list
// GET  /articles/recommended     – phase-aware recommendations
// GET  /articles/bookmarked      – user's bookmarked articles (auth)
// POST /articles/:id/bookmark    – toggle bookmark (auth)
// GET  /articles/:slug           – single article by slug
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';

const r = Router();

// ─── GET /articles ──────────────────────────────────
r.get('/', async (q: Request, s: Response, n: NextFunction) => {
  try {
    const w: any = { status: 'PUBLISHED' };
    if (q.query.category) w.category = q.query.category;
    if (q.query.featured === 'true') w.isFeatured = true;
    const articles = await prisma.article.findMany({
      where: w,
      take: Number(q.query.limit) || 20,
      skip: Number(q.query.offset) || 0,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, slug: true, excerpt: true,
        category: true, tags: true, coverImageUrl: true,
        readTimeMinutes: true, viewCount: true, likeCount: true,
        isFeatured: true, publishedAt: true,
        doctor: { select: { fullName: true, avatarUrl: true, specialization: true } },
      },
    });
    s.json({ success: true, data: articles });
  } catch (e) { n(e); }
});

// ─── GET /articles/recommended ──────────────────────
r.get('/recommended', optionalAuth, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const phase = (q.query.phase as string)?.toUpperCase();
    const PHASE_CATEGORIES: Record<string, string[]> = {
      MENSTRUAL:   ['periods', 'wellness', 'mental_health'],
      FOLLICULAR:  ['nutrition', 'wellness', 'fitness'],
      OVULATION:   ['fertility', 'wellness', 'nutrition'],
      LUTEAL:      ['periods', 'mental_health', 'nutrition'],
    };
    const cats = phase && PHASE_CATEGORIES[phase] ? PHASE_CATEGORIES[phase] : ['wellness'];
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED', category: { in: cats } },
      take: 10,
      orderBy: { viewCount: 'desc' },
      select: {
        id: true, title: true, slug: true, excerpt: true,
        category: true, coverImageUrl: true, readTimeMinutes: true,
        isFeatured: true, publishedAt: true,
      },
    });
    s.json({ success: true, data: articles });
  } catch (e) { n(e); }
});

// ─── GET /articles/bookmarked ───────────────────────
r.get('/bookmarked', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const bookmarks = await prisma.articleBookmark.findMany({
      where: { userId: q.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        article: {
          select: {
            id: true, title: true, slug: true, excerpt: true,
            category: true, coverImageUrl: true, readTimeMinutes: true,
            publishedAt: true,
          },
        },
      },
    });
    s.json({ success: true, data: bookmarks.map(b => ({ ...b.article, bookmarkedAt: b.createdAt })) });
  } catch (e) { n(e); }
});

// ─── POST /articles/:id/bookmark ────────────────────
r.post('/:id/bookmark', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const articleId = q.params.id;

    const existing = await prisma.articleBookmark.findUnique({
      where: { userId_articleId: { userId: uid, articleId } },
    });

    if (existing) {
      await prisma.articleBookmark.delete({ where: { id: existing.id } });
      s.json({ success: true, bookmarked: false, message: 'Bookmark removed' });
    } else {
      await prisma.articleBookmark.create({ data: { userId: uid, articleId } });
      s.json({ success: true, bookmarked: true, message: 'Article bookmarked' });
    }
  } catch (e) { n(e); }
});

// ─── GET /articles/:slug ─────────────────────────────
r.get('/:slug', async (q: Request, s: Response, n: NextFunction) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: q.params.slug },
      include: { doctor: { select: { fullName: true, avatarUrl: true, specialization: true } } },
    });
    if (!article) { s.status(404).json({ success: false, error: 'Article not found' }); return; }
    // Increment view count async (fire-and-forget)
    prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    s.json({ success: true, data: article });
  } catch (e) { n(e); }
});

// ─── POST /articles — admin create ────────────────────
r.post('/', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { title, content, category, tags, coverImageUrl, readTimeMinutes, isFeatured, excerpt, doctorId } = q.body;
    const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const article = await prisma.article.create({
      data: {
        title: title || '',
        slug,
        content: content || '',
        category: category || 'wellness',
        tags: Array.isArray(tags) ? tags : (tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        coverImageUrl: coverImageUrl || null,
        readTimeMinutes: Number(readTimeMinutes) || 5,
        isFeatured: isFeatured || false,
        excerpt: excerpt || (content || '').substring(0, 150),
        doctorId: doctorId || null,
        status: 'DRAFT',
      },
    });
    s.status(201).json({ success: true, data: article });
  } catch (e) { n(e); }
});

// ─── PUT /articles/:id — admin update ─────────────────
r.put('/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { id } = q.params;
    const data: any = {};
    const fields = ['title', 'content', 'category', 'coverImageUrl', 'excerpt', 'doctorId'];
    for (const f of fields) {
      if (q.body[f] !== undefined) data[f] = q.body[f];
    }
    if (q.body.readTimeMinutes !== undefined) data.readTimeMinutes = Number(q.body.readTimeMinutes);
    if (q.body.isFeatured !== undefined) data.isFeatured = q.body.isFeatured;
    if (q.body.status !== undefined) {
      data.status = q.body.status;
      if (q.body.status === 'PUBLISHED' && !data.publishedAt) data.publishedAt = new Date();
    }
    if (q.body.tags !== undefined) {
      data.tags = Array.isArray(q.body.tags) ? q.body.tags : (q.body.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const article = await prisma.article.update({ where: { id }, data });
    s.json({ success: true, data: article });
  } catch (e: any) {
    if (e.code === 'P2025') { s.status(404).json({ success: false, error: 'Article not found' }); return; }
    n(e);
  }
});

// ─── DELETE /articles/:id — admin delete ──────────────
r.delete('/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await prisma.article.delete({ where: { id: q.params.id } });
    s.json({ success: true });
  } catch (e: any) {
    if (e.code === 'P2025') { s.status(404).json({ success: false, error: 'Article not found' }); return; }
    n(e);
  }
});

export default r;
