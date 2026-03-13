// ══════════════════════════════════════════════════════
// src/server/src/routes/community.routes.ts
// Community forum — posts, replies, likes, reports, polls
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import { cacheIncr } from '../config/redis';

const r = Router();

// Strip HTML tags to prevent stored XSS in community content
const stripHtml = (s: string): string => s.replace(/<[^>]*>/g, '').trim();
const MAX_CONTENT_LENGTH = 10000;
const MAX_REPORT_LENGTH = 2000;

// ─── Helpers ──────────────────────────────────────────

const requireModerator = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DOCTOR')) {
    res.status(403).json({ success: false, error: 'Moderator access required' });
    return;
  }
  next();
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
};

/** Strip author info from a post/reply when isAnonymous, unless viewer is ADMIN */
const sanitizeAuthor = (item: any, viewerRole?: string) => {
  if (item.isAnonymous && viewerRole !== 'ADMIN') {
    return { ...item, user: { fullName: 'Anonymous', avatarUrl: null, role: 'USER' } };
  }
  return item;
};

// ═══════════════════════════════════════════════════════
// PUBLIC (optionalAuth)
// ═══════════════════════════════════════════════════════

// ─── GET /posts — list posts ──────────────────────────
r.get('/posts', optionalAuth, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const take = Math.min(Number(q.query.limit) || 20, 50);
    const skip = Number(q.query.offset) || 0;
    const category = q.query.category as string | undefined;
    const search = q.query.search as string | undefined;
    const isAdmin = q.user?.role === 'ADMIN';

    const where: any = {};
    if (!isAdmin) where.isHidden = false;
    if (category) where.category = category;
    if (search) where.content = { contains: search, mode: 'insensitive' };

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        take,
        skip,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { fullName: true, avatarUrl: true, role: true } },
        },
      }),
      prisma.communityPost.count({ where }),
    ]);

    const sanitized = posts.map((p) => sanitizeAuthor(p, q.user?.role));

    successResponse(res, { posts: sanitized, total, take, skip });
  } catch (e) { n(e); }
});

// ─── GET /posts/:id — single post with replies ───────
r.get('/posts/:id', optionalAuth, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const isAdmin = q.user?.role === 'ADMIN';

    const post = await prisma.communityPost.findUnique({
      where: { id: q.params.id },
      include: {
        user: { select: { fullName: true, avatarUrl: true, role: true } },
        replies: {
          where: isAdmin ? {} : { isHidden: false },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { fullName: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    if (!post) { errorResponse(res, 'Post not found', 404); return; }
    if (post.isHidden && !isAdmin) { errorResponse(res, 'Post not found', 404); return; }

    const sanitizedPost = sanitizeAuthor(post, q.user?.role);
    sanitizedPost.replies = sanitizedPost.replies.map((r: any) => sanitizeAuthor(r, q.user?.role));

    successResponse(res, sanitizedPost);
  } catch (e) { n(e); }
});

// ─── GET /polls/active — latest active poll ───────────
r.get('/polls/active', optionalAuth, async (_q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const now = new Date();
    const poll = await prisma.communityPoll.findFirst({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        votes: { select: { optionId: true } },
      },
    });

    if (!poll) { successResponse(res, null, 'No active poll'); return; }

    // Aggregate vote counts per option
    const voteCounts: Record<string, number> = {};
    for (const v of poll.votes) {
      voteCounts[v.optionId] = (voteCounts[v.optionId] || 0) + 1;
    }

    const { votes: _v, ...pollData } = poll;
    successResponse(res, { ...pollData, voteCounts });
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// AUTHENTICATED
// ═══════════════════════════════════════════════════════

// ─── POST /posts — create post ────────────────────────
r.post('/posts', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;

    // Rate limit: max 10 posts per hour
    const attempts = await cacheIncr('community_post:' + userId, 3600);
    if (attempts > 10) { errorResponse(res, 'Too many posts. Please wait before posting again.', 429); return; }

    const { content, category, isAnonymous } = q.body;
    if (!content || !category) { errorResponse(res, 'Content and category are required'); return; }
    const safeContent = stripHtml(content);
    if (!safeContent) { errorResponse(res, 'Content is required'); return; }
    if (safeContent.length > MAX_CONTENT_LENGTH) { errorResponse(res, `Content must be under ${MAX_CONTENT_LENGTH} characters`); return; }

    const validCategories = ['periods', 'pcod', 'fertility', 'pregnancy', 'menopause', 'mental_health', 'ayurveda', 'hair_skin', 'ask_doctor'];
    if (!validCategories.includes(category)) { errorResponse(res, 'Invalid category'); return; }

    const post = await prisma.communityPost.create({
      data: {
        userId,
        content: safeContent,
        category,
        isAnonymous: !!isAnonymous,
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true, role: true } },
      },
    });

    successResponse(res, sanitizeAuthor(post, q.user!.role), 'Post created', 201);
  } catch (e) { n(e); }
});

// ─── POST /posts/:id/replies — reply to post ─────────
r.post('/posts/:id/replies', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const postId = q.params.id;

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }
    if (post.isHidden) { errorResponse(res, 'Cannot reply to a hidden post', 403); return; }

    const { content, isAnonymous } = q.body;
    if (!content) { errorResponse(res, 'Content is required'); return; }
    const safeReply = stripHtml(content);
    if (!safeReply) { errorResponse(res, 'Content is required'); return; }
    if (safeReply.length > MAX_CONTENT_LENGTH) { errorResponse(res, `Content must be under ${MAX_CONTENT_LENGTH} characters`); return; }

    const isDoctor = q.user!.role === 'DOCTOR';

    const [reply] = await prisma.$transaction([
      prisma.communityReply.create({
        data: {
          postId,
          userId,
          content: safeReply,
          isAnonymous: !!isAnonymous,
          isDoctor,
        },
        include: {
          user: { select: { fullName: true, avatarUrl: true, role: true } },
        },
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { replyCount: { increment: 1 } },
      }),
    ]);

    successResponse(res, sanitizeAuthor(reply, q.user!.role), 'Reply added', 201);
  } catch (e) { n(e); }
});

// ─── POST /posts/:id/like — toggle like on post ──────
r.post('/posts/:id/like', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const postId = q.params.id;

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }

    const existing = await prisma.communityLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.communityLike.delete({ where: { id: existing.id } }),
        prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      successResponse(res, { liked: false }, 'Like removed');
    } else {
      await prisma.$transaction([
        prisma.communityLike.create({ data: { userId, postId } }),
        prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
      ]);
      successResponse(res, { liked: true }, 'Post liked');
    }
  } catch (e) { n(e); }
});

// ─── POST /replies/:id/like — toggle like on reply ───
r.post('/replies/:id/like', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const replyId = q.params.id;

    const reply = await prisma.communityReply.findUnique({ where: { id: replyId } });
    if (!reply) { errorResponse(res, 'Reply not found', 404); return; }

    const existing = await prisma.communityLike.findUnique({
      where: { userId_replyId: { userId, replyId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.communityLike.delete({ where: { id: existing.id } }),
        prisma.communityReply.update({ where: { id: replyId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      successResponse(res, { liked: false }, 'Like removed');
    } else {
      await prisma.$transaction([
        prisma.communityLike.create({ data: { userId, replyId } }),
        prisma.communityReply.update({ where: { id: replyId }, data: { likeCount: { increment: 1 } } }),
      ]);
      successResponse(res, { liked: true }, 'Reply liked');
    }
  } catch (e) { n(e); }
});

// ─── POST /posts/:id/report — report a post ──────────
r.post('/posts/:id/report', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const postId = q.params.id;

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }

    const existing = await prisma.communityReport.findFirst({ where: { userId, postId } });
    if (existing) { errorResponse(res, 'You have already reported this post'); return; }

    const { reason, details } = q.body;
    if (!reason) { errorResponse(res, 'Reason is required'); return; }
    const safeReason = stripHtml(String(reason)).slice(0, MAX_REPORT_LENGTH);
    const safeDetails = details ? stripHtml(String(details)).slice(0, MAX_REPORT_LENGTH) : undefined;

    await prisma.$transaction([
      prisma.communityReport.create({ data: { userId, postId, reason: safeReason, details: safeDetails } }),
      prisma.communityPost.update({ where: { id: postId }, data: { reportCount: { increment: 1 } } }),
    ]);

    successResponse(res, null, 'Report submitted', 201);
  } catch (e) { n(e); }
});

// ─── POST /replies/:id/report — report a reply ───────
r.post('/replies/:id/report', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const replyId = q.params.id;

    const reply = await prisma.communityReply.findUnique({ where: { id: replyId } });
    if (!reply) { errorResponse(res, 'Reply not found', 404); return; }

    const existing = await prisma.communityReport.findFirst({ where: { userId, replyId } });
    if (existing) { errorResponse(res, 'You have already reported this reply'); return; }

    const { reason, details } = q.body;
    if (!reason) { errorResponse(res, 'Reason is required'); return; }
    const safeReason2 = stripHtml(String(reason)).slice(0, MAX_REPORT_LENGTH);
    const safeDetails2 = details ? stripHtml(String(details)).slice(0, MAX_REPORT_LENGTH) : undefined;

    await prisma.$transaction([
      prisma.communityReport.create({ data: { userId, replyId, reason: safeReason2, details: safeDetails2 } }),
      prisma.communityReply.update({ where: { id: replyId }, data: { reportCount: { increment: 1 } } }),
    ]);

    successResponse(res, null, 'Report submitted', 201);
  } catch (e) { n(e); }
});

// ─── POST /polls/:id/vote — vote on poll ─────────────
r.post('/polls/:id/vote', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const pollId = q.params.id;

    const poll = await prisma.communityPoll.findUnique({ where: { id: pollId } });
    if (!poll) { errorResponse(res, 'Poll not found', 404); return; }
    if (!poll.isActive) { errorResponse(res, 'Poll is no longer active'); return; }
    if (poll.expiresAt && poll.expiresAt < new Date()) { errorResponse(res, 'Poll has expired'); return; }

    const { optionId } = q.body;
    if (!optionId) { errorResponse(res, 'optionId is required'); return; }

    // Validate optionId exists in poll options
    const options = poll.options as any[];
    if (!options.some((o: any) => o.id === optionId)) { errorResponse(res, 'Invalid option'); return; }

    // Check if user already voted
    const existing = await prisma.communityPollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existing) { errorResponse(res, 'You have already voted on this poll'); return; }

    await prisma.$transaction([
      prisma.communityPollVote.create({ data: { pollId, userId, optionId } }),
      prisma.communityPoll.update({ where: { id: pollId }, data: { totalVotes: { increment: 1 } } }),
    ]);

    successResponse(res, null, 'Vote recorded', 201);
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// OWNER EDIT / DELETE (within 30 min)
// ═══════════════════════════════════════════════════════

const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ─── PATCH /posts/:id — edit own post ────────────────
r.patch('/posts/:id', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;

    // Rate limit: max 10 edits per hour
    const edits = await cacheIncr('community_edit:' + userId, 3600);
    if (edits > 10) { errorResponse(res, 'Too many edits. Please wait.', 429); return; }

    const post = await prisma.communityPost.findUnique({ where: { id: q.params.id } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }
    if (post.userId !== userId) { errorResponse(res, 'You can only edit your own posts', 403); return; }

    const elapsed = Date.now() - new Date(post.createdAt).getTime();
    if (elapsed > EDIT_WINDOW_MS) { errorResponse(res, 'Edit window expired (30 minutes)', 403); return; }

    const { content } = q.body;
    if (!content || !content.trim()) { errorResponse(res, 'Content is required'); return; }
    const safeEdit = stripHtml(content);
    if (!safeEdit) { errorResponse(res, 'Content is required'); return; }
    if (safeEdit.length > MAX_CONTENT_LENGTH) { errorResponse(res, `Content must be under ${MAX_CONTENT_LENGTH} characters`); return; }

    const updated = await prisma.communityPost.update({
      where: { id: q.params.id },
      data: { content: safeEdit, isEdited: true },
      include: { user: { select: { fullName: true, avatarUrl: true, role: true } } },
    });

    successResponse(res, sanitizeAuthor(updated, q.user!.role), 'Post updated');
  } catch (e) { n(e); }
});

// ─── DELETE /posts/:id/own — delete own post ─────────
r.delete('/posts/:id/own', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const post = await prisma.communityPost.findUnique({ where: { id: q.params.id } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }
    if (post.userId !== userId) { errorResponse(res, 'You can only delete your own posts', 403); return; }

    const elapsed = Date.now() - new Date(post.createdAt).getTime();
    if (elapsed > EDIT_WINDOW_MS) { errorResponse(res, 'Delete window expired (30 minutes)', 403); return; }

    await prisma.communityPost.delete({ where: { id: q.params.id } });
    successResponse(res, null, 'Post deleted');
  } catch (e) { n(e); }
});

// ─── PATCH /replies/:id — edit own reply ─────────────
r.patch('/replies/:id', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;

    // Rate limit: max 10 edits per hour (shared with post edits)
    const edits = await cacheIncr('community_edit:' + userId, 3600);
    if (edits > 10) { errorResponse(res, 'Too many edits. Please wait.', 429); return; }

    const reply = await prisma.communityReply.findUnique({ where: { id: q.params.id } });
    if (!reply) { errorResponse(res, 'Reply not found', 404); return; }
    if (reply.userId !== userId) { errorResponse(res, 'You can only edit your own replies', 403); return; }

    const elapsed = Date.now() - new Date(reply.createdAt).getTime();
    if (elapsed > EDIT_WINDOW_MS) { errorResponse(res, 'Edit window expired (30 minutes)', 403); return; }

    const { content } = q.body;
    if (!content || !content.trim()) { errorResponse(res, 'Content is required'); return; }
    const safeReplyEdit = stripHtml(content);
    if (!safeReplyEdit) { errorResponse(res, 'Content is required'); return; }
    if (safeReplyEdit.length > MAX_CONTENT_LENGTH) { errorResponse(res, `Content must be under ${MAX_CONTENT_LENGTH} characters`); return; }

    const updated = await prisma.communityReply.update({
      where: { id: q.params.id },
      data: { content: safeReplyEdit, isEdited: true },
      include: { user: { select: { fullName: true, avatarUrl: true, role: true } } },
    });

    successResponse(res, sanitizeAuthor(updated, q.user!.role), 'Reply updated');
  } catch (e) { n(e); }
});

// ─── DELETE /replies/:id/own — delete own reply ──────
r.delete('/replies/:id/own', authenticate, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const reply = await prisma.communityReply.findUnique({ where: { id: q.params.id } });
    if (!reply) { errorResponse(res, 'Reply not found', 404); return; }
    if (reply.userId !== userId) { errorResponse(res, 'You can only delete your own replies', 403); return; }

    const elapsed = Date.now() - new Date(reply.createdAt).getTime();
    if (elapsed > EDIT_WINDOW_MS) { errorResponse(res, 'Delete window expired (30 minutes)', 403); return; }

    await prisma.$transaction([
      prisma.communityReply.delete({ where: { id: q.params.id } }),
      prisma.communityPost.update({
        where: { id: reply.postId },
        data: { replyCount: { decrement: 1 } },
      }),
    ]);

    successResponse(res, null, 'Reply deleted');
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN / DOCTOR MODERATION
// ═══════════════════════════════════════════════════════

// ─── PATCH /posts/:id/hide — hide/unhide post ────────
r.patch('/posts/:id/hide', authenticate, requireModerator, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: q.params.id } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }

    const { hidden, reason } = q.body;
    const isHidden = hidden !== undefined ? !!hidden : !post.isHidden;

    const updated = await prisma.communityPost.update({
      where: { id: q.params.id },
      data: {
        isHidden,
        hiddenBy: isHidden ? q.user!.id : null,
        hiddenReason: isHidden ? (reason || null) : null,
      },
    });

    successResponse(res, updated, isHidden ? 'Post hidden' : 'Post unhidden');
  } catch (e) { n(e); }
});

// ─── PATCH /replies/:id/hide — hide/unhide reply ─────
r.patch('/replies/:id/hide', authenticate, requireModerator, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const reply = await prisma.communityReply.findUnique({ where: { id: q.params.id } });
    if (!reply) { errorResponse(res, 'Reply not found', 404); return; }

    const { hidden, reason } = q.body;
    const isHidden = hidden !== undefined ? !!hidden : !reply.isHidden;

    const updated = await prisma.communityReply.update({
      where: { id: q.params.id },
      data: {
        isHidden,
        hiddenBy: isHidden ? q.user!.id : null,
        hiddenReason: isHidden ? (reason || null) : null,
      },
    });

    successResponse(res, updated, isHidden ? 'Reply hidden' : 'Reply unhidden');
  } catch (e) { n(e); }
});

// ─── DELETE /posts/:id — hard delete (ADMIN only) ────
r.delete('/posts/:id', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: q.params.id } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }

    await prisma.communityPost.delete({ where: { id: q.params.id } });
    successResponse(res, null, 'Post deleted');
  } catch (e) { n(e); }
});

// ─── DELETE /replies/:id — hard delete (ADMIN only) ──
r.delete('/replies/:id', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const reply = await prisma.communityReply.findUnique({ where: { id: q.params.id } });
    if (!reply) { errorResponse(res, 'Reply not found', 404); return; }

    await prisma.$transaction([
      prisma.communityReply.delete({ where: { id: q.params.id } }),
      prisma.communityPost.update({
        where: { id: reply.postId },
        data: { replyCount: { decrement: 1 } },
      }),
    ]);

    successResponse(res, null, 'Reply deleted');
  } catch (e) { n(e); }
});

// ─── PATCH /posts/:id/pin — pin/unpin post (ADMIN) ───
r.patch('/posts/:id/pin', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: q.params.id } });
    if (!post) { errorResponse(res, 'Post not found', 404); return; }

    const updated = await prisma.communityPost.update({
      where: { id: q.params.id },
      data: { isPinned: !post.isPinned },
    });

    successResponse(res, updated, updated.isPinned ? 'Post pinned' : 'Post unpinned');
  } catch (e) { n(e); }
});

// ─── POST /polls — create poll (ADMIN or chief DOCTOR)
r.post('/polls', authenticate, requireModerator, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const { question, options, expiresAt, category } = q.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      errorResponse(res, 'Question and at least 2 options are required');
      return;
    }
    const safeQuestion = stripHtml(String(question)).slice(0, 500);
    if (!safeQuestion) { errorResponse(res, 'Question is required'); return; }
    const safeOptions = options.slice(0, 10).map((o: any) => stripHtml(String(o)).slice(0, 200)).filter(Boolean);
    if (safeOptions.length < 2) { errorResponse(res, 'At least 2 valid options are required'); return; }

    const poll = await prisma.communityPoll.create({
      data: {
        question: safeQuestion,
        options: safeOptions,
        category: category || 'general',
        createdBy: q.user!.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    successResponse(res, poll, 'Poll created', 201);
  } catch (e) { n(e); }
});

// ─── GET /reports — list reports (ADMIN only) ─────────
r.get('/reports', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const take = Math.min(Number(q.query.limit) || 20, 50);
    const skip = Number(q.query.offset) || 0;
    const status = q.query.status as string | undefined;

    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.communityReport.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          post: { select: { id: true, content: true, category: true, userId: true } },
          reply: { select: { id: true, content: true, postId: true, userId: true } },
        },
      }),
      prisma.communityReport.count({ where }),
    ]);

    successResponse(res, { reports, total, take, skip });
  } catch (e) { n(e); }
});

// ─── PATCH /reports/:id — update report status (ADMIN)
r.patch('/reports/:id', authenticate, requireAdmin, async (q: AuthRequest, res: Response, n: NextFunction) => {
  try {
    const report = await prisma.communityReport.findUnique({ where: { id: q.params.id } });
    if (!report) { errorResponse(res, 'Report not found', 404); return; }

    const { status } = q.body;
    const validStatuses = ['PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN'];
    if (!status || !validStatuses.includes(status)) { errorResponse(res, 'Invalid status'); return; }

    const updated = await prisma.communityReport.update({
      where: { id: q.params.id },
      data: {
        status,
        reviewedBy: q.user!.id,
        reviewedAt: new Date(),
      },
    });

    successResponse(res, updated, 'Report updated');
  } catch (e) { n(e); }
});

export default r;
