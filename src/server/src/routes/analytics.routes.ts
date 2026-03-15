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
      // Tier 2 events
      'nps_submitted', 'referral_click', 'share_clicked',
      'streak_milestone', 'ab_variant_shown',
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
      'nps_submitted', 'referral_click', 'share_clicked',
      'streak_milestone', 'ab_variant_shown',
    ];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const ua = req.headers['user-agent'] || null;
    // Limit batch size, filter invalid events, and cap metadata size
    const batch = events.slice(0, 50).filter((e: any) => e.event && ALLOWED_EVENTS.includes(e.event)).map((e: any) => {
      // Cap metadata to prevent oversized JSON storage
      if (e.metadata && JSON.stringify(e.metadata).length > 2048) e.metadata = null;
      if (e.label && typeof e.label === 'string') e.label = e.label.slice(0, 255);
      return e;
    });
    if (batch.length === 0) {
      return res.json({ ok: true });
    }
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

// ═══════════════════════════════════════════════════════
// ADMIN: User Journey / Path Analysis
// ═══════════════════════════════════════════════════════

r.get('/admin/journeys', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '7' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    // Get sessions: group events by sessionId, ordered by time
    const sessions = await prisma.userEvent.findMany({
      where: { createdAt: { gte: since }, sessionId: { not: null }, event: 'page_view' },
      orderBy: { createdAt: 'asc' },
      select: { sessionId: true, label: true, userId: true, createdAt: true },
    });

    // Build path sequences per session
    const sessionPaths = new Map<string, string[]>();
    for (const e of sessions) {
      if (!e.sessionId || !e.label) continue;
      if (!sessionPaths.has(e.sessionId)) sessionPaths.set(e.sessionId, []);
      const path = sessionPaths.get(e.sessionId)!;
      // Avoid consecutive duplicates
      if (path[path.length - 1] !== e.label) path.push(e.label);
    }

    // Count page-to-page transitions
    const transitions: Record<string, Record<string, number>> = {};
    const pageVisits: Record<string, number> = {};
    const entryPages: Record<string, number> = {};
    const exitPages: Record<string, number> = {};

    for (const [, path] of sessionPaths) {
      if (path.length === 0) continue;
      entryPages[path[0]] = (entryPages[path[0]] || 0) + 1;
      exitPages[path[path.length - 1]] = (exitPages[path[path.length - 1]] || 0) + 1;

      for (let i = 0; i < path.length; i++) {
        pageVisits[path[i]] = (pageVisits[path[i]] || 0) + 1;
        if (i < path.length - 1) {
          if (!transitions[path[i]]) transitions[path[i]] = {};
          transitions[path[i]][path[i + 1]] = (transitions[path[i]][path[i + 1]] || 0) + 1;
        }
      }
    }

    // Top flows (most common 3-step paths)
    const flowCounts: Record<string, number> = {};
    for (const [, path] of sessionPaths) {
      for (let i = 0; i <= path.length - 3; i++) {
        const flow = path.slice(i, i + 3).join(' → ');
        flowCounts[flow] = (flowCounts[flow] || 0) + 1;
      }
    }
    const topFlows = Object.entries(flowCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([flow, count]) => ({ flow, count }));

    // Top transitions
    const topTransitions: { from: string; to: string; count: number }[] = [];
    for (const [from, tos] of Object.entries(transitions)) {
      for (const [to, count] of Object.entries(tos)) {
        topTransitions.push({ from, to, count });
      }
    }
    topTransitions.sort((a, b) => b.count - a.count);

    // Page popularity
    const pages = Object.entries(pageVisits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([page, visits]) => ({ page, visits, entries: entryPages[page] || 0, exits: exitPages[page] || 0 }));

    return successResponse(res, {
      totalSessions: sessionPaths.size,
      avgPathLength: sessionPaths.size > 0 ? Math.round([...sessionPaths.values()].reduce((s, p) => s + p.length, 0) / sessionPaths.size * 10) / 10 : 0,
      pages,
      topFlows,
      topTransitions: topTransitions.slice(0, 20),
      period: `${days} days`,
    });
  } catch (err: any) {
    console.error('[Analytics] Journeys error:', err.message);
    return errorResponse(res, 'Failed to fetch journeys', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Geo Analytics (users by location)
// ═══════════════════════════════════════════════════════

r.get('/admin/geo', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get user locations from profiles
    const profiles = await prisma.userProfile.findMany({
      where: { locationLatitude: { not: null } },
      select: { locationLatitude: true, locationLongitude: true, userId: true },
    });

    // Get referrer domains for geo-like source data
    const referrers = await prisma.userEvent.groupBy({
      by: ['referrer'],
      where: { referrer: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // Get user-agent breakdown (mobile vs desktop)
    const recentEvents = await prisma.userEvent.findMany({
      where: { userAgent: { not: null }, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { userAgent: true, userId: true },
      distinct: ['userId'],
    });

    let mobile = 0, desktop = 0, tablet = 0;
    for (const e of recentEvents) {
      const ua = (e.userAgent || '').toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) mobile++;
      else if (ua.includes('ipad') || ua.includes('tablet')) tablet++;
      else desktop++;
    }

    // IP-based city grouping (approximate from first IP octet patterns)
    const ipEvents = await prisma.userEvent.findMany({
      where: { ipAddress: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { ipAddress: true, userId: true },
      distinct: ['userId'],
    });

    // Group by IP prefix (rough geo proxy)
    const ipPrefixes: Record<string, number> = {};
    for (const e of ipEvents) {
      if (!e.ipAddress) continue;
      const prefix = e.ipAddress.split('.').slice(0, 2).join('.');
      ipPrefixes[prefix] = (ipPrefixes[prefix] || 0) + 1;
    }
    const topRegions = Object.entries(ipPrefixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([prefix, count]) => ({ region: prefix, users: count }));

    return successResponse(res, {
      totalWithLocation: profiles.length,
      devices: { mobile, desktop, tablet, total: mobile + desktop + tablet },
      topReferrers: referrers.map(r => ({ source: r.referrer, count: r._count.id })),
      topRegions,
    });
  } catch (err: any) {
    console.error('[Analytics] Geo error:', err.message);
    return errorResponse(res, 'Failed to fetch geo data', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Referral / Traffic Sources
// ═══════════════════════════════════════════════════════

r.get('/admin/referrals', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    // Referrer breakdown from page_view events
    const referrers = await prisma.userEvent.groupBy({
      by: ['referrer'],
      where: { event: 'page_view', referrer: { not: null }, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30,
    });

    // Categorize referrers
    const sources: Record<string, number> = { direct: 0, google: 0, social: 0, other: 0 };
    const detailedSources: { source: string; domain: string; visits: number; category: string }[] = [];

    for (const r of referrers) {
      const ref = r.referrer || '';
      let domain = '';
      try { domain = new URL(ref).hostname; } catch { domain = ref; }
      let category = 'other';
      if (!ref || ref === '') { category = 'direct'; sources.direct += r._count.id; }
      else if (domain.includes('google')) { category = 'google'; sources.google += r._count.id; }
      else if (domain.includes('facebook') || domain.includes('instagram') || domain.includes('twitter') || domain.includes('linkedin') || domain.includes('youtube') || domain.includes('whatsapp') || domain.includes('t.co')) {
        category = 'social'; sources.social += r._count.id;
      } else { sources.other += r._count.id; }

      detailedSources.push({ source: ref, domain, visits: r._count.id, category });
    }

    // UTM tracking from page_view metadata
    const utmEvents = await prisma.userEvent.findMany({
      where: {
        event: 'page_view',
        createdAt: { gte: since },
        metadata: { not: null },
      },
      select: { metadata: true },
      take: 5000,
    });

    const utmSources: Record<string, number> = {};
    const utmMediums: Record<string, number> = {};
    const utmCampaigns: Record<string, number> = {};
    for (const e of utmEvents) {
      const m = e.metadata as any;
      if (m?.utm_source) utmSources[m.utm_source] = (utmSources[m.utm_source] || 0) + 1;
      if (m?.utm_medium) utmMediums[m.utm_medium] = (utmMediums[m.utm_medium] || 0) + 1;
      if (m?.utm_campaign) utmCampaigns[m.utm_campaign] = (utmCampaigns[m.utm_campaign] || 0) + 1;
    }

    // Conversion by source: users who came from each referrer and then subscribed
    const totalPageViews = await prisma.userEvent.count({
      where: { event: 'page_view', createdAt: { gte: since } },
    });
    const uniqueVisitors = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: { event: 'page_view', createdAt: { gte: since }, userId: { not: null } },
    });

    return successResponse(res, {
      sources,
      detailedSources: detailedSources.slice(0, 20),
      utm: {
        sources: Object.entries(utmSources).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, count: v })),
        mediums: Object.entries(utmMediums).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, count: v })),
        campaigns: Object.entries(utmCampaigns).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, count: v })),
      },
      totalPageViews,
      uniqueVisitors: uniqueVisitors.length,
      period: `${days} days`,
    });
  } catch (err: any) {
    console.error('[Analytics] Referrals error:', err.message);
    return errorResponse(res, 'Failed to fetch referrals', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Engagement Streaks
// ═══════════════════════════════════════════════════════

r.get('/admin/streaks', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { minStreak = '3', page = '1', limit = '30' } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get all active users with events
    const activeUsers = await prisma.userEvent.groupBy({
      by: ['userId'],
      where: { userId: { not: null }, createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
      _count: { id: true },
    });

    const userIds = activeUsers.map(u => u.userId!).filter(Boolean);

    // For each user, get distinct active days
    const userStreaks: { userId: string; currentStreak: number; longestStreak: number; totalActiveDays: number; lastActiveDate: string }[] = [];

    // Batch fetch: get all events for these users, grouped by day
    for (const userId of userIds) {
      const events = await prisma.userEvent.findMany({
        where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      // Get unique days
      const days = new Set(events.map(e => e.createdAt.toISOString().split('T')[0]));
      const sortedDays = [...days].sort().reverse();
      const totalActiveDays = sortedDays.length;

      if (totalActiveDays === 0) continue;

      // Calculate current streak (from today backwards)
      const today = new Date().toISOString().split('T')[0];
      let currentStreak = 0;
      let checkDate = new Date(today);
      while (days.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      }
      // If today not in set, check from yesterday
      if (currentStreak === 0) {
        checkDate = new Date(Date.now() - 86400000);
        while (days.has(checkDate.toISOString().split('T')[0])) {
          currentStreak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        }
      }

      // Calculate longest streak
      let longest = 0, current = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        if (prev.getTime() - curr.getTime() === 86400000) {
          current++;
        } else {
          longest = Math.max(longest, current);
          current = 1;
        }
      }
      longest = Math.max(longest, current);

      if (currentStreak >= parseInt(minStreak) || longest >= parseInt(minStreak)) {
        userStreaks.push({
          userId,
          currentStreak,
          longestStreak: longest,
          totalActiveDays,
          lastActiveDate: sortedDays[0],
        });
      }
    }

    // Sort by current streak descending
    userStreaks.sort((a, b) => b.currentStreak - a.currentStreak);
    const total = userStreaks.length;
    const paginated = userStreaks.slice(skip, skip + take);

    // Fetch user details
    const paginatedIds = paginated.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: paginatedIds } },
      select: { id: true, fullName: true, email: true, phone: true, lastLoginAt: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Summary stats
    const streakDist = { '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
    for (const s of userStreaks) {
      if (s.currentStreak >= 30) streakDist['30+']++;
      else if (s.currentStreak >= 15) streakDist['15-30']++;
      else if (s.currentStreak >= 8) streakDist['8-14']++;
      else if (s.currentStreak >= 4) streakDist['4-7']++;
      else streakDist['1-3']++;
    }

    return successResponse(res, {
      streaks: paginated.map(s => ({ ...s, user: userMap.get(s.userId) || null })),
      total,
      distribution: streakDist,
      avgStreak: total > 0 ? Math.round(userStreaks.reduce((s, u) => s + u.currentStreak, 0) / total * 10) / 10 : 0,
      page: parseInt(page),
      limit: take,
    });
  } catch (err: any) {
    console.error('[Analytics] Streaks error:', err.message);
    return errorResponse(res, 'Failed to fetch streaks', 500);
  }
});

// ═══════════════════════════════════════════════════════
// NPS: Submit Survey (user-facing)
// ═══════════════════════════════════════════════════════

r.post('/nps', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { score, feedback, page } = req.body;
    if (score == null || score < 0 || score > 10) {
      return errorResponse(res, 'Score must be 0-10', 400);
    }
    // Rate limit: 1 NPS per user per 30 days
    const recent = await prisma.npsSurvey.findFirst({
      where: { userId: req.user!.id, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    });
    if (recent) return errorResponse(res, 'Already submitted recently', 429);

    await prisma.npsSurvey.create({
      data: { userId: req.user!.id, score, feedback: feedback || null, page: page || null },
    });

    return successResponse(res, { message: 'Thank you for your feedback!' });
  } catch (err: any) {
    return errorResponse(res, 'Failed to submit NPS', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: NPS Results
// ═══════════════════════════════════════════════════════

r.get('/admin/nps', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '90' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    const surveys = await prisma.npsSurvey.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });

    const total = surveys.length;
    if (total === 0) {
      return successResponse(res, { nps: 0, total: 0, promoters: 0, passives: 0, detractors: 0, surveys: [], trend: [] });
    }

    let promoters = 0, passives = 0, detractors = 0;
    for (const s of surveys) {
      if (s.score >= 9) promoters++;
      else if (s.score >= 7) passives++;
      else detractors++;
    }
    const nps = Math.round((promoters / total - detractors / total) * 100);

    // Score distribution
    const distribution: Record<number, number> = {};
    for (let i = 0; i <= 10; i++) distribution[i] = 0;
    for (const s of surveys) distribution[s.score]++;

    // Monthly NPS trend
    const months = new Map<string, { p: number; d: number; t: number }>();
    for (const s of surveys) {
      const key = s.createdAt.toISOString().slice(0, 7);
      if (!months.has(key)) months.set(key, { p: 0, d: 0, t: 0 });
      const m = months.get(key)!;
      m.t++;
      if (s.score >= 9) m.p++;
      else if (s.score < 7) m.d++;
    }
    const trend = [...months.entries()].map(([month, v]) => ({
      month,
      nps: Math.round((v.p / v.t - v.d / v.t) * 100),
      responses: v.t,
    }));

    return successResponse(res, {
      nps,
      total,
      promoters,
      passives,
      detractors,
      distribution,
      trend,
      recentFeedback: surveys.filter(s => s.feedback).slice(0, 20).map(s => ({
        score: s.score, feedback: s.feedback, user: s.user.fullName || s.user.email, createdAt: s.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[Analytics] NPS error:', err.message);
    return errorResponse(res, 'Failed to fetch NPS', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Push Campaign Manager
// ═══════════════════════════════════════════════════════

r.get('/admin/campaigns', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await prisma.pushCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return successResponse(res, { campaigns });
  } catch (err: any) {
    return errorResponse(res, 'Failed to fetch campaigns', 500);
  }
});

r.post('/admin/campaigns', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, segment } = req.body;
    if (!title || !body || !segment) return errorResponse(res, 'Title, body, segment required', 400);

    const campaign = await prisma.pushCampaign.create({
      data: { title, body, segment, createdBy: req.user?.id },
    });
    res.status(201);
    return successResponse(res, { campaign });
  } catch (err: any) {
    return errorResponse(res, 'Failed to create campaign', 500);
  }
});

r.post('/admin/campaigns/:id/send', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.pushCampaign.findUnique({ where: { id } });
    if (!campaign) return errorResponse(res, 'Campaign not found', 404);

    // Build user filter based on segment
    const where: any = { fcmToken: { not: null } };
    switch (campaign.segment) {
      case 'premium': where.subscriptions = { some: { status: { in: ['ACTIVE', 'TRIAL'] } } }; break;
      case 'free': where.subscriptions = { none: { status: { in: ['ACTIVE', 'TRIAL'] } } }; break;
      case 'inactive_7d':
        where.OR = [
          { lastLoginAt: { lt: new Date(Date.now() - 7 * 86400000) } },
          { lastLoginAt: null },
        ]; break;
      case 'inactive_30d':
        where.OR = [
          { lastLoginAt: { lt: new Date(Date.now() - 30 * 86400000) } },
          { lastLoginAt: null },
        ]; break;
      case 'new_7d': where.createdAt = { gte: new Date(Date.now() - 7 * 86400000) }; break;
      // "all" = no extra filter
    }

    const users = await prisma.user.findMany({ where, select: { id: true, fcmToken: true } });

    // Create notifications in DB for all matched users
    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map(u => ({
          userId: u.id,
          title: campaign.title,
          body: campaign.body,
          type: 'campaign',
          data: { campaignId: id },
        })),
      });
    }

    // Update campaign status
    await prisma.pushCampaign.update({
      where: { id },
      data: { status: 'sent', sentCount: users.length, sentAt: new Date() },
    });

    return successResponse(res, { sentTo: users.length });
  } catch (err: any) {
    console.error('[Analytics] Campaign send error:', err.message);
    return errorResponse(res, 'Failed to send campaign', 500);
  }
});

r.delete('/admin/campaigns/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.pushCampaign.delete({ where: { id: req.params.id } });
    return successResponse(res, { message: 'Deleted' });
  } catch (err: any) {
    return errorResponse(res, 'Failed to delete campaign', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Lifetime Value (LTV) Analysis
// ═══════════════════════════════════════════════════════

r.get('/admin/ltv', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get all users with their total spending
    const orderSpending = await prisma.order.groupBy({
      by: ['userId'],
      where: { orderStatus: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const subSpending = await prisma.userSubscription.groupBy({
      by: ['userId'],
      where: { pricePaid: { gt: 0 } },
      _sum: { pricePaid: true },
      _count: { id: true },
    });

    // Merge spending
    const userLTV = new Map<string, number>();
    for (const o of orderSpending) {
      userLTV.set(o.userId, (userLTV.get(o.userId) || 0) + (o._sum.totalAmount || 0));
    }
    for (const s of subSpending) {
      userLTV.set(s.userId, (userLTV.get(s.userId) || 0) + (s._sum.pricePaid || 0));
    }

    const totalUsers = await prisma.user.count();
    const ltvValues = [...userLTV.values()].sort((a, b) => b - a);
    const totalLTV = ltvValues.reduce((s, v) => s + v, 0);
    const avgLTV = totalUsers > 0 ? Math.round(totalLTV / totalUsers) : 0;
    const payingUsers = ltvValues.length;
    const avgPayingLTV = payingUsers > 0 ? Math.round(totalLTV / payingUsers) : 0;

    // LTV distribution buckets
    const buckets = { '₹0': 0, '₹1-100': 0, '₹101-500': 0, '₹501-1000': 0, '₹1001-5000': 0, '₹5000+': 0 };
    const allUsers = totalUsers - payingUsers;
    buckets['₹0'] = allUsers;
    for (const v of ltvValues) {
      if (v <= 100) buckets['₹1-100']++;
      else if (v <= 500) buckets['₹101-500']++;
      else if (v <= 1000) buckets['₹501-1000']++;
      else if (v <= 5000) buckets['₹1001-5000']++;
      else buckets['₹5000+']++;
    }

    // Top 20 highest LTV users
    const topUserIds = [...userLTV.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id);
    const topUsers = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, fullName: true, email: true, createdAt: true },
    });
    const topUserMap = new Map(topUsers.map(u => [u.id, u]));

    // LTV by cohort (signup month)
    const allUsersWithDate = await prisma.user.findMany({
      select: { id: true, createdAt: true },
    });
    const cohortLTV: Record<string, { total: number; users: number }> = {};
    for (const u of allUsersWithDate) {
      const month = u.createdAt.toISOString().slice(0, 7);
      if (!cohortLTV[month]) cohortLTV[month] = { total: 0, users: 0 };
      cohortLTV[month].users++;
      cohortLTV[month].total += userLTV.get(u.id) || 0;
    }

    const cohortData = Object.entries(cohortLTV)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, v]) => ({ month, avgLTV: v.users > 0 ? Math.round(v.total / v.users) : 0, users: v.users, totalRevenue: Math.round(v.total) }));

    // Projected annual LTV
    const avgMonthlyRev = totalLTV / Math.max(1, Object.keys(cohortLTV).length);
    const projectedAnnualLTV = Math.round(avgMonthlyRev * 12 / Math.max(1, totalUsers));

    return successResponse(res, {
      summary: {
        totalUsers,
        payingUsers,
        avgLTV,
        avgPayingLTV,
        medianLTV: ltvValues.length > 0 ? ltvValues[Math.floor(ltvValues.length / 2)] : 0,
        totalRevenue: Math.round(totalLTV),
        projectedAnnualLTV,
      },
      distribution: buckets,
      topUsers: topUserIds.map(id => ({
        user: topUserMap.get(id),
        ltv: Math.round(userLTV.get(id) || 0),
      })),
      cohortLTV: cohortData,
    });
  } catch (err: any) {
    console.error('[Analytics] LTV error:', err.message);
    return errorResponse(res, 'Failed to fetch LTV', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: A/B Test Tracking
// ═══════════════════════════════════════════════════════

r.get('/admin/ab-tests', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query as any;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    // Get all A/B variant events
    const variantEvents = await prisma.userEvent.findMany({
      where: { event: 'ab_variant_shown', createdAt: { gte: since } },
      select: { userId: true, label: true, metadata: true, createdAt: true },
    });

    // Group by test name → variant → metrics
    const tests = new Map<string, Map<string, { shown: Set<string>; converted: Set<string> }>>();

    for (const e of variantEvents) {
      const m = e.metadata as any;
      const testName = m?.test || e.label || 'unknown';
      const variant = m?.variant || 'control';

      if (!tests.has(testName)) tests.set(testName, new Map());
      const test = tests.get(testName)!;
      if (!test.has(variant)) test.set(variant, { shown: new Set(), converted: new Set() });
      if (e.userId) test.get(variant)!.shown.add(e.userId);
    }

    // Check conversions (checkout_completed) for users in each variant
    const allVariantUserIds = new Set<string>();
    for (const [, variants] of tests) {
      for (const [, data] of variants) {
        for (const uid of data.shown) allVariantUserIds.add(uid);
      }
    }

    if (allVariantUserIds.size > 0) {
      const conversions = await prisma.userEvent.findMany({
        where: {
          event: 'checkout_completed',
          userId: { in: [...allVariantUserIds] },
          createdAt: { gte: since },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      const convertedSet = new Set(conversions.map(c => c.userId));

      for (const [, variants] of tests) {
        for (const [, data] of variants) {
          for (const uid of data.shown) {
            if (convertedSet.has(uid)) data.converted.add(uid);
          }
        }
      }
    }

    // Format results
    const results = [...tests.entries()].map(([name, variants]) => ({
      test: name,
      variants: [...variants.entries()].map(([variant, data]) => ({
        variant,
        shown: data.shown.size,
        converted: data.converted.size,
        conversionRate: data.shown.size > 0 ? Math.round(data.converted.size / data.shown.size * 100 * 10) / 10 : 0,
      })),
    }));

    return successResponse(res, { tests: results, period: `${days} days` });
  } catch (err: any) {
    console.error('[Analytics] AB tests error:', err.message);
    return errorResponse(res, 'Failed to fetch AB tests', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Tier 3 — Anomaly Detection
// ═══════════════════════════════════════════════════════

r.get('/admin/anomalies', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const errorEvents = ['checkout_abandoned', 'coupon_failed', 'feature_locked'];

    // Aggregate daily counts at DB level (not loading all rows into memory)
    const dailyGroups = await prisma.userEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    });

    // We need per-day counts, so use raw query for efficiency
    const dailyRaw: Array<{ day: string; cnt: number }> = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, COUNT(*)::int as cnt
      FROM "user_events"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day`;

    const dailyErrorRaw: Array<{ day: string; cnt: number }> = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, COUNT(*)::int as cnt
      FROM "user_events"
      WHERE "createdAt" >= ${thirtyDaysAgo} AND "event" IN ('checkout_abandoned', 'coupon_failed', 'feature_locked')
      GROUP BY DATE("createdAt")
      ORDER BY day`;

    const dailyCounts: Record<string, number> = {};
    for (const r of dailyRaw) dailyCounts[String(r.day).slice(0, 10)] = Number(r.cnt);
    const dailyErrorCounts: Record<string, number> = {};
    for (const r of dailyErrorRaw) dailyErrorCounts[String(r.day).slice(0, 10)] = Number(r.cnt);

    const allDays = Object.keys(dailyCounts).sort();

    // Use first 23 days as baseline (exclude detection window)
    const baselineDays = allDays.filter(d => new Date(d) < sevenDaysAgo);
    const baselineTotal = baselineDays.reduce((s, d) => s + (dailyCounts[d] || 0), 0);
    const avgDaily = baselineDays.length > 0 ? baselineTotal / baselineDays.length : 0;

    const baselineErrorTotal = baselineDays.reduce((s, d) => s + (dailyErrorCounts[d] || 0), 0);
    const avgDailyErrors = baselineDays.length > 0 ? baselineErrorTotal / baselineDays.length : 0;

    // Generate all 7 days in detection window (including zero-event days)
    const anomalies: Array<{
      type: 'spike' | 'drop' | 'error_spike';
      metric: string;
      date: string;
      value: number;
      expected: number;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const day = d.toISOString().slice(0, 10);
      const count = dailyCounts[day] || 0;

      // Spike detection: >2x baseline average
      if (avgDaily > 0 && count > 2 * avgDaily) {
        const ratio = count / avgDaily;
        anomalies.push({
          type: 'spike', metric: 'total_events', date: day,
          value: count, expected: Math.round(avgDaily),
          severity: ratio > 4 ? 'high' : ratio > 3 ? 'medium' : 'low',
        });
      }

      // Drop detection: <0.5x baseline average
      if (avgDaily > 0 && count < 0.5 * avgDaily) {
        const ratio = count / avgDaily;
        anomalies.push({
          type: 'drop', metric: 'total_events', date: day,
          value: count, expected: Math.round(avgDaily),
          severity: ratio < 0.1 ? 'high' : ratio < 0.25 ? 'medium' : 'low',
        });
      }

      // Error spike: error events >50% above baseline average
      const errCount = dailyErrorCounts[day] || 0;
      if (avgDailyErrors > 0 && errCount > 1.5 * avgDailyErrors) {
        const ratio = errCount / avgDailyErrors;
        anomalies.push({
          type: 'error_spike', metric: 'error_events', date: day,
          value: errCount, expected: Math.round(avgDailyErrors),
          severity: ratio > 3 ? 'high' : ratio > 2 ? 'medium' : 'low',
        });
      }
    }

    return successResponse(res, { anomalies });
  } catch (err: any) {
    console.error('[Analytics] Anomaly detection error:', err.message);
    return errorResponse(res, 'Failed to detect anomalies', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Tier 3 — Health Score
// ═══════════════════════════════════════════════════════

r.get('/admin/health-score', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // --- Engagement rate (DAU/MAU) using DB aggregation ---
    const mauRaw: Array<{ uid: string }> = await prisma.$queryRaw`
      SELECT DISTINCT "userId" as uid FROM "user_events"
      WHERE "createdAt" >= ${thirtyDaysAgo} AND "userId" IS NOT NULL`;
    const mau = mauRaw.length;

    const dauRaw: Array<{ day: string; cnt: number }> = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, COUNT(DISTINCT "userId")::int as cnt
      FROM "user_events"
      WHERE "createdAt" >= ${sevenDaysAgo} AND "userId" IS NOT NULL
      GROUP BY DATE("createdAt")`;
    const dauValues = dauRaw.map(r => Number(r.cnt));
    const avgDau = dauValues.length > 0 ? dauValues.reduce((a, b) => a + b, 0) / dauValues.length : 0;
    const engagementRatio = mau > 0 ? (avgDau / mau) * 100 : 0;
    let engagementScore = 0;
    if (engagementRatio > 20) engagementScore = 30;
    else if (engagementRatio > 10) engagementScore = 20;
    else if (engagementRatio > 5) engagementScore = 10;

    // --- Growth rate ---
    const [newUsersThisWeek, newUsersLastWeek] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);
    let growthScore = 10;
    if (newUsersLastWeek > 0) {
      const growthRatio = newUsersThisWeek / newUsersLastWeek;
      if (growthRatio > 1.1) growthScore = 20;
      else if (growthRatio >= 0.9) growthScore = 10;
      else growthScore = 5;
    } else if (newUsersThisWeek > 0) {
      growthScore = 20;
    }

    // --- Retention rate (DB-level distinct user sets) ---
    const activeThisWeekRaw: Array<{ uid: string }> = await prisma.$queryRaw`SELECT DISTINCT "userId" as uid FROM "user_events" WHERE "createdAt" >= ${sevenDaysAgo} AND "userId" IS NOT NULL`;
    const activeLastWeekRaw: Array<{ uid: string }> = await prisma.$queryRaw`SELECT DISTINCT "userId" as uid FROM "user_events" WHERE "createdAt" >= ${fourteenDaysAgo} AND "createdAt" < ${sevenDaysAgo} AND "userId" IS NOT NULL`;
    const activeLastWeekSet = new Set(activeLastWeekRaw.map(r => r.uid));
    let retained = 0;
    for (const r of activeThisWeekRaw) {
      if (activeLastWeekSet.has(r.uid)) retained++;
    }
    const retentionRatio = activeLastWeekSet.size > 0 ? retained / activeLastWeekSet.size : 0;
    const retentionScore = Math.min(Math.round(retentionRatio * 20), 20);

    // --- Revenue health ---
    const [revenueThisMonth, revenueLastMonth] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: thisMonthStart }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
    ]);
    const revThis = revenueThisMonth._sum.totalAmount || 0;
    const revLast = revenueLastMonth._sum.totalAmount || 0;
    let revenueScore = 0;
    if (revLast > 0) {
      const revRatio = revThis / revLast;
      if (revRatio > 1.1) revenueScore = 15;
      else if (revRatio >= 0.9) revenueScore = 10;
      else revenueScore = 5;
    } else if (revThis > 0) {
      revenueScore = 15;
    }

    // --- NPS score (aggregate instead of loading all rows) ---
    const npsAgg = await prisma.userEvent.aggregate({
      where: { event: 'nps_submitted', createdAt: { gte: thirtyDaysAgo } },
      _avg: { value: true },
      _count: true,
    });
    let npsScore = 5;
    if (npsAgg._count > 0 && npsAgg._avg.value != null) {
      if (npsAgg._avg.value > 50) npsScore = 15;
      else if (npsAgg._avg.value > 0) npsScore = 10;
      else npsScore = 5;
    }

    const totalScore = engagementScore + growthScore + retentionScore + revenueScore + npsScore;

    // Trend: compare this week's avg DAU vs last week's avg DAU
    const lastWeekDauRaw: Array<{ day: string; cnt: number }> = await prisma.$queryRaw`
      SELECT DATE("createdAt") as day, COUNT(DISTINCT "userId")::int as cnt
      FROM "user_events"
      WHERE "createdAt" >= ${fourteenDaysAgo} AND "createdAt" < ${sevenDaysAgo} AND "userId" IS NOT NULL
      GROUP BY DATE("createdAt")`;
    const lastWeekDauValues = lastWeekDauRaw.map(r => Number(r.cnt));
    const avgDauLastWeek = lastWeekDauValues.length > 0 ? lastWeekDauValues.reduce((a, b) => a + b, 0) / lastWeekDauValues.length : 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (avgDauLastWeek > 0) {
      const trendRatio = avgDau / avgDauLastWeek;
      if (trendRatio > 1.1) trend = 'improving';
      else if (trendRatio < 0.9) trend = 'declining';
    }

    return successResponse(res, {
      score: totalScore,
      breakdown: {
        engagement: engagementScore,
        growth: growthScore,
        retention: retentionScore,
        revenue: revenueScore,
        nps: npsScore,
      },
      trend,
    });
  } catch (err: any) {
    console.error('[Analytics] Health score error:', err.message);
    return errorResponse(res, 'Failed to compute health score', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Tier 3 — Session Timelines
// ═══════════════════════════════════════════════════════

r.get('/admin/sessions/:userId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate userId format (CUID)
    if (!userId || !/^c[a-z0-9]{24,}$/i.test(userId)) {
      return errorResponse(res, 'Invalid userId format', 400);
    }

    // Limit to last 90 days to prevent unbounded queries
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const events = await prisma.userEvent.findMany({
      where: { userId, sessionId: { not: null }, createdAt: { gte: ninetyDaysAgo } },
      select: { sessionId: true, event: true, label: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5000, // safety limit
    });

    if (events.length === 0) {
      return successResponse(res, { sessions: [] });
    }

    // Group by sessionId
    const sessionMap = new Map<string, Array<{ event: string; label: string | null; timestamp: Date }>>();
    for (const e of events) {
      const sid = e.sessionId!;
      if (!sessionMap.has(sid)) sessionMap.set(sid, []);
      sessionMap.get(sid)!.push({ event: e.event, label: e.label, timestamp: e.createdAt });
    }

    // Build session objects
    const sessions = [...sessionMap.entries()].map(([sessionId, evts]) => {
      // Sort events within session by time ascending
      evts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const startedAt = evts[0].timestamp;
      const endedAt = evts[evts.length - 1].timestamp;
      const duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000); // seconds
      return {
        sessionId,
        startedAt,
        endedAt,
        duration,
        events: evts.map(e => ({ event: e.event, label: e.label, timestamp: e.timestamp })),
      };
    });

    // Sort sessions by most recent first, limit to 20
    sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const limited = sessions.slice(0, 20);

    return successResponse(res, { sessions: limited });
  } catch (err: any) {
    console.error('[Analytics] Session timelines error:', err.message);
    return errorResponse(res, 'Failed to fetch session timelines', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Tier 3 — Predictive Churn
// ═══════════════════════════════════════════════════════

r.get('/admin/predictive-churn', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    // DB-level aggregation: per-user stats in a single query
    const userStats: Array<{
      userId: string;
      total_events: number;
      last_active: Date;
      last30_events: number;
      prior30_events: number;
      active_days_30: number;
    }> = await prisma.$queryRaw`
      SELECT
        "userId",
        COUNT(*)::int as total_events,
        MAX("createdAt") as last_active,
        COUNT(*) FILTER (WHERE "createdAt" >= ${thirtyDaysAgo})::int as last30_events,
        COUNT(*) FILTER (WHERE "createdAt" >= ${sixtyDaysAgo} AND "createdAt" < ${thirtyDaysAgo})::int as prior30_events,
        COUNT(DISTINCT DATE("createdAt")) FILTER (WHERE "createdAt" >= ${thirtyDaysAgo})::int as active_days_30
      FROM "user_events"
      WHERE "createdAt" >= ${ninetyDaysAgo} AND "userId" IS NOT NULL
      GROUP BY "userId"`;

    if (userStats.length === 0) {
      return successResponse(res, { healthy: 0, atRisk: 0, churning: 0, topChurning: [] });
    }

    const activeUserIds = userStats.map(s => s.userId);

    // Get user details and subscription status in parallel
    const [users, subscriptions] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: activeUserIds } },
        select: { id: true, fullName: true, email: true },
      }),
      prisma.userSubscription.findMany({
        where: { userId: { in: activeUserIds } },
        select: { userId: true, status: true },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const subMap = new Map<string, string>();
    for (const s of subscriptions) {
      if (!subMap.has(s.userId)) subMap.set(s.userId, s.status);
    }

    // Compute churn score for each user
    const scoredUsers: Array<{
      userId: string;
      name: string;
      email: string | null;
      score: number;
      lastActive: Date;
      signals: string[];
    }> = [];

    for (const stat of userStats) {
      const user = userMap.get(stat.userId);
      if (!user) continue;

      const lastActive = new Date(stat.last_active);
      const daysSinceLastLogin = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);
      const signals: string[] = [];
      let score = 0;

      // Signal 1: Days since last login (0-30 points)
      if (daysSinceLastLogin > 60) { score += 30; signals.push('inactive_60d+'); }
      else if (daysSinceLastLogin > 30) { score += 20; signals.push('inactive_30d+'); }
      else if (daysSinceLastLogin > 14) { score += 10; signals.push('inactive_14d+'); }
      else if (daysSinceLastLogin > 7) { score += 5; signals.push('low_recent_activity'); }

      // Signal 2: Activity trend (0-25 points)
      const last30 = Number(stat.last30_events);
      const prior30 = Number(stat.prior30_events);
      if (prior30 > 0) {
        const trendRatio = last30 / prior30;
        if (trendRatio < 0.25) { score += 25; signals.push('activity_declining_sharply'); }
        else if (trendRatio < 0.5) { score += 15; signals.push('activity_declining'); }
        else if (trendRatio < 0.75) { score += 8; signals.push('activity_slightly_declining'); }
      } else if (last30 === 0) {
        score += 25; signals.push('no_recent_activity');
      }

      // Signal 3: Subscription status (0-20 points)
      const subStatus = subMap.get(stat.userId);
      if (!subStatus) { score += 10; signals.push('no_subscription'); }
      else if (subStatus === 'CANCELLED' || subStatus === 'EXPIRED') { score += 20; signals.push('subscription_cancelled'); }
      else if (subStatus === 'PAST_DUE') { score += 15; signals.push('payment_past_due'); }

      // Signal 4: Low engagement in 90-day window (0-15 points)
      const totalEvents = Number(stat.total_events);
      if (totalEvents < 5) { score += 15; signals.push('very_low_engagement'); }
      else if (totalEvents < 20) { score += 8; signals.push('low_engagement'); }

      // Signal 5: Consistency — distinct active days in last 30 (0-10 points)
      const activeDays30 = Number(stat.active_days_30);
      if (activeDays30 <= 1) { score += 10; signals.push('inconsistent_usage'); }
      else if (activeDays30 <= 3) { score += 5; signals.push('sporadic_usage'); }

      score = Math.min(score, 100);

      scoredUsers.push({ userId: stat.userId, name: user.fullName, email: user.email, score, lastActive, signals });
    }

    // Categorize
    let healthy = 0, atRisk = 0, churning = 0;
    for (const u of scoredUsers) {
      if (u.score <= 30) healthy++;
      else if (u.score <= 60) atRisk++;
      else churning++;
    }

    // Top 20 most likely to churn
    const topChurning = scoredUsers
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return successResponse(res, { healthy, atRisk, churning, topChurning });
  } catch (err: any) {
    console.error('[Analytics] Predictive churn error:', err.message);
    return errorResponse(res, 'Failed to compute churn predictions', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Tier 3 — Content Performance
// ═══════════════════════════════════════════════════════

r.get('/admin/content-performance', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query as any;
    const parsedDays = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    const since = new Date(Date.now() - parsedDays * 86400000);

    // Use DB-level groupBy for all three queries in parallel
    const [articleGroups, productGroups, wellnessGroups] = await Promise.all([
      prisma.userEvent.groupBy({
        by: ['label'],
        where: { event: 'page_view', label: { contains: '/articles/' }, createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { label: 'desc' } },
        take: 20,
      }),
      prisma.userEvent.groupBy({
        by: ['label'],
        where: { event: 'product_viewed', createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { label: 'desc' } },
        take: 20,
      }),
      prisma.userEvent.groupBy({
        by: ['label'],
        where: { event: 'feature_used', createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { label: 'desc' } },
        take: 20,
      }),
    ]);

    const articles = articleGroups.map(g => ({ path: g.label || 'unknown', count: g._count }));
    const products = productGroups.map(g => ({ title: g.label || 'unknown', count: g._count }));
    const wellness = wellnessGroups.map(g => ({ title: g.label || 'unknown', count: g._count }));

    return successResponse(res, { articles, products, wellness, period: `${parsedDays} days` });
  } catch (err: any) {
    console.error('[Analytics] Content performance error:', err.message);
    return errorResponse(res, 'Failed to fetch content performance', 500);
  }
});

export default r;
