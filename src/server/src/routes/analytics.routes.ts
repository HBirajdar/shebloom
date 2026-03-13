// ══════════════════════════════════════════════════════
// Analytics Routes — Event Tracking, User Profiles, Leads, Funnels
// ══════════════════════════════════════════════════════
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// ═══════════════════════════════════════════════════════
// PUBLIC: Event Tracking (authenticated users)
// ═══════════════════════════════════════════════════════

// POST /track — Log a user event (fire-and-forget from frontend)
r.post('/track', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { event, category, label, value, metadata, sessionId, referrer } = req.body;
    if (!event || typeof event !== 'string') {
      return errorResponse(res, 'event is required', 400);
    }
    // Validate event name (prevent injection of arbitrary strings)
    const ALLOWED_EVENTS = [
      'page_view', 'paywall_viewed', 'paywall_dismissed',
      'checkout_started', 'checkout_completed', 'checkout_abandoned',
      'plan_selected', 'coupon_applied', 'coupon_failed',
      'feature_locked', 'upgrade_prompt_shown', 'upgrade_prompt_clicked',
      'subscription_page_viewed', 'trial_started',
      'product_viewed', 'product_added_to_cart', 'cart_viewed',
      'article_viewed', 'search_performed', 'feature_used',
      'appointment_started', 'appointment_abandoned',
      'session_start', 'session_end',
    ];
    if (!ALLOWED_EVENTS.includes(event)) {
      return errorResponse(res, 'Invalid event type', 400);
    }
    await prisma.userEvent.create({
      data: {
        userId: req.user?.id || null,
        sessionId: sessionId || null,
        event,
        category: category || null,
        label: label || null,
        value: value != null ? Number(value) : null,
        metadata: metadata || null,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        referrer: referrer || null,
      },
    });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[Analytics] Track error:', err.message);
    // Don't fail the user experience for tracking errors
    return res.json({ ok: true });
  }
});

// POST /track/batch — Log multiple events at once
r.post('/track/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return errorResponse(res, 'events array is required', 400);
    }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const ua = req.headers['user-agent'] || null;
    // Limit batch size
    const batch = events.slice(0, 50);
    await prisma.userEvent.createMany({
      data: batch.map((e: any) => ({
        userId: req.user?.id || null,
        sessionId: e.sessionId || null,
        event: e.event,
        category: e.category || null,
        label: e.label || null,
        value: e.value != null ? Number(e.value) : null,
        metadata: e.metadata || null,
        ipAddress: ip,
        userAgent: ua,
        referrer: e.referrer || null,
      })),
    });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[Analytics] Batch track error:', err.message);
    return res.json({ ok: true });
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: User Detail Profile (aggregated view)
// ═══════════════════════════════════════════════════════

r.get('/admin/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [user, orders, subscriptions, appointments, events, communityPosts] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          profile: true,
          _count: {
            select: {
              orders: true, appointments: true, moodLogs: true,
              symptomLogs: true, bbtLogs: true, articleBookmarks: true,
              articleLikes: true, communityPosts: true, communityReplies: true,
              productReviews: true, waterLogs: true, programEnrollments: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, orderNumber: true, totalAmount: true, orderStatus: true, createdAt: true },
      }),
      prisma.userSubscription.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { name: true, slug: true, interval: true } } },
      }),
      prisma.appointment.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, status: true, createdAt: true, scheduledAt: true },
      }),
      // Recent events for activity timeline
      prisma.userEvent.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { event: true, category: true, label: true, value: true, metadata: true, createdAt: true },
      }),
      prisma.communityPost.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, category: true, createdAt: true },
      }),
    ]);

    if (!user) return errorResponse(res, 'User not found', 404);

    // Aggregate spending
    const spending = await prisma.order.aggregate({
      where: { userId: id, orderStatus: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] } },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Engagement score: simple heuristic based on activity counts
    const c = user._count;
    const engagementScore = Math.min(100, (
      (c.moodLogs > 0 ? 15 : 0) +
      (c.symptomLogs > 0 ? 10 : 0) +
      (c.bbtLogs > 0 ? 10 : 0) +
      (c.waterLogs > 0 ? 10 : 0) +
      (c.orders > 0 ? 15 : 0) +
      (c.appointments > 0 ? 10 : 0) +
      (c.communityPosts > 0 ? 10 : 0) +
      (c.articleBookmarks > 0 ? 5 : 0) +
      (c.programEnrollments > 0 ? 10 : 0) +
      Math.min(5, events.length) // Recent activity
    ));

    return successResponse(res, {
      user: {
        id: user.id, fullName: user.fullName, email: user.email, phone: user.phone,
        avatarUrl: user.avatarUrl, role: user.role, authProvider: user.authProvider,
        isActive: user.isActive, isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
      },
      profile: user.profile,
      activityCounts: user._count,
      engagementScore,
      totalSpent: spending._sum.totalAmount || 0,
      totalOrders: spending._count || 0,
      recentOrders: orders,
      subscriptions,
      recentAppointments: appointments,
      recentEvents: events,
      recentPosts: communityPosts,
    });
  } catch (err: any) {
    console.error('[Analytics] User detail error:', err.message);
    return errorResponse(res, 'Failed to fetch user details', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Leads Board — Users who showed purchase intent
// ═══════════════════════════════════════════════════════

r.get('/admin/leads', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'all', page = '1', limit = '50' } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Lead types:
    // - paywall_viewed: Saw upgrade prompt but didn't pay
    // - checkout_abandoned: Started checkout but didn't finish
    // - trial_expiring: Trial ending within 3 days
    // - dormant_premium: Was premium, now expired/cancelled

    let leadEvents: string[] = [];
    let excludeEvents: string[] = [];

    switch (type) {
      case 'paywall':
        leadEvents = ['paywall_viewed', 'subscription_page_viewed', 'upgrade_prompt_shown'];
        excludeEvents = ['checkout_completed'];
        break;
      case 'checkout_abandoned':
        leadEvents = ['checkout_started'];
        excludeEvents = ['checkout_completed'];
        break;
      case 'feature_locked':
        leadEvents = ['feature_locked', 'upgrade_prompt_shown'];
        excludeEvents = ['checkout_completed'];
        break;
      default:
        leadEvents = ['paywall_viewed', 'subscription_page_viewed', 'checkout_started', 'feature_locked', 'upgrade_prompt_shown'];
        excludeEvents = ['checkout_completed'];
    }

    // Find users who triggered lead events but NOT the exclude events (in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const leadsRaw = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: {
        event: { in: leadEvents },
        userId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      skip,
      take,
    });

    // Get users who completed checkout (to exclude)
    const convertedUserIds = excludeEvents.length > 0 ? await prisma.userEvent.findMany({
      where: {
        event: { in: excludeEvents },
        userId: { in: leadsRaw.map(l => l.userId!).filter(Boolean) },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    }) : [];
    const convertedSet = new Set(convertedUserIds.map(c => c.userId));

    // Filter out converted users
    const unconvertedLeads = leadsRaw.filter(l => l.userId && !convertedSet.has(l.userId));

    // Fetch user details for leads
    const userIds = unconvertedLeads.map(l => l.userId!);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true, fullName: true, email: true, phone: true,
        createdAt: true, lastLoginAt: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, plan: { select: { name: true } } },
        },
      },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Get event breakdown per lead user
    const eventBreakdown = await prisma.userEvent.groupBy({
      by: ['userId', 'event'],
      where: {
        userId: { in: userIds },
        event: { in: leadEvents },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const breakdownMap = new Map<string, Record<string, number>>();
    for (const eb of eventBreakdown) {
      if (!eb.userId) continue;
      if (!breakdownMap.has(eb.userId)) breakdownMap.set(eb.userId, {});
      breakdownMap.get(eb.userId)![eb.event] = eb._count.id;
    }

    const leads = unconvertedLeads.map(l => {
      const user = userMap.get(l.userId!);
      const events = breakdownMap.get(l.userId!) || {};
      // Lead score: higher = more intent
      let score = 0;
      if (events['checkout_started']) score += 40;
      if (events['plan_selected']) score += 30;
      if (events['subscription_page_viewed']) score += 20;
      if (events['paywall_viewed']) score += 10 * Math.min(events['paywall_viewed'], 5);
      if (events['feature_locked']) score += 5 * Math.min(events['feature_locked'], 5);
      score = Math.min(100, score);

      return {
        userId: l.userId,
        user: user ? { fullName: user.fullName, email: user.email, phone: user.phone, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt } : null,
        currentSubscription: user?.subscriptions?.[0] || null,
        totalEvents: l._count.id,
        lastEventAt: l._max.createdAt,
        eventBreakdown: events,
        leadScore: score,
        leadType: events['checkout_started'] ? 'hot' : events['plan_selected'] || events['subscription_page_viewed'] ? 'warm' : 'cold',
      };
    });

    // Sort by score descending
    leads.sort((a, b) => b.leadScore - a.leadScore);

    // Total count
    const totalLeads = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: {
        event: { in: leadEvents },
        userId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    return successResponse(res, {
      leads,
      total: totalLeads.length,
      page: parseInt(page),
      limit: take,
    });
  } catch (err: any) {
    console.error('[Analytics] Leads error:', err.message);
    return errorResponse(res, 'Failed to fetch leads', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Conversion Funnel
// ═══════════════════════════════════════════════════════

r.get('/admin/funnel', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    // Funnel steps: page_view → subscription_page_viewed → plan_selected → checkout_started → checkout_completed
    const funnelEvents = [
      'subscription_page_viewed',
      'plan_selected',
      'checkout_started',
      'checkout_completed',
    ];

    const [totalUsers, ...funnelCounts] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      ...funnelEvents.map(event =>
        prisma.userEvent.groupBy({
          by: ['userId'],
          where: { event, createdAt: { gte: since }, userId: { not: null } },
        }).then(r => r.length)
      ),
    ]);

    // Feature lock events (shows demand for premium)
    const featureLockedCount = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: { event: 'feature_locked', createdAt: { gte: since }, userId: { not: null } },
    }).then(r => r.length);

    // Top locked features
    const topLockedFeatures = await prisma.userEvent.groupBy({
      by: ['label'],
      where: { event: 'feature_locked', createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const funnel = [
      { step: 'New Users', count: totalUsers, rate: 100 },
      { step: 'Viewed Pricing', count: funnelCounts[0], rate: totalUsers > 0 ? Math.round(funnelCounts[0] / totalUsers * 100) : 0 },
      { step: 'Selected Plan', count: funnelCounts[1], rate: totalUsers > 0 ? Math.round(funnelCounts[1] / totalUsers * 100) : 0 },
      { step: 'Started Checkout', count: funnelCounts[2], rate: totalUsers > 0 ? Math.round(funnelCounts[2] / totalUsers * 100) : 0 },
      { step: 'Completed Payment', count: funnelCounts[3], rate: totalUsers > 0 ? Math.round(funnelCounts[3] / totalUsers * 100) : 0 },
    ];

    // Step-to-step conversion
    for (let i = 1; i < funnel.length; i++) {
      (funnel[i] as any).stepConversion = funnel[i - 1].count > 0
        ? Math.round(funnel[i].count / funnel[i - 1].count * 100) : 0;
    }

    return successResponse(res, {
      funnel,
      featureLockedUsers: featureLockedCount,
      topLockedFeatures: topLockedFeatures.map(f => ({ feature: f.label, count: f._count.id })),
      period: `${days} days`,
    });
  } catch (err: any) {
    console.error('[Analytics] Funnel error:', err.message);
    return errorResponse(res, 'Failed to fetch funnel', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Enhanced Analytics (MRR, Churn, Retention, DAU/MAU)
// ═══════════════════════════════════════════════════════

r.get('/admin/metrics', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

    // ── Revenue Metrics ──
    const [activeSubs, monthlySubs, yearlySubs, lifetimeSubs] = await Promise.all([
      prisma.userSubscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { pricePaid: true, plan: { select: { interval: true, basePrice: true } } },
      }),
      prisma.userSubscription.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] }, plan: { interval: 'MONTHLY' } } }),
      prisma.userSubscription.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] }, plan: { interval: 'YEARLY' } } }),
      prisma.userSubscription.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] }, plan: { interval: 'LIFETIME' } } }),
    ]);

    // MRR = sum of monthly equivalent revenue
    let mrr = 0;
    for (const sub of activeSubs) {
      const price = sub.pricePaid || sub.plan.basePrice;
      if (sub.plan.interval === 'MONTHLY') mrr += price;
      else if (sub.plan.interval === 'YEARLY') mrr += price / 12;
      // Lifetime doesn't contribute to MRR
    }

    // Total revenue (all time)
    const totalRevenue = await prisma.userSubscription.aggregate({
      where: { status: { in: ['ACTIVE', 'TRIAL', 'CANCELLED', 'EXPIRED'] }, pricePaid: { gt: 0 } },
      _sum: { pricePaid: true },
    });

    // Revenue this month vs last month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [revenueThisMonth, revenueLastMonth] = await Promise.all([
      prisma.userSubscription.aggregate({
        where: { createdAt: { gte: thisMonthStart }, pricePaid: { gt: 0 } },
        _sum: { pricePaid: true },
      }),
      prisma.userSubscription.aggregate({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart }, pricePaid: { gt: 0 } },
        _sum: { pricePaid: true },
      }),
    ]);

    // ── Churn ──
    const cancelledThisMonth = await prisma.userSubscription.count({
      where: { status: 'CANCELLED', cancelledAt: { gte: thisMonthStart } },
    });
    const activeAtMonthStart = await prisma.userSubscription.count({
      where: { createdAt: { lt: thisMonthStart }, status: { in: ['ACTIVE', 'TRIAL', 'CANCELLED'] } },
    });
    const churnRate = activeAtMonthStart > 0 ? Math.round(cancelledThisMonth / activeAtMonthStart * 100 * 10) / 10 : 0;

    // ── Engagement (DAU / WAU / MAU) ──
    const [dauCount, wauCount, mauCount] = await Promise.all([
      prisma.userEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: today }, userId: { not: null } } }).then(r => r.length),
      prisma.userEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } } }).then(r => r.length),
      prisma.userEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } } }).then(r => r.length),
    ]);
    const stickiness = mauCount > 0 ? Math.round(dauCount / mauCount * 100) : 0;

    // ── Retention (Day 1, 7, 30) ──
    // Users who signed up 7-14 days ago and came back within 1/7 days
    const cohortStart = new Date(Date.now() - 14 * 86400000);
    const cohortEnd = new Date(Date.now() - 7 * 86400000);
    const cohortUsers = await prisma.user.findMany({
      where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
      select: { id: true, createdAt: true },
    });
    const cohortIds = cohortUsers.map(u => u.id);

    let day1Retained = 0, day7Retained = 0;
    if (cohortIds.length > 0) {
      // Day 1: users who had an event 1+ day after signup
      const day1Events = await prisma.userEvent.findMany({
        where: {
          userId: { in: cohortIds },
          createdAt: { gte: new Date(cohortStart.getTime() + 86400000) },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      day1Retained = day1Events.length;

      // Day 7: users who had an event 7+ days after signup
      const day7Events = await prisma.userEvent.findMany({
        where: {
          userId: { in: cohortIds },
          createdAt: { gte: new Date(cohortStart.getTime() + 7 * 86400000) },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      day7Retained = day7Events.length;
    }

    // ── Trial Conversion ──
    const [trialsStarted, trialsConverted] = await Promise.all([
      prisma.userSubscription.count({ where: { createdAt: { gte: sixtyDaysAgo }, status: { in: ['TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED'] } } }),
      prisma.userSubscription.count({
        where: {
          createdAt: { gte: sixtyDaysAgo },
          status: 'ACTIVE',
          // Has a previous trial status in events
        },
      }),
    ]);

    // ── Top Features Used ──
    const topFeatures = await prisma.userEvent.groupBy({
      by: ['label'],
      where: { event: 'feature_used', createdAt: { gte: thirtyDaysAgo }, label: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // ── Daily Active Users trend (last 14 days) ──
    const dauTrend: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = await prisma.userEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: dayStart, lt: dayEnd }, userId: { not: null } },
      }).then(r => r.length);
      dauTrend.push({ date: dayStart.toISOString().split('T')[0], count });
    }

    // ── New signups trend (last 14 days) ──
    const signupTrend: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = await prisma.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } });
      signupTrend.push({ date: dayStart.toISOString().split('T')[0], count });
    }

    return successResponse(res, {
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        totalRevenue: totalRevenue._sum.pricePaid || 0,
        revenueThisMonth: revenueThisMonth._sum.pricePaid || 0,
        revenueLastMonth: revenueLastMonth._sum.pricePaid || 0,
        revenueGrowth: (revenueLastMonth._sum.pricePaid || 0) > 0
          ? Math.round(((revenueThisMonth._sum.pricePaid || 0) - (revenueLastMonth._sum.pricePaid || 0)) / (revenueLastMonth._sum.pricePaid || 1) * 100)
          : 0,
      },
      subscriptions: {
        total: activeSubs.length,
        monthly: monthlySubs,
        yearly: yearlySubs,
        lifetime: lifetimeSubs,
        churnRate,
        cancelledThisMonth,
      },
      engagement: {
        dau: dauCount,
        wau: wauCount,
        mau: mauCount,
        stickiness,
        dauTrend,
        signupTrend,
      },
      retention: {
        cohortSize: cohortIds.length,
        day1: cohortIds.length > 0 ? Math.round(day1Retained / cohortIds.length * 100) : 0,
        day7: cohortIds.length > 0 ? Math.round(day7Retained / cohortIds.length * 100) : 0,
      },
      conversion: {
        trialsStarted,
        trialsConverted,
        trialConversionRate: trialsStarted > 0 ? Math.round(trialsConverted / trialsStarted * 100) : 0,
      },
      topFeatures: topFeatures.map(f => ({ feature: f.label, count: f._count.id })),
    });
  } catch (err: any) {
    console.error('[Analytics] Metrics error:', err.message);
    return errorResponse(res, 'Failed to fetch metrics', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Event Log (raw events with filters)
// ═══════════════════════════════════════════════════════

r.get('/admin/events', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { event, userId, category, days = '7', page = '1', limit = '100' } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    const where: any = { createdAt: { gte: since } };
    if (event) where.event = event;
    if (userId) where.userId = userId;
    if (category) where.category = category;

    const [events, total] = await Promise.all([
      prisma.userEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { fullName: true, email: true } } },
      }),
      prisma.userEvent.count({ where }),
    ]);

    return successResponse(res, { events, total, page: parseInt(page), limit: take });
  } catch (err: any) {
    console.error('[Analytics] Events error:', err.message);
    return errorResponse(res, 'Failed to fetch events', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Event Summary (aggregated counts by event type)
// ═══════════════════════════════════════════════════════

r.get('/admin/events/summary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    const summary = await prisma.userEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return successResponse(res, {
      summary: summary.map(s => ({ event: s.event, count: s._count.id })),
      period: `${days} days`,
    });
  } catch (err: any) {
    return errorResponse(res, 'Failed to fetch event summary', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Real-time Activity Feed (last N events, live-style)
// ═══════════════════════════════════════════════════════

r.get('/admin/live-feed', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '30', after } = req.query as any;
    const take = Math.min(parseInt(limit) || 30, 100);

    const where: any = {};
    // If "after" cursor provided, only fetch events newer than that timestamp
    if (after) where.createdAt = { gt: new Date(after) };

    const events = await prisma.userEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    });

    return successResponse(res, {
      events: events.map(e => ({
        id: e.id,
        event: e.event,
        category: e.category,
        label: e.label,
        value: e.value,
        metadata: e.metadata,
        userId: e.userId,
        user: e.user ? { id: e.user.id, fullName: e.user.fullName, email: e.user.email, avatarUrl: e.user.avatarUrl } : null,
        createdAt: e.createdAt,
      })),
      cursor: events.length > 0 ? events[0].createdAt.toISOString() : null,
    });
  } catch (err: any) {
    console.error('[Analytics] Live feed error:', err.message);
    return errorResponse(res, 'Failed to fetch live feed', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Churn Risk Scores (per-user risk assessment)
// ═══════════════════════════════════════════════════════

r.get('/admin/churn-risk', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '30', risk } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get all active/trial subscribers
    const subs = await prisma.userSubscription.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, lastLoginAt: true, createdAt: true } },
        plan: { select: { name: true, interval: true, basePrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const userIds = subs.map(s => s.userId);

    // Get event counts per user in last 14 days
    const recentEvents = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, createdAt: { gte: new Date(now - 14 * 86400000) } },
      _count: { id: true },
    });
    const eventMap = new Map(recentEvents.map(e => [e.userId, e._count.id]));

    // Get event counts per user in previous 14 days (for trend comparison)
    const prevEvents = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: new Date(now - 28 * 86400000), lt: new Date(now - 14 * 86400000) },
      },
      _count: { id: true },
    });
    const prevEventMap = new Map(prevEvents.map(e => [e.userId, e._count.id]));

    // Score each subscriber
    const scored = subs.map(sub => {
      let riskScore = 0;
      const reasons: string[] = [];

      // 1. Login recency (0-30 pts)
      const daysSinceLogin = sub.user.lastLoginAt
        ? Math.floor((now - new Date(sub.user.lastLoginAt).getTime()) / 86400000)
        : 999;
      if (daysSinceLogin > 14) { riskScore += 30; reasons.push(`No login in ${daysSinceLogin}d`); }
      else if (daysSinceLogin > 7) { riskScore += 20; reasons.push(`Last login ${daysSinceLogin}d ago`); }
      else if (daysSinceLogin > 3) { riskScore += 10; reasons.push(`Last login ${daysSinceLogin}d ago`); }

      // 2. Activity decline (0-25 pts)
      const recent = eventMap.get(sub.userId) || 0;
      const prev = prevEventMap.get(sub.userId) || 0;
      if (prev > 0 && recent === 0) { riskScore += 25; reasons.push('Activity dropped to zero'); }
      else if (prev > 0 && recent < prev * 0.3) { riskScore += 20; reasons.push(`Activity down ${Math.round((1 - recent / prev) * 100)}%`); }
      else if (prev > 0 && recent < prev * 0.6) { riskScore += 10; reasons.push(`Activity declining`); }
      else if (recent === 0 && prev === 0) { riskScore += 15; reasons.push('No tracked activity'); }

      // 3. Trial nearing end (0-15 pts)
      if (sub.status === 'TRIAL' && sub.trialEndDate) {
        const daysLeft = Math.floor((new Date(sub.trialEndDate).getTime() - now) / 86400000);
        if (daysLeft <= 1) { riskScore += 15; reasons.push('Trial ends tomorrow'); }
        else if (daysLeft <= 3) { riskScore += 10; reasons.push(`Trial ends in ${daysLeft}d`); }
      }

      // 4. Account age vs engagement (0-15 pts)
      const accountAgeDays = Math.floor((now - new Date(sub.user.createdAt).getTime()) / 86400000);
      if (accountAgeDays > 30 && recent < 3) { riskScore += 15; reasons.push('Old account, low engagement'); }
      else if (accountAgeDays > 14 && recent < 2) { riskScore += 10; reasons.push('Low engagement for age'); }

      // 5. Auto-renew off (0-15 pts)
      if (!sub.isAutoRenew) { riskScore += 15; reasons.push('Auto-renew disabled'); }

      riskScore = Math.min(100, riskScore);
      const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

      return {
        userId: sub.userId,
        user: sub.user,
        plan: sub.plan,
        subscriptionStatus: sub.status,
        periodEnd: sub.currentPeriodEnd,
        trialEnd: sub.trialEndDate,
        isAutoRenew: sub.isAutoRenew,
        riskScore,
        riskLevel,
        reasons,
        recentEvents: recent,
        prevEvents: prev,
        daysSinceLogin,
      };
    });

    // Filter by risk level if specified
    let filtered = scored;
    if (risk === 'high') filtered = scored.filter(s => s.riskLevel === 'high');
    else if (risk === 'medium') filtered = scored.filter(s => s.riskLevel === 'medium');
    else if (risk === 'low') filtered = scored.filter(s => s.riskLevel === 'low');

    // Sort by risk score descending
    filtered.sort((a, b) => b.riskScore - a.riskScore);

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + take);

    return successResponse(res, {
      users: paginated,
      total,
      summary: {
        high: scored.filter(s => s.riskLevel === 'high').length,
        medium: scored.filter(s => s.riskLevel === 'medium').length,
        low: scored.filter(s => s.riskLevel === 'low').length,
      },
      page: parseInt(page),
      limit: take,
    });
  } catch (err: any) {
    console.error('[Analytics] Churn risk error:', err.message);
    return errorResponse(res, 'Failed to fetch churn risk', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: User Segmentation (dynamic user segments)
// ═══════════════════════════════════════════════════════

r.get('/admin/segments', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      status, // active, inactive, new, premium, free
      minEvents, maxEvents,
      lastLoginDays, // "7" = not logged in 7+ days
      hasEvent, // specific event name
      minSpend, maxSpend,
      goal, // periods, fertility, pregnancy, wellness
      role,
      page = '1', limit = '50',
    } = req.query as any;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const now = Date.now();

    const where: any = {};

    // Role filter
    if (role) where.role = role;

    // Status filters
    if (status === 'active') {
      where.lastLoginAt = { gte: new Date(now - 7 * 86400000) };
    } else if (status === 'inactive') {
      where.OR = [
        { lastLoginAt: { lt: new Date(now - 14 * 86400000) } },
        { lastLoginAt: null },
      ];
    } else if (status === 'new') {
      where.createdAt = { gte: new Date(now - 7 * 86400000) };
    }

    // Login recency
    if (lastLoginDays) {
      where.OR = [
        { lastLoginAt: { lt: new Date(now - parseInt(lastLoginDays) * 86400000) } },
        { lastLoginAt: null },
      ];
    }

    // Goal filter (from profile)
    if (goal) {
      where.profile = { primaryGoal: goal };
    }

    // Premium/free filter
    if (status === 'premium') {
      where.subscriptions = { some: { status: { in: ['ACTIVE', 'TRIAL'] } } };
    } else if (status === 'free') {
      where.subscriptions = { none: { status: { in: ['ACTIVE', 'TRIAL'] } } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: { primaryGoal: true } },
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL'] } },
            take: 1,
            select: { status: true, plan: { select: { name: true } } },
          },
          _count: { select: { orders: true, events: true, appointments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Post-filter by event count if needed
    let result = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      isActive: u.isActive,
      goal: u.profile?.primaryGoal || null,
      subscription: u.subscriptions[0] || null,
      eventCount: u._count.events,
      orderCount: u._count.orders,
      appointmentCount: u._count.appointments,
    }));

    if (minEvents) result = result.filter(u => u.eventCount >= parseInt(minEvents));
    if (maxEvents) result = result.filter(u => u.eventCount <= parseInt(maxEvents));

    // Get spending if spend filter active
    if (minSpend || maxSpend) {
      const userIds = result.map(u => u.id);
      const spending = await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, orderStatus: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] } },
        _sum: { totalAmount: true },
      });
      const spendMap = new Map(spending.map(s => [s.userId, s._sum.totalAmount || 0]));
      if (minSpend) result = result.filter(u => (spendMap.get(u.id) || 0) >= parseFloat(minSpend));
      if (maxSpend) result = result.filter(u => (spendMap.get(u.id) || 0) <= parseFloat(maxSpend));
    }

    return successResponse(res, { users: result, total, page: parseInt(page), limit: take });
  } catch (err: any) {
    console.error('[Analytics] Segments error:', err.message);
    return errorResponse(res, 'Failed to fetch segments', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Smart Alerts (threshold-based alerts)
// ═══════════════════════════════════════════════════════

r.get('/admin/alerts', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const now = Date.now();
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(now - 7 * 86400000);
    const lastWeek = new Date(now - 14 * 86400000);
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const alerts: { type: string; severity: 'critical' | 'warning' | 'info' | 'success'; title: string; detail: string; value?: number }[] = [];

    // 1. Hot leads today
    const hotLeadsToday = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: { event: { in: ['checkout_started', 'plan_selected'] }, createdAt: { gte: today }, userId: { not: null } },
    });
    if (hotLeadsToday.length > 0) {
      alerts.push({ type: 'leads', severity: 'success', title: `${hotLeadsToday.length} hot lead${hotLeadsToday.length > 1 ? 's' : ''} today`, detail: 'Users started checkout or selected a plan', value: hotLeadsToday.length });
    }

    // 2. Checkout abandonment spike
    const abandonedToday = await prisma.userEvent.count({ where: { event: 'checkout_abandoned', createdAt: { gte: today } } });
    const abandonedYesterday = await prisma.userEvent.count({ where: { event: 'checkout_abandoned', createdAt: { gte: yesterday, lt: today } } });
    if (abandonedToday > abandonedYesterday * 1.5 && abandonedToday > 2) {
      alerts.push({ type: 'checkout', severity: 'warning', title: `Checkout abandonments spiked (${abandonedToday} today)`, detail: `Up from ${abandonedYesterday} yesterday (+${abandonedYesterday > 0 ? Math.round((abandonedToday / abandonedYesterday - 1) * 100) : 100}%)`, value: abandonedToday });
    }

    // 3. Signups trend
    const signupsThisWeek = await prisma.user.count({ where: { createdAt: { gte: thisWeek } } });
    const signupsLastWeek = await prisma.user.count({ where: { createdAt: { gte: lastWeek, lt: thisWeek } } });
    if (signupsLastWeek > 0 && signupsThisWeek < signupsLastWeek * 0.6) {
      alerts.push({ type: 'signups', severity: 'warning', title: `Signups down ${Math.round((1 - signupsThisWeek / signupsLastWeek) * 100)}% this week`, detail: `${signupsThisWeek} this week vs ${signupsLastWeek} last week`, value: signupsThisWeek });
    } else if (signupsThisWeek > signupsLastWeek * 1.5 && signupsThisWeek > 5) {
      alerts.push({ type: 'signups', severity: 'success', title: `Signups surging (+${Math.round((signupsThisWeek / signupsLastWeek - 1) * 100)}%)`, detail: `${signupsThisWeek} this week vs ${signupsLastWeek} last week`, value: signupsThisWeek });
    }

    // 4. Trials expiring soon (within 48h)
    const expiringTrials = await prisma.userSubscription.count({
      where: {
        status: 'TRIAL',
        trialEndDate: { gte: new Date(), lte: new Date(now + 48 * 3600000) },
      },
    });
    if (expiringTrials > 0) {
      alerts.push({ type: 'trials', severity: 'warning', title: `${expiringTrials} trial${expiringTrials > 1 ? 's' : ''} expiring within 48h`, detail: 'These users may churn if not converted', value: expiringTrials });
    }

    // 5. Payment failures
    const failedPayments = await prisma.userSubscription.count({
      where: { status: 'PAST_DUE', updatedAt: { gte: thisWeek } },
    });
    if (failedPayments > 0) {
      alerts.push({ type: 'payments', severity: 'critical', title: `${failedPayments} payment failure${failedPayments > 1 ? 's' : ''} this week`, detail: 'Subscriptions at risk — follow up immediately', value: failedPayments });
    }

    // 6. Feature lock events (demand signal)
    const featureLocksToday = await prisma.userEvent.count({ where: { event: 'feature_locked', createdAt: { gte: today } } });
    if (featureLocksToday > 5) {
      alerts.push({ type: 'features', severity: 'info', title: `${featureLocksToday} users hit premium locks today`, detail: 'High demand for premium features — potential conversions', value: featureLocksToday });
    }

    // 7. Revenue milestone
    const revenueThisMonth = await prisma.userSubscription.aggregate({
      where: { createdAt: { gte: thisMonthStart }, pricePaid: { gt: 0 } },
      _sum: { pricePaid: true },
    });
    const rev = revenueThisMonth._sum.pricePaid || 0;
    if (rev > 0) {
      alerts.push({ type: 'revenue', severity: 'info', title: `₹${rev.toLocaleString('en-IN')} revenue this month`, detail: `From subscription payments since ${thisMonthStart.toLocaleDateString()}`, value: rev });
    }

    // 8. Inactive premium users (paid but not using)
    const inactivePremium = await prisma.userSubscription.count({
      where: {
        status: 'ACTIVE',
        user: {
          OR: [
            { lastLoginAt: { lt: new Date(now - 7 * 86400000) } },
            { lastLoginAt: null },
          ],
        },
      },
    });
    if (inactivePremium > 0) {
      alerts.push({ type: 'engagement', severity: 'warning', title: `${inactivePremium} premium user${inactivePremium > 1 ? 's' : ''} inactive 7+ days`, detail: 'Paying users who stopped engaging — high churn risk', value: inactivePremium });
    }

    // Sort: critical first, then warning, success, info
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, success: 2, info: 3 };
    alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

    return successResponse(res, { alerts, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Analytics] Alerts error:', err.message);
    return errorResponse(res, 'Failed to generate alerts', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Export Data (CSV generation)
// ═══════════════════════════════════════════════════════

r.get('/admin/export/:type', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const { days = '30' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    let csv = '';
    let filename = '';

    switch (type) {
      case 'leads': {
        const events = await prisma.userEvent.groupBy({
          by: ['userId'],
          where: {
            event: { in: ['paywall_viewed', 'subscription_page_viewed', 'checkout_started', 'feature_locked', 'upgrade_prompt_shown'] },
            userId: { not: null },
            createdAt: { gte: since },
          },
          _count: { id: true },
          _max: { createdAt: true },
        });
        const userIds = events.map(e => e.userId!).filter(Boolean);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        csv = 'Name,Email,Phone,Events,Last Activity,Joined\n';
        for (const e of events) {
          const u = userMap.get(e.userId!);
          if (!u) continue;
          csv += `"${u.fullName || ''}","${u.email || ''}","${u.phone || ''}",${e._count.id},"${e._max.createdAt?.toISOString() || ''}","${u.createdAt.toISOString()}"\n`;
        }
        filename = `vedaclue-leads-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'users': {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            profile: { select: { primaryGoal: true } },
            _count: { select: { orders: true, events: true, appointments: true } },
          },
        });
        csv = 'Name,Email,Phone,Role,Goal,Active,Events,Orders,Appointments,Last Login,Joined\n';
        for (const u of users) {
          csv += `"${u.fullName || ''}","${u.email || ''}","${u.phone || ''}","${u.role}","${u.profile?.primaryGoal || ''}",${u.isActive},${u._count.events},${u._count.orders},${u._count.appointments},"${u.lastLoginAt?.toISOString() || ''}","${u.createdAt.toISOString()}"\n`;
        }
        filename = `vedaclue-users-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'events': {
        const events = await prisma.userEvent.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 10000,
          include: { user: { select: { fullName: true, email: true } } },
        });
        csv = 'Event,Category,Label,Value,User,Email,Timestamp\n';
        for (const e of events) {
          csv += `"${e.event}","${e.category || ''}","${e.label || ''}",${e.value || ''},"${e.user?.fullName || ''}","${e.user?.email || ''}","${e.createdAt.toISOString()}"\n`;
        }
        filename = `vedaclue-events-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'revenue': {
        const subs = await prisma.userSubscription.findMany({
          where: { pricePaid: { gt: 0 } },
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true, email: true } },
            plan: { select: { name: true, interval: true } },
          },
        });
        csv = 'User,Email,Plan,Interval,Amount,Status,Date\n';
        for (const s of subs) {
          csv += `"${s.user.fullName || ''}","${s.user.email || ''}","${s.plan.name}","${s.plan.interval}",${s.pricePaid},"${s.status}","${s.createdAt.toISOString()}"\n`;
        }
        filename = `vedaclue-revenue-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      default:
        return errorResponse(res, 'Invalid export type. Use: leads, users, events, revenue', 400);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: any) {
    console.error('[Analytics] Export error:', err.message);
    return errorResponse(res, 'Failed to export data', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Revenue Forecasting
// ═══════════════════════════════════════════════════════

r.get('/admin/forecast', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // Get monthly revenue for last 6 months
    const monthlyRevenue: { month: string; revenue: number; subs: number; cancellations: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [rev, newSubs, cancelled] = await Promise.all([
        prisma.userSubscription.aggregate({
          where: { createdAt: { gte: monthStart, lt: monthEnd }, pricePaid: { gt: 0 } },
          _sum: { pricePaid: true },
        }),
        prisma.userSubscription.count({
          where: { createdAt: { gte: monthStart, lt: monthEnd } },
        }),
        prisma.userSubscription.count({
          where: { status: 'CANCELLED', cancelledAt: { gte: monthStart, lt: monthEnd } },
        }),
      ]);

      monthlyRevenue.push({
        month: monthStart.toISOString().slice(0, 7),
        revenue: rev._sum.pricePaid || 0,
        subs: newSubs,
        cancellations: cancelled,
      });
    }

    // Current MRR
    const activeSubs = await prisma.userSubscription.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: { select: { interval: true, basePrice: true } } },
    });
    let currentMRR = 0;
    for (const sub of activeSubs) {
      const price = sub.pricePaid || sub.plan.basePrice;
      if (sub.plan.interval === 'MONTHLY') currentMRR += price;
      else if (sub.plan.interval === 'YEARLY') currentMRR += price / 12;
    }

    // Simple linear regression on MRR growth
    const revenueValues = monthlyRevenue.map(m => m.revenue);
    const n = revenueValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += revenueValues[i]; sumXY += i * revenueValues[i]; sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n;

    // Forecast next 3 months
    const forecast: { month: string; predicted: number; lower: number; upper: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const predicted = Math.max(0, Math.round(intercept + slope * (n - 1 + i)));
      const variance = Math.round(predicted * 0.2); // 20% confidence band
      forecast.push({
        month: futureMonth.toISOString().slice(0, 7),
        predicted,
        lower: Math.max(0, predicted - variance),
        upper: predicted + variance,
      });
    }

    // Churn rate trend
    const churnTrend = monthlyRevenue.map(m => ({
      month: m.month,
      rate: m.subs > 0 ? Math.round(m.cancellations / (m.subs + m.cancellations) * 100) : 0,
    }));

    // Trial conversion projection
    const activeTrials = await prisma.userSubscription.count({ where: { status: 'TRIAL' } });
    const historicalTrialConversion = await prisma.userSubscription.count({
      where: { status: 'ACTIVE', trialEndDate: { not: null } },
    });
    const totalTrials = await prisma.userSubscription.count({
      where: { trialEndDate: { not: null } },
    });
    const trialConvRate = totalTrials > 0 ? Math.round(historicalTrialConversion / totalTrials * 100) : 0;

    return successResponse(res, {
      historical: monthlyRevenue,
      forecast,
      currentMRR: Math.round(currentMRR),
      projectedMRR: forecast[0] ? Math.round(currentMRR + slope) : currentMRR,
      growth: {
        slope: Math.round(slope),
        direction: slope > 0 ? 'growing' : slope < 0 ? 'declining' : 'flat',
      },
      churnTrend,
      trialProjection: {
        activeTrials,
        expectedConversions: Math.round(activeTrials * trialConvRate / 100),
        historicalConvRate: trialConvRate,
      },
    });
  } catch (err: any) {
    console.error('[Analytics] Forecast error:', err.message);
    return errorResponse(res, 'Failed to generate forecast', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Cohort Comparison (compare signup cohorts)
// ═══════════════════════════════════════════════════════

r.get('/admin/cohorts', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { months = '4' } = req.query as any;
    const numMonths = Math.min(parseInt(months) || 4, 12);
    const now = new Date();

    const cohorts: any[] = [];

    for (let i = numMonths - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      // Users who signed up this month
      const users = await prisma.user.findMany({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        select: { id: true, createdAt: true },
      });
      const userIds = users.map(u => u.id);
      const cohortSize = userIds.length;

      if (cohortSize === 0) {
        cohorts.push({ month: monthLabel, monthKey: monthStart.toISOString().slice(0, 7), size: 0, retention: {}, conversions: 0, conversionRate: 0, avgEvents: 0, revenue: 0 });
        continue;
      }

      // Retention: check which users came back in week 1, 2, 3, 4
      const retention: Record<string, number> = {};
      for (let w = 1; w <= 4; w++) {
        const weekStart = new Date(monthStart.getTime() + w * 7 * 86400000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        if (weekStart > now) break;

        const retained = await prisma.userEvent.findMany({
          where: { userId: { in: userIds }, createdAt: { gte: weekStart, lt: weekEnd } },
          select: { userId: true },
          distinct: ['userId'],
        });
        retention[`week${w}`] = Math.round(retained.length / cohortSize * 100);
      }

      // Conversions (subscribed)
      const conversions = await prisma.userSubscription.count({
        where: { userId: { in: userIds }, status: { in: ['ACTIVE', 'TRIAL'] } },
      });

      // Average events per user
      const totalEvents = await prisma.userEvent.count({
        where: { userId: { in: userIds } },
      });

      // Revenue from this cohort
      const revenue = await prisma.userSubscription.aggregate({
        where: { userId: { in: userIds }, pricePaid: { gt: 0 } },
        _sum: { pricePaid: true },
      });

      cohorts.push({
        month: monthLabel,
        monthKey: monthStart.toISOString().slice(0, 7),
        size: cohortSize,
        retention,
        conversions,
        conversionRate: Math.round(conversions / cohortSize * 100),
        avgEvents: Math.round(totalEvents / cohortSize),
        revenue: revenue._sum.pricePaid || 0,
      });
    }

    return successResponse(res, { cohorts });
  } catch (err: any) {
    console.error('[Analytics] Cohorts error:', err.message);
    return errorResponse(res, 'Failed to fetch cohorts', 500);
  }
});

export default r;
