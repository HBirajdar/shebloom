// ══════════════════════════════════════════════════════
// src/server/src/routes/article.routes.ts
// GET  /articles                 – paginated list (published)
// GET  /articles/all             – all articles (auth)
// GET  /articles/recommended     – phase-aware recommendations
// GET  /articles/bookmarked      – user's bookmarked articles (auth)
// POST /articles/:id/bookmark    – toggle bookmark (auth)
// GET  /articles/:slug           – single article by slug
// POST /articles                 – admin create
// PUT  /articles/:id             – admin update
// DELETE /articles/:id           – admin delete
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// ─── GET /articles — public, only published ──────────
r.get('/', async (q: Request, res: Response, n: NextFunction) => {
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
        emoji: true,
        readTimeMinutes: true, viewCount: true, likeCount: true,
        isFeatured: true, publishedAt: true,
        doctor: { select: { fullName: true, avatarUrl: true, specialization: true } },
      },
    });
    successResponse(res, articles);
  } catch (e) { n(e); }
});

// ─── GET /articles/all — auth required, all articles ──
r.get('/all', authenticate, async (_req: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
    successResponse(res, articles);
  } catch (e) { n(e); }
});

// ─── GET /articles/recommended ──────────────────────
r.get('/recommended', optionalAuth, async (q: AuthRequest, res: Response, n: NextFunction) => {
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
    successResponse(res, articles);
  } catch (e) { n(e); }
});

// ─── GET /articles/bookmarked ───────────────────────
r.get('/bookmarked', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
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
    successResponse(res, bookmarks.map(b => ({ ...b.article, bookmarkedAt: b.createdAt })));
  } catch (e) { n(e); }
});

// ─── POST /articles/:id/bookmark ────────────────────
r.post('/:id/bookmark', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const articleId = q.params.id;

    const existing = await prisma.articleBookmark.findUnique({
      where: { userId_articleId: { userId: uid, articleId } },
    });

    if (existing) {
      await prisma.articleBookmark.delete({ where: { id: existing.id } });
      successResponse(res, { bookmarked: false }, 'Bookmark removed');
    } else {
      await prisma.articleBookmark.create({ data: { userId: uid, articleId } });
      successResponse(res, { bookmarked: true }, 'Article bookmarked');
    }
  } catch (e) { n(e); }
});

// ─── POST /articles/:id/like — toggle like/dislike (any authenticated user) ──
r.post('/:id/like', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const articleId = q.params.id;
    const type = q.body.type === 'DISLIKE' ? 'DISLIKE' : 'LIKE';

    const existing = await prisma.articleLike.findUnique({
      where: { userId_articleId: { userId: uid, articleId } },
    });

    if (existing) {
      if (existing.type === type) {
        // Same type → remove (un-like / un-dislike)
        await prisma.articleLike.delete({ where: { id: existing.id } });
        // Update counts
        const counts = await getLikeCounts(articleId);
        successResponse(res, { ...counts, userReaction: null }, 'Reaction removed');
      } else {
        // Switch type
        await prisma.articleLike.update({ where: { id: existing.id }, data: { type } });
        const counts = await getLikeCounts(articleId);
        successResponse(res, { ...counts, userReaction: type }, 'Reaction updated');
      }
    } else {
      await prisma.articleLike.create({ data: { userId: uid, articleId, type } });
      const counts = await getLikeCounts(articleId);
      successResponse(res, { ...counts, userReaction: type }, type === 'LIKE' ? 'Liked' : 'Disliked');
    }
  } catch (e) { n(e); }
});

// ─── GET /articles/:id/comments — get comments (public) ──
r.get('/:id/comments', async (q: Request, res: Response, n: NextFunction) => {
  try {
    const comments = await prisma.articleComment.findMany({
      where: { articleId: q.params.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, role: true, avatarUrl: true } } },
    });
    successResponse(res, comments);
  } catch (e) { n(e); }
});

// ─── POST /articles/:id/comments — add comment (DOCTOR/ADMIN only) ──
r.post('/:id/comments', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    if (q.user!.role !== 'DOCTOR' && q.user!.role !== 'ADMIN') {
      errorResponse(res, 'Only doctors can comment on articles', 403); return;
    }
    const { content } = q.body;
    if (!content?.trim()) { errorResponse(res, 'Comment content is required', 400); return; }

    const comment = await prisma.articleComment.create({
      data: { userId: q.user!.id, articleId: q.params.id, content: content.trim() },
      include: { user: { select: { id: true, fullName: true, role: true, avatarUrl: true } } },
    });
    successResponse(res, comment, 'Comment added', 201);
  } catch (e) { n(e); }
});

// ─── DELETE /articles/:id/comments/:commentId — delete own comment ──
r.delete('/:id/comments/:commentId', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const comment = await prisma.articleComment.findUnique({ where: { id: q.params.commentId } });
    if (!comment) { errorResponse(res, 'Comment not found', 404); return; }
    if (comment.userId !== q.user!.id && q.user!.role !== 'ADMIN') {
      errorResponse(res, 'Not authorized', 403); return;
    }
    await prisma.articleComment.delete({ where: { id: q.params.commentId } });
    successResponse(res, null, 'Comment deleted');
  } catch (e) { n(e); }
});

// Helper: get like/dislike counts for an article
async function getLikeCounts(articleId: string) {
  const [likes, dislikes] = await Promise.all([
    prisma.articleLike.count({ where: { articleId, type: 'LIKE' } }),
    prisma.articleLike.count({ where: { articleId, type: 'DISLIKE' } }),
  ]);
  // Also update the denormalized likeCount on the article
  await prisma.article.update({ where: { id: articleId }, data: { likeCount: likes } }).catch(() => {});
  return { likes, dislikes };
}

// ─── GET /articles/:slug ─────────────────────────────
r.get('/:slug', optionalAuth, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: q.params.slug },
      include: {
        doctor: { select: { fullName: true, avatarUrl: true, specialization: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, fullName: true, role: true, avatarUrl: true } } },
        },
      },
    });
    if (!article) { errorResponse(res, 'Article not found', 404); return; }
    // Increment view count async (fire-and-forget)
    prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    // Get like/dislike counts and user's reaction
    const [likes, dislikes, userReaction] = await Promise.all([
      prisma.articleLike.count({ where: { articleId: article.id, type: 'LIKE' } }),
      prisma.articleLike.count({ where: { articleId: article.id, type: 'DISLIKE' } }),
      q.user ? prisma.articleLike.findUnique({ where: { userId_articleId: { userId: q.user.id, articleId: article.id } } }) : null,
    ]);
    const isBookmarked = q.user ? !!(await prisma.articleBookmark.findUnique({ where: { userId_articleId: { userId: q.user.id, articleId: article.id } } })) : false;
    successResponse(res, { ...article, likes, dislikes, userReaction: userReaction?.type || null, isBookmarked });
  } catch (e) { n(e); }
});

// ─── POST /articles — admin create ────────────────────
r.post('/', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
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
    successResponse(res, article, 'Article created', 201);
  } catch (e) { n(e); }
});

// ─── PUT /articles/:id — admin update ─────────────────
r.put('/:id', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
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
      if (q.body.status === 'DRAFT') data.publishedAt = null;
    }
    if (q.body.tags !== undefined) {
      data.tags = Array.isArray(q.body.tags) ? q.body.tags : (q.body.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const article = await prisma.article.update({ where: { id }, data });
    successResponse(res, article);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Article not found', 404); return; }
    n(e);
  }
});

// ─── DELETE /articles/:id — admin delete ──────────────
r.delete('/:id', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    await prisma.article.delete({ where: { id: q.params.id } });
    successResponse(res, null, 'Article deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Article not found', 404); return; }
    n(e);
  }
});

export default r;
