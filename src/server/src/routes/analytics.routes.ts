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

export default r;
