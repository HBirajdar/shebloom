import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { SubscriptionStatus, SubscriptionEventType, SubscriptionInterval } from '@prisma/client';

// ─── Premium Feature Keys ────────────────────────────
export const PREMIUM_FEATURES: Record<string, boolean> = {
  'cycle:bbt': true,
  'cycle:cervical-mucus': true,
  'cycle:fertility-daily': true,
  'cycle:fertility-insights': true,
  'cycle:ayurvedic-insights': true,
  'cycle:extended-history': true,
  'reports:export': true,
  'reports:full': true,
  'dosha:full-assessment': true,
  'programs:paid': true,
  'articles:premium': true,
  'appointments:priority': true,
  'pregnancy:advanced': true,
};

// Active statuses that grant access
const ACCESS_STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED'];

class SubscriptionService {
  // ─── Check if user has active subscription ──────────
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const cached = await cacheGet<{ active: boolean }>(`sub:${userId}:active`);
    if (cached !== null) return cached.active;

    const sub = await this.getActiveSubscription(userId);
    const active = !!sub;
    await cacheSet(`sub:${userId}:active`, { active }, 60); // 60s cache
    return active;
  }

  // ─── Get user's active subscription ─────────────────
  async getActiveSubscription(userId: string) {
    const now = new Date();
    return prisma.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ACCESS_STATUSES },
        currentPeriodEnd: { gte: now },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Check feature access ──────────────────────────
  async hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    if (!PREMIUM_FEATURES[featureKey]) return true; // Not a premium feature
    return this.hasActiveSubscription(userId);
  }

  // ─── Get all plans (public) ─────────────────────────
  async getPublicPlans(goal?: string) {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true, isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Attach active promotions
    const now = new Date();
    const promos = await prisma.subscriptionPromotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    return plans.map(plan => {
      // Determine effective price for this goal
      let effectivePrice = plan.basePrice;
      if (goal && plan.goalPricing) {
        const gp = plan.goalPricing as Record<string, number>;
        if (gp[goal] !== undefined) effectivePrice = gp[goal];
      }

      // Find best applicable promotion
      const applicable = promos.filter(p => {
        if (p.planId && p.planId !== plan.id) return false;
        if (p.goals.length > 0 && goal && !p.goals.includes(goal)) return false;
        if (p.maxRedemptions && p.currentRedemptions >= p.maxRedemptions) return false;
        return true;
      });

      let bestPromo = null;
      let promoDiscount = 0;
      for (const p of applicable) {
        let d = p.discountType === 'PERCENTAGE'
          ? effectivePrice * (p.discountValue / 100)
          : p.discountValue;
        if (p.discountType === 'PERCENTAGE' && p.maxDiscountAmount && d > p.maxDiscountAmount) {
          d = p.maxDiscountAmount;
        }
        d = Math.min(d, effectivePrice);
        if (d > promoDiscount) {
          promoDiscount = d;
          bestPromo = p;
        }
      }

      return {
        ...plan,
        effectivePrice,
        promoDiscount: Math.round(promoDiscount * 100) / 100,
        finalPrice: Math.round((effectivePrice - promoDiscount) * 100) / 100,
        promotion: bestPromo ? { id: bestPromo.id, name: bestPromo.name, type: bestPromo.type, discountValue: bestPromo.discountValue, discountType: bestPromo.discountType } : null,
      };
    });
  }

  // ─── Create subscription ───────────────────────────
  async createSubscription(userId: string, planId: string, opts: {
    couponCode?: string;
    goal?: string;
    razorpaySubscriptionId?: string;
    razorpayCustomerId?: string;
    pricePaid: number;
    originalPrice: number;
    couponDiscount?: number;
    promotionId?: string;
    promotionDiscount?: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new Error('Plan not found or inactive');

    // Cancel any existing active subscription
    const existing = await this.getActiveSubscription(userId);
    if (existing) {
      await prisma.userSubscription.update({
        where: { id: existing.id },
        data: { status: 'EXPIRED', cancelledAt: new Date(), cancelReason: 'Replaced by new subscription' },
      });
      await this.logEvent(existing.id, userId, 'EXPIRED', {
        previousStatus: existing.status,
        newStatus: 'EXPIRED',
        metadata: { reason: 'Replaced by new subscription' },
      });
    }

    const now = new Date();
    const hasTrial = plan.trialDays > 0 && opts.pricePaid > 0;

    let trialStartDate: Date | null = null;
    let trialEndDate: Date | null = null;
    let periodStart = now;
    let periodEnd: Date;
    let status: SubscriptionStatus = 'ACTIVE';

    if (hasTrial) {
      trialStartDate = now;
      trialEndDate = new Date(now.getTime() + plan.trialDays * 86400000);
      periodStart = now;
      periodEnd = trialEndDate;
      status = 'TRIAL';
    } else if (plan.interval === 'LIFETIME') {
      periodEnd = new Date('2099-12-31T23:59:59Z');
    } else if (plan.interval === 'YEARLY') {
      periodEnd = new Date(now.getTime() + 365 * 86400000);
    } else {
      periodEnd = new Date(now.getTime() + 30 * 86400000);
    }

    // If free (price 0), activate immediately
    if (opts.pricePaid === 0) status = 'ACTIVE';

    const sub = await prisma.userSubscription.create({
      data: {
        userId,
        planId,
        status,
        trialStartDate,
        trialEndDate,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        razorpaySubscriptionId: opts.razorpaySubscriptionId || null,
        razorpayCustomerId: opts.razorpayCustomerId || null,
        pricePaid: opts.pricePaid,
        originalPrice: opts.originalPrice,
        couponCode: opts.couponCode || null,
        couponDiscount: opts.couponDiscount || 0,
        promotionId: opts.promotionId || null,
        promotionDiscount: opts.promotionDiscount || 0,
        goal: opts.goal || null,
        isAutoRenew: plan.interval !== 'LIFETIME',
      },
      include: { plan: true },
    });

    // Log events
    await this.logEvent(sub.id, userId, 'CREATED', { newStatus: status, amount: opts.pricePaid, ipAddress: opts.ipAddress, userAgent: opts.userAgent });
    if (hasTrial) {
      await this.logEvent(sub.id, userId, 'TRIAL_STARTED', { newStatus: 'TRIAL' });
    } else {
      await this.logEvent(sub.id, userId, 'ACTIVATED', { newStatus: 'ACTIVE', amount: opts.pricePaid });
    }
    if (opts.promotionId) {
      await this.logEvent(sub.id, userId, 'PROMO_APPLIED', { metadata: { promotionId: opts.promotionId, discount: opts.promotionDiscount } });
      await prisma.subscriptionPromotion.update({ where: { id: opts.promotionId }, data: { currentRedemptions: { increment: 1 } } });
    }
    if (opts.couponCode) {
      await this.logEvent(sub.id, userId, 'COUPON_APPLIED', { metadata: { couponCode: opts.couponCode, discount: opts.couponDiscount } });
    }

    await this.invalidateCache(userId);
    return sub;
  }

  // ─── Cancel subscription ───────────────────────────
  async cancelSubscription(subscriptionId: string, userId: string, reason?: string) {
    const sub = await prisma.userSubscription.findFirst({
      where: { id: subscriptionId, userId, status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
    });
    if (!sub) throw new Error('No active subscription found');

    const prev = sub.status;
    const updated = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || 'User cancelled', isAutoRenew: false },
      include: { plan: true },
    });

    await this.logEvent(subscriptionId, userId, 'CANCELLED', { previousStatus: prev, newStatus: 'CANCELLED', metadata: { reason } });
    await this.invalidateCache(userId);
    return updated;
  }

  // ─── Handle Razorpay renewal ───────────────────────
  async handleRenewal(razorpaySubscriptionId: string, razorpayPaymentId: string, amount: number) {
    const sub = await prisma.userSubscription.findUnique({ where: { razorpaySubscriptionId } });
    if (!sub) { console.warn(`[Renewal] No subscription found for razorpaySubscriptionId: ${razorpaySubscriptionId}`); return null; }

    const now = new Date();
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } });
    const interval = plan?.interval || 'MONTHLY';

    // Guard: LIFETIME subscriptions should never be renewed via webhook
    if (interval === 'LIFETIME') {
      console.warn(`[Renewal] Ignoring renewal for LIFETIME subscription ${sub.id}`);
      return sub;
    }

    // Calendar-based dates with month-end clamping (e.g., Jan 31 + 1 month = Feb 28, not Mar 3)
    let newEnd: Date;
    if (interval === 'YEARLY') {
      const targetMonth = now.getMonth();
      const targetYear = now.getFullYear() + 1;
      const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      newEnd = new Date(targetYear, targetMonth, Math.min(now.getDate(), lastDayOfMonth));
    } else {
      const targetMonth = now.getMonth() + 1;
      const targetYear = now.getFullYear();
      const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      newEnd = new Date(targetYear, targetMonth, Math.min(now.getDate(), lastDayOfMonth));
    }

    const prev = sub.status;
    const updated = await prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: newEnd,
        renewalCount: { increment: 1 },
        graceStartDate: null,
        graceEndDate: null,
        paymentRetryCount: 0,
      },
    });

    await this.logEvent(sub.id, sub.userId, 'RENEWED', {
      previousStatus: prev, newStatus: 'ACTIVE', amount, razorpayPaymentId,
    });
    await this.invalidateCache(sub.userId);
    return updated;
  }

  // ─── Handle payment failure ────────────────────────
  async handlePaymentFailed(razorpaySubscriptionId: string) {
    const sub = await prisma.userSubscription.findUnique({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
    if (!sub) return null;

    const now = new Date();
    const graceDays = sub.plan?.gracePeriodDays || 3;
    const prev = sub.status;

    const updated = await prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'PAST_DUE',
        graceStartDate: now,
        graceEndDate: new Date(now.getTime() + graceDays * 86400000),
        paymentRetryCount: { increment: 1 },
      },
    });

    await this.logEvent(sub.id, sub.userId, 'PAYMENT_FAILED', { previousStatus: prev, newStatus: 'PAST_DUE' });
    await this.logEvent(sub.id, sub.userId, 'GRACE_STARTED', { metadata: { graceDays } });
    await this.invalidateCache(sub.userId);
    return updated;
  }

  // ─── Apply best promotion ──────────────────────────
  async applyPromotion(userId: string, planId: string, goal?: string) {
    const now = new Date();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const promos = await prisma.subscriptionPromotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    const userDaysSinceReg = (now.getTime() - user.createdAt.getTime()) / 86400000;

    let bestPromo = null;
    let bestDiscount = 0;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return null;

    let price = plan.basePrice;
    if (goal && plan.goalPricing) {
      const gp = plan.goalPricing as Record<string, number>;
      if (gp[goal] !== undefined) price = gp[goal];
    }

    for (const p of promos) {
      // Check targeting
      if (p.planId && p.planId !== planId) continue;
      if (p.goals.length > 0 && goal && !p.goals.includes(goal)) continue;
      if (p.maxRedemptions && p.currentRedemptions >= p.maxRedemptions) continue;

      // Welcome bonus: check user is new
      if (p.isWelcomeBonus && userDaysSinceReg > p.newUserWindowDays) continue;

      // Check per-user limit
      const userRedemptions = await prisma.subscriptionEvent.count({
        where: { userId, eventType: 'PROMO_APPLIED', metadata: { path: ['promotionId'], equals: p.id } },
      });
      if (userRedemptions >= p.maxPerUser) continue;

      let d = p.discountType === 'PERCENTAGE' ? price * (p.discountValue / 100) : p.discountValue;
      if (p.discountType === 'PERCENTAGE' && p.maxDiscountAmount && d > p.maxDiscountAmount) d = p.maxDiscountAmount;
      d = Math.min(d, price);

      if (d > bestDiscount) {
        bestDiscount = d;
        bestPromo = p;
      }
    }

    return bestPromo ? { promotion: bestPromo, discount: Math.round(bestDiscount * 100) / 100 } : null;
  }

  // ─── Expire past-due subscriptions (cron) ──────────
  async checkExpiredSubscriptions() {
    const now = new Date();

    // Expire past-due subscriptions past grace period
    const pastDue = await prisma.userSubscription.findMany({
      where: { status: 'PAST_DUE', graceEndDate: { lt: now } },
    });
    for (const sub of pastDue) {
      await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } });
      await this.logEvent(sub.id, sub.userId, 'EXPIRED', { previousStatus: 'PAST_DUE', newStatus: 'EXPIRED' });
      await this.invalidateCache(sub.userId);
    }

    // Expire cancelled subscriptions past period end
    const cancelled = await prisma.userSubscription.findMany({
      where: { status: 'CANCELLED', currentPeriodEnd: { lt: now } },
    });
    for (const sub of cancelled) {
      await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } });
      await this.logEvent(sub.id, sub.userId, 'EXPIRED', { previousStatus: 'CANCELLED', newStatus: 'EXPIRED' });
      await this.invalidateCache(sub.userId);
    }

    // Expire trials past trial end
    const trials = await prisma.userSubscription.findMany({
      where: { status: 'TRIAL', trialEndDate: { lt: now } },
    });
    for (const sub of trials) {
      await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } });
      await this.logEvent(sub.id, sub.userId, 'TRIAL_ENDED', { previousStatus: 'TRIAL', newStatus: 'EXPIRED' });
      await this.logEvent(sub.id, sub.userId, 'EXPIRED', { previousStatus: 'TRIAL', newStatus: 'EXPIRED' });
      await this.invalidateCache(sub.userId);
    }

    return { pastDue: pastDue.length, cancelled: cancelled.length, trials: trials.length };
  }

  // ─── Admin: Analytics ──────────────────────────────
  async getAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [activeSubs, trialSubs, cancelledRecent, totalRevenue, revenueByPlan, newSubsThisMonth] = await Promise.all([
      prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.userSubscription.count({ where: { status: 'TRIAL' } }),
      prisma.userSubscription.count({ where: { status: 'CANCELLED', cancelledAt: { gte: thirtyDaysAgo } } }),
      prisma.userSubscription.aggregate({ _sum: { pricePaid: true }, where: { status: { in: ['ACTIVE', 'CANCELLED', 'EXPIRED'] } } }),
      prisma.userSubscription.groupBy({
        by: ['planId'],
        _count: true,
        _sum: { pricePaid: true },
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      }),
      prisma.userSubscription.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // MRR calculation
    const activeMonthly = await prisma.userSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });
    let mrr = 0;
    for (const s of activeMonthly) {
      if (s.plan.interval === 'MONTHLY') mrr += s.pricePaid;
      else if (s.plan.interval === 'YEARLY') mrr += s.pricePaid / 12;
    }

    return {
      activeSubs,
      trialSubs,
      cancelledRecent,
      totalRevenue: totalRevenue._sum.pricePaid || 0,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      newSubsThisMonth,
      revenueByPlan,
      churnRate: activeSubs > 0 ? Math.round((cancelledRecent / (activeSubs + cancelledRecent)) * 10000) / 100 : 0,
    };
  }

  // ─── Admin: Get subscribers ────────────────────────
  async getSubscribers(params: { page?: number; limit?: number; status?: string; planId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.planId) where.planId = params.planId;

    const [items, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } }, plan: { select: { name: true, interval: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userSubscription.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ─── Admin: Extend subscription ────────────────────
  async adminExtend(subscriptionId: string, days: number, adminId: string) {
    const sub = await prisma.userSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new Error('Subscription not found');

    const newEnd = new Date(sub.currentPeriodEnd.getTime() + days * 86400000);
    const prev = sub.status;
    const newStatus = ['EXPIRED', 'PAST_DUE', 'CANCELLED'].includes(prev) ? 'ACTIVE' : prev;

    const updated = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodEnd: newEnd,
        status: newStatus,
        // Reset grace fields when reactivating
        ...(newStatus === 'ACTIVE' && prev !== 'ACTIVE' ? { graceStartDate: null, graceEndDate: null, paymentRetryCount: 0 } : {}),
      },
      include: { plan: true },
    });

    await this.logEvent(subscriptionId, sub.userId, 'ADMIN_EXTENDED', {
      previousStatus: prev, newStatus, performedBy: adminId,
      metadata: { days, newEnd: newEnd.toISOString() },
    });
    await this.invalidateCache(sub.userId);
    return updated;
  }

  // ─── Admin: Cancel subscription ────────────────────
  async adminCancel(subscriptionId: string, adminId: string, reason: string) {
    const sub = await prisma.userSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new Error('Subscription not found');

    const prev = sub.status;
    const updated = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, isAutoRenew: false },
      include: { plan: true },
    });

    await this.logEvent(subscriptionId, sub.userId, 'ADMIN_CANCELLED', {
      previousStatus: prev, newStatus: 'CANCELLED', performedBy: adminId,
      metadata: { reason },
    });
    await this.invalidateCache(sub.userId);
    return updated;
  }

  // ─── Admin: Get all plans ──────────────────────────
  async getAllPlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
  }

  // ─── Admin: CRUD Plans ─────────────────────────────
  async createPlan(data: any) {
    if (typeof data.goalPricing === 'string') try { data.goalPricing = JSON.parse(data.goalPricing); } catch {}
    if (typeof data.highlights === 'string') try { data.highlights = JSON.parse(data.highlights); } catch {}
    if (data.basePrice !== undefined) data.basePrice = Number(data.basePrice);
    if (data.trialDays !== undefined) data.trialDays = Number(data.trialDays);
    if (data.gracePeriodDays !== undefined) data.gracePeriodDays = Number(data.gracePeriodDays);
    if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder);
    return prisma.subscriptionPlan.create({ data });
  }

  async updatePlan(id: string, data: any) {
    // Remove Prisma virtual/relation fields that frontend may send
    delete data.id; delete data.createdAt; delete data.updatedAt;
    delete data._count; delete data.subscriptions; delete data.promotions;
    if (typeof data.goalPricing === 'string') try { data.goalPricing = JSON.parse(data.goalPricing); } catch {}
    if (typeof data.highlights === 'string') try { data.highlights = JSON.parse(data.highlights); } catch {}
    if (data.basePrice !== undefined) data.basePrice = Number(data.basePrice);
    if (data.trialDays !== undefined) data.trialDays = Number(data.trialDays);
    if (data.gracePeriodDays !== undefined) data.gracePeriodDays = Number(data.gracePeriodDays);
    if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder);
    return prisma.subscriptionPlan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    // Soft delete: set inactive
    return prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false, isPublished: false } });
  }

  async togglePlanFree(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new Error('Plan not found');
    return prisma.subscriptionPlan.update({ where: { id }, data: { isFree: !plan.isFree } });
  }

  // ─── Admin: CRUD Promotions ────────────────────────
  async getAllPromotions() {
    return prisma.subscriptionPromotion.findMany({ orderBy: { createdAt: 'desc' }, include: { plan: { select: { name: true } } } });
  }

  async createPromotion(data: any) {
    if (typeof data.goals === 'string') try { data.goals = JSON.parse(data.goals); } catch {}
    if (data.discountValue !== undefined) data.discountValue = Number(data.discountValue);
    if (data.maxDiscountAmount !== undefined) data.maxDiscountAmount = data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null;
    if (data.maxRedemptions !== undefined) data.maxRedemptions = data.maxRedemptions ? Number(data.maxRedemptions) : null;
    if (data.maxPerUser !== undefined) data.maxPerUser = Number(data.maxPerUser);
    if (data.newUserWindowDays !== undefined) data.newUserWindowDays = Number(data.newUserWindowDays);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    return prisma.subscriptionPromotion.create({ data });
  }

  async updatePromotion(id: string, data: any) {
    // Remove Prisma virtual/relation fields that frontend may send
    delete data.id; delete data.createdAt; delete data.updatedAt;
    delete data.plan; delete data.currentRedemptions;
    if (typeof data.goals === 'string') try { data.goals = JSON.parse(data.goals); } catch {}
    if (data.discountValue !== undefined) data.discountValue = Number(data.discountValue);
    if (data.maxDiscountAmount !== undefined) data.maxDiscountAmount = data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null;
    if (data.maxRedemptions !== undefined) data.maxRedemptions = data.maxRedemptions ? Number(data.maxRedemptions) : null;
    if (data.maxPerUser !== undefined) data.maxPerUser = Number(data.maxPerUser);
    if (data.newUserWindowDays !== undefined) data.newUserWindowDays = Number(data.newUserWindowDays);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = data.endDate ? new Date(data.endDate) : null;
    return prisma.subscriptionPromotion.update({ where: { id }, data });
  }

  async deletePromotion(id: string) {
    return prisma.subscriptionPromotion.delete({ where: { id } });
  }

  // ─── Admin: Event log ──────────────────────────────
  async getEvents(params: { page?: number; limit?: number; subscriptionId?: string; userId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const where: any = {};
    if (params.subscriptionId) where.subscriptionId = params.subscriptionId;
    if (params.userId) where.userId = params.userId;

    const [items, total] = await Promise.all([
      prisma.subscriptionEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriptionEvent.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ─── Helpers ───────────────────────────────────────
  private async logEvent(subscriptionId: string, userId: string, eventType: SubscriptionEventType, extra: {
    previousStatus?: string; newStatus?: string; amount?: number;
    razorpayPaymentId?: string; metadata?: any; performedBy?: string;
    ipAddress?: string; userAgent?: string;
  } = {}) {
    return prisma.subscriptionEvent.create({
      data: {
        subscriptionId,
        userId,
        eventType,
        amount: extra.amount || 0,
        previousStatus: extra.previousStatus || null,
        newStatus: extra.newStatus || null,
        razorpayPaymentId: extra.razorpayPaymentId || null,
        metadata: extra.metadata || null,
        performedBy: extra.performedBy || null,
        ipAddress: extra.ipAddress || null,
        userAgent: extra.userAgent || null,
      },
    });
  }

  private async invalidateCache(userId: string) {
    try { await cacheDel(`sub:${userId}:active`); } catch {}
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
