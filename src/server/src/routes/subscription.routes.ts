import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';
import subscriptionService from '../services/subscription.service';
import prisma from '../config/database';

const r = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

// ═══════════════════════════════════════════════════════
// WEBHOOK (before authenticate — raw body)
// ═══════════════════════════════════════════════════════

r.post('/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) { res.status(400).json({ error: 'Missing signature' }); return; }

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(400).json({ error: 'Invalid signature' }); return;
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventName = event.event;
    const subEntity = event.payload?.subscription?.entity;
    const paymentEntity = event.payload?.payment?.entity;

    if (!subEntity?.id) { res.json({ status: 'ok', message: 'No subscription entity' }); return; }

    const rzpSubId = subEntity.id;

    switch (eventName) {
      case 'subscription.activated':
      case 'subscription.charged': {
        const paymentId = paymentEntity?.id || '';
        const amount = (paymentEntity?.amount || 0) / 100;
        await subscriptionService.handleRenewal(rzpSubId, paymentId, amount);
        break;
      }
      case 'subscription.pending':
      case 'subscription.halted': {
        await subscriptionService.handlePaymentFailed(rzpSubId);
        break;
      }
      case 'subscription.cancelled':
      case 'subscription.completed': {
        const sub = await prisma.userSubscription.findUnique({ where: { razorpaySubscriptionId: rzpSubId } });
        if (sub && sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED') {
          await subscriptionService.cancelSubscription(sub.id, sub.userId, `Razorpay: ${eventName}`);
        }
        break;
      }
    }

    res.json({ status: 'ok' });
  } catch (e: any) {
    console.error('[Subscription Webhook Error]', e.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ═══════════════════════════════════════════════════════
// PUBLIC ROUTES (authenticated user)
// ═══════════════════════════════════════════════════════

r.use(authenticate);

// GET /subscriptions/plans — List public plans with promotions
r.get('/plans', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const goal = q.query.goal as string | undefined;
    const config = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
    const paused = config && (!config.subscriptionEnabled ||
      (config.subscriptionPausedUntil && new Date(config.subscriptionPausedUntil) > new Date()));

    const plans = await subscriptionService.getPublicPlans(goal);
    successResponse(s, {
      plans,
      subscriptionEnabled: config?.subscriptionEnabled ?? true,
      paused: !!paused,
      pauseMessage: paused ? (config?.subscriptionPauseMessage || 'Subscriptions are currently unavailable.') : null,
      pausedUntil: paused && config?.subscriptionPausedUntil ? config.subscriptionPausedUntil : null,
    }, 'Subscription plans');
  } catch (e) { n(e); }
});

// GET /subscriptions/my — Get current subscription
r.get('/my', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const sub = await subscriptionService.getActiveSubscription(q.user!.id);
    successResponse(s, sub || { status: 'FREE', plan: null }, 'Current subscription');
  } catch (e) { n(e); }
});

// POST /subscriptions/create — Create new subscription
r.post('/create', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    // Check global subscription toggle & pause
    const config = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
    if (config && !config.subscriptionEnabled) {
      errorResponse(s, config.subscriptionPauseMessage || 'Subscriptions are currently disabled. Please try again later.', 403);
      return;
    }
    if (config?.subscriptionPausedUntil && new Date(config.subscriptionPausedUntil) > new Date()) {
      const until = new Date(config.subscriptionPausedUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      errorResponse(s, config.subscriptionPauseMessage || `Subscriptions are paused until ${until}. Please try again later.`, 403);
      return;
    }

    const { planId, couponCode, goal } = q.body;
    if (!planId) { errorResponse(s, 'planId is required', 400); return; }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) { errorResponse(s, 'Plan not found or inactive', 404); return; }

    // Determine price
    let price = plan.basePrice;
    if (goal && plan.goalPricing) {
      const gp = plan.goalPricing as Record<string, number>;
      if (gp[goal] !== undefined) price = gp[goal];
    }
    const originalPrice = price;

    // Apply best promotion
    let promotionId: string | undefined;
    let promoDiscount = 0;
    const promoResult = await subscriptionService.applyPromotion(q.user!.id, planId, goal);
    if (promoResult) {
      promoDiscount = promoResult.discount;
      promotionId = promoResult.promotion.id;
    }

    // Apply coupon
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase().trim() },
        include: { redemptions: { where: { userId: q.user!.id } } },
      });
      if (coupon && coupon.isActive && (coupon.applicableTo === 'ALL' || coupon.applicableTo === 'SUBSCRIPTION')) {
        if (coupon.redemptions.length < coupon.maxUsesPerUser) {
          if (!coupon.maxUses || coupon.currentUses < coupon.maxUses) {
            let cd = coupon.discountType === 'PERCENTAGE'
              ? price * (coupon.discountValue / 100)
              : coupon.discountValue;
            if (coupon.discountType === 'PERCENTAGE' && coupon.maxDiscountAmount && cd > coupon.maxDiscountAmount) {
              cd = coupon.maxDiscountAmount;
            }
            couponDiscount = Math.min(cd, price);
          }
        }
      }
    }

    const totalDiscount = promoDiscount + couponDiscount;
    const pricePaid = Math.max(0, Math.round((price - totalDiscount) * 100) / 100);

    // Capture IP & UserAgent for audit trail
    const ipAddress = q.ip || q.headers['x-forwarded-for']?.toString();
    const userAgent = q.headers['user-agent'];

    // Free plan or fully discounted → activate directly
    if (plan.isFree || pricePaid === 0) {
      const sub = await subscriptionService.createSubscription(q.user!.id, planId, {
        couponCode, goal, pricePaid: 0, originalPrice, couponDiscount, promotionId, promotionDiscount: promoDiscount,
        ipAddress, userAgent,
      });

      // Record coupon usage if applied
      if (couponCode && couponDiscount > 0) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase().trim() } });
        if (coupon) {
          await prisma.couponRedemption.create({ data: { couponId: coupon.id, userId: q.user!.id, subscriptionId: sub.id, discount: couponDiscount } });
          await prisma.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
        }
      }

      successResponse(s, { subscription: sub, paymentRequired: false }, 'Subscription activated');
      return;
    }

    // Lifetime → one-time Razorpay order
    if (plan.interval === 'LIFETIME') {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(pricePaid * 100),
        currency: plan.currency || 'INR',
        receipt: `sub_${q.user!.id}_${Date.now()}`,
        notes: { userId: q.user!.id, planId, planSlug: plan.slug, goal: goal || '', type: 'subscription_lifetime' },
      });

      successResponse(s, {
        paymentRequired: true,
        paymentType: 'one_time',
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planId,
        originalPrice,
        pricePaid,
        couponDiscount,
        promoDiscount,
        promotionId,
        couponCode,
        goal,
      });
      return;
    }

    // Monthly/Yearly → Razorpay Subscription
    if (!plan.razorpayPlanId) {
      errorResponse(s, 'Plan not configured for recurring payments. Contact support.', 400);
      return;
    }

    const subOpts: any = {
      plan_id: plan.razorpayPlanId,
      total_count: plan.interval === 'YEARLY' ? 10 : 120, // Max cycles
      quantity: 1,
      customer_notify: 1,
      notes: { userId: q.user!.id, planId, planSlug: plan.slug, goal: goal || '' },
    };

    // Trial period
    if (plan.trialDays > 0) {
      const trialEnd = Math.floor(Date.now() / 1000) + plan.trialDays * 86400;
      subOpts.start_at = trialEnd;
    }

    const rzpSub = await razorpay.subscriptions.create(subOpts);

    successResponse(s, {
      paymentRequired: true,
      paymentType: 'subscription',
      razorpaySubscriptionId: rzpSub.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      planId,
      originalPrice,
      pricePaid,
      couponDiscount,
      promoDiscount,
      promotionId,
      couponCode,
      goal,
    });
  } catch (e) { n(e); }
});

// POST /subscriptions/verify — Verify payment
r.post('/verify', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { razorpaySubscriptionId, razorpayOrderId, razorpayPaymentId, razorpaySignature, planId, pricePaid, originalPrice, couponCode, couponDiscount, promotionId, promoDiscount, goal, paymentType } = q.body;

    // Verify signature
    let expectedSignature: string;
    if (paymentType === 'one_time' && razorpayOrderId) {
      expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(razorpayOrderId + '|' + razorpayPaymentId).digest('hex');
    } else if (razorpaySubscriptionId) {
      expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(razorpayPaymentId + '|' + razorpaySubscriptionId).digest('hex');
    } else {
      errorResponse(s, 'Invalid payment data', 400); return;
    }

    if (expectedSignature !== razorpaySignature) {
      errorResponse(s, 'Payment verification failed', 400); return;
    }

    // Create subscription record
    const verifyIp = q.ip || q.headers['x-forwarded-for']?.toString();
    const verifyUa = q.headers['user-agent'];
    const sub = await subscriptionService.createSubscription(q.user!.id, planId, {
      razorpaySubscriptionId: razorpaySubscriptionId || undefined,
      couponCode, goal,
      pricePaid: Number(pricePaid) || 0,
      originalPrice: Number(originalPrice) || 0,
      couponDiscount: Number(couponDiscount) || 0,
      promotionId: promotionId || undefined,
      promotionDiscount: Number(promoDiscount) || 0,
      ipAddress: verifyIp,
      userAgent: verifyUa,
    });

    // Record coupon redemption
    if (couponCode && couponDiscount > 0) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase().trim() } });
      if (coupon) {
        await prisma.couponRedemption.create({ data: { couponId: coupon.id, userId: q.user!.id, subscriptionId: sub.id, discount: Number(couponDiscount) } });
        await prisma.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
      }
    }

    // Audit log
    await prisma.paymentAuditLog.create({
      data: {
        userId: q.user!.id,
        eventType: 'SUBSCRIPTION_CREATED',
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId,
        subtotal: Number(originalPrice) || 0,
        couponCode: couponCode || null,
        couponDiscount: Number(couponDiscount) || 0,
        totalAmount: Number(pricePaid) || 0,
        paymentMethod: 'razorpay',
        metadata: { planId, goal, promotionId, promoDiscount, razorpaySubscriptionId },
      },
    });

    successResponse(s, { subscription: sub }, 'Subscription activated');
  } catch (e) { n(e); }
});

// POST /subscriptions/cancel
r.post('/cancel', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { reason } = q.body;
    const activeSub = await subscriptionService.getActiveSubscription(q.user!.id);
    if (!activeSub) { errorResponse(s, 'No active subscription', 404); return; }

    // Cancel on Razorpay if recurring
    if (activeSub.razorpaySubscriptionId) {
      try {
        await razorpay.subscriptions.cancel(activeSub.razorpaySubscriptionId, { cancel_at_cycle_end: true } as any);
      } catch (e: any) {
        console.error('[Razorpay cancel error]', e.message);
      }
    }

    const sub = await subscriptionService.cancelSubscription(activeSub.id, q.user!.id, reason);
    successResponse(s, sub, 'Subscription cancelled. Access retained until period end.');
  } catch (e) { n(e); }
});

// GET /subscriptions/invoices
r.get('/invoices', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const events = await prisma.subscriptionEvent.findMany({
      where: { userId: q.user!.id, eventType: { in: ['ACTIVATED', 'RENEWED'] }, amount: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    successResponse(s, events, 'Subscription invoices');
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════

// Plans
r.get('/admin/plans', requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.getAllPlans(), 'All plans'); } catch (e) { n(e); }
});

r.post('/admin/plans', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.createPlan(q.body), 'Plan created'); } catch (e) { n(e); }
});

r.put('/admin/plans/:id', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.updatePlan(q.params.id, q.body), 'Plan updated'); } catch (e) { n(e); }
});

r.delete('/admin/plans/:id', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.deletePlan(q.params.id), 'Plan deactivated'); } catch (e) { n(e); }
});

r.post('/admin/plans/:id/toggle-free', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.togglePlanFree(q.params.id), 'Plan free status toggled'); } catch (e) { n(e); }
});

// Sync plan to Razorpay
r.post('/admin/plans/:id/sync-razorpay', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: q.params.id } });
    if (!plan) { errorResponse(s, 'Plan not found', 404); return; }
    if (plan.interval === 'LIFETIME') { errorResponse(s, 'Lifetime plans use one-time payments, not Razorpay subscriptions', 400); return; }

    const period = plan.interval === 'YEARLY' ? 'yearly' : 'monthly';
    const rzpPlan = await razorpay.plans.create({
      period,
      interval: 1,
      item: {
        name: plan.name,
        amount: Math.round(plan.basePrice * 100),
        currency: plan.currency || 'INR',
        description: plan.description || plan.name,
      },
    });

    const updated = await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { razorpayPlanId: rzpPlan.id },
    });

    successResponse(s, updated, 'Plan synced with Razorpay');
  } catch (e) { n(e); }
});

// Promotions
r.get('/admin/promotions', requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.getAllPromotions(), 'All promotions'); } catch (e) { n(e); }
});

r.post('/admin/promotions', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.createPromotion(q.body), 'Promotion created'); } catch (e) { n(e); }
});

r.put('/admin/promotions/:id', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.updatePromotion(q.params.id, q.body), 'Promotion updated'); } catch (e) { n(e); }
});

r.delete('/admin/promotions/:id', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.deletePromotion(q.params.id), 'Promotion deleted'); } catch (e) { n(e); }
});

// Subscribers
r.get('/admin/subscribers', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { page, limit, status, planId } = q.query as any;
    successResponse(s, await subscriptionService.getSubscribers({ page: Number(page) || 1, limit: Number(limit) || 20, status, planId }), 'Subscribers');
  } catch (e) { n(e); }
});

r.post('/admin/subscribers/:id/extend', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { days } = q.body;
    if (!days || days < 1) { errorResponse(s, 'days must be >= 1', 400); return; }
    successResponse(s, await subscriptionService.adminExtend(q.params.id, Number(days), q.user!.id), 'Subscription extended');
  } catch (e) { n(e); }
});

r.post('/admin/subscribers/:id/cancel', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { reason } = q.body;
    successResponse(s, await subscriptionService.adminCancel(q.params.id, q.user!.id, reason || 'Admin cancelled'), 'Subscription cancelled');
  } catch (e) { n(e); }
});

// Analytics
r.get('/admin/analytics', requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await subscriptionService.getAnalytics(), 'Subscription analytics'); } catch (e) { n(e); }
});

// Events
r.get('/admin/events', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { page, limit, subscriptionId, userId } = q.query as any;
    successResponse(s, await subscriptionService.getEvents({ page: Number(page) || 1, limit: Number(limit) || 50, subscriptionId, userId }), 'Subscription events');
  } catch (e) { n(e); }
});

// Cron: expire subscriptions (call from scheduled job)
r.post('/admin/expire-check', requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await subscriptionService.checkExpiredSubscriptions();
    successResponse(s, result, 'Expiration check complete');
  } catch (e) { n(e); }
});

export default r;
