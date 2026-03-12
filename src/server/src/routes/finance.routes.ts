// ══════════════════════════════════════════════════════
// Finance Routes — Coupons, Platform Config, Revenue Analytics
// Modeled after: Practo (doctor commission), Amazon/Flipkart (product fees),
// Zomato/Zepto (platform fee, delivery, coupons)
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// ─── HELPER: Get platform config (cached per request) ──
async function getConfig() {
  let config = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await prisma.platformConfig.create({ data: { id: 'default' } });
  }
  return config;
}

// ═══════════════════════════════════════════════════════
// PUBLIC (no auth): Config values visible to all users
// ═══════════════════════════════════════════════════════

// GET /finance/config/public — Public config values (delivery charges, fees visible to user)
// Must be BEFORE r.use(authenticate) so unauthenticated users can see fees
r.get('/config/public', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await getConfig();
    successResponse(res, {
      deliveryCharge: c.deliveryCharge,
      freeDeliveryAbove: c.freeDeliveryAbove,
      platformFeeFlat: c.platformFeeFlat,
      platformFeePercent: c.platformFeePercent,
      codEnabled: c.codEnabled,
      codExtraCharge: c.codExtraCharge,
      minOrderAmount: c.minOrderAmount,
      gstRate: c.gstRate,
      includeGstInPrice: c.includeGstInPrice,
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════
// AUTHENTICATED: Validate coupon (user-facing)
// ═══════════════════════════════════════════════════════

r.use(authenticate);

// POST /finance/coupon/validate — Check if coupon is valid for this user/cart
r.post('/coupon/validate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, applicableTo, amount, doctorId, productIds } = req.body;
    const userId = req.user!.id;

    if (!code) { errorResponse(res, 'Coupon code is required', 400); return; }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { redemptions: { where: { userId } } },
    });

    if (!coupon || !coupon.isActive) {
      errorResponse(res, 'Invalid or expired coupon code', 400); return;
    }

    // Check validity period
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) { errorResponse(res, 'Coupon is not yet active', 400); return; }
    if (coupon.validUntil && now > coupon.validUntil) { errorResponse(res, 'Coupon has expired', 400); return; }

    // Check scope (ALL, CONSULTATION, PRODUCTS)
    if (coupon.applicableTo !== 'ALL') {
      if (applicableTo && coupon.applicableTo !== applicableTo) {
        errorResponse(res, `This coupon is valid for ${coupon.applicableTo.toLowerCase()} only`, 400); return;
      }
    }

    // Check min order amount (use > 0 to avoid skipping when amount is 0)
    if (amount !== undefined && amount > 0 && amount < coupon.minOrderAmount) {
      errorResponse(res, `Minimum order of ₹${coupon.minOrderAmount} required for this coupon`, 400); return;
    }

    // Check max uses (global)
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      errorResponse(res, 'Coupon usage limit reached', 400); return;
    }

    // Check per-user limit
    if (coupon.redemptions.length >= coupon.maxUsesPerUser) {
      errorResponse(res, 'You have already used this coupon', 400); return;
    }

    // Check first-order-only (like Zepto/PharmEasy)
    if (coupon.firstOrderOnly) {
      const hasOrders = await prisma.order.count({ where: { userId, paymentStatus: 'PAID' } });
      const hasAppointments = await prisma.appointment.count({ where: { userId, status: { not: 'CANCELLED' } } });
      if (hasOrders > 0 || hasAppointments > 0) {
        errorResponse(res, 'This coupon is for first-time users only', 400); return;
      }
    }

    // Check specific doctor/product targeting
    if (doctorId && coupon.specificDoctorIds.length > 0 && !coupon.specificDoctorIds.includes(doctorId)) {
      errorResponse(res, 'This coupon is not valid for this doctor', 400); return;
    }
    if (productIds?.length && coupon.specificProductIds.length > 0) {
      const valid = productIds.some((pid: string) => coupon.specificProductIds.includes(pid));
      if (!valid) { errorResponse(res, 'This coupon is not valid for these products', 400); return; }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (amount || 0) * (coupon.discountValue / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
    }
    // Cap flat discount at order amount (never exceed what user pays)
    if (amount !== undefined && amount > 0) {
      discount = Math.min(discount, amount);
    }
    discount = Math.round(discount * 100) / 100;

    successResponse(res, {
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      calculatedDiscount: discount,
      applicableTo: coupon.applicableTo,
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Full coupon + config + analytics management
// ═══════════════════════════════════════════════════════

// ─── Platform Config ──

// GET /finance/config — Full config (admin only)
r.get('/config', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getConfig();
    successResponse(res, config);
  } catch (e) { next(e); }
});

// PUT /finance/config — Update config
r.put('/config', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = [
      'defaultDoctorCommission', 'defaultProductCommission',
      'deliveryCharge', 'freeDeliveryAbove',
      'gstRate', 'includeGstInPrice',
      'platformFeeFlat', 'platformFeePercent',
      'cancellationWindowHours', 'cancellationPenalty',
      'codEnabled', 'codExtraCharge',
      'minOrderAmount', 'refundProcessingDays',
    ];
    const booleanFields = ['codEnabled', 'includeGstInPrice'];
    const data: any = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        if (booleanFields.includes(f)) {
          // Boolean fields: handle "true"/"false" strings and actual booleans
          data[f] = req.body[f] === true || req.body[f] === 'true';
        } else {
          data[f] = typeof req.body[f] === 'string' ? parseFloat(req.body[f]) : req.body[f];
        }
      }
    }
    const config = await prisma.platformConfig.update({ where: { id: 'default' }, data });
    successResponse(res, config, 'Platform config updated');
  } catch (e) { next(e); }
});

// ─── Coupons ──

// GET /finance/coupons — List all coupons
r.get('/coupons', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const coupons = await prisma.coupon.findMany({
      where,
      include: { _count: { select: { redemptions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, coupons);
  } catch (e) { next(e); }
});

// POST /finance/coupons — Create coupon
r.post('/coupons', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      code, description, discountType, discountValue, maxDiscountAmount,
      minOrderAmount, applicableTo, specificDoctorIds, specificProductIds,
      specificCategories, maxUses, maxUsesPerUser, validFrom, validUntil,
      isActive, firstOrderOnly,
    } = req.body;

    if (!code || !discountValue) {
      errorResponse(res, 'Code and discount value are required', 400); return;
    }

    // Check uniqueness
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (existing) { errorResponse(res, 'Coupon code already exists', 400); return; }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description || null,
        discountType: discountType || 'PERCENTAGE',
        discountValue: Number(discountValue),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minOrderAmount: Number(minOrderAmount) || 0,
        applicableTo: applicableTo || 'ALL',
        specificDoctorIds: specificDoctorIds || [],
        specificProductIds: specificProductIds || [],
        specificCategories: specificCategories || [],
        maxUses: maxUses ? Number(maxUses) : null,
        maxUsesPerUser: Number(maxUsesPerUser) || 1,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive !== false,
        firstOrderOnly: firstOrderOnly || false,
      },
    });
    successResponse(res, coupon, 'Coupon created', 201);
  } catch (e) { next(e); }
});

// PUT /finance/coupons/:id — Update coupon
r.put('/coupons/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = {};
    const fields = [
      'description', 'discountType', 'discountValue', 'maxDiscountAmount',
      'minOrderAmount', 'applicableTo', 'specificDoctorIds', 'specificProductIds',
      'specificCategories', 'maxUses', 'maxUsesPerUser', 'validFrom', 'validUntil',
      'isActive', 'firstOrderOnly',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (['validFrom', 'validUntil'].includes(f) && req.body[f]) {
          data[f] = new Date(req.body[f]);
        } else if (['discountValue', 'maxDiscountAmount', 'minOrderAmount', 'maxUses', 'maxUsesPerUser'].includes(f)) {
          data[f] = req.body[f] !== null ? Number(req.body[f]) : null;
        } else {
          data[f] = req.body[f];
        }
      }
    }
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    successResponse(res, coupon, 'Coupon updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Coupon not found', 404); return; }
    next(e);
  }
});

// DELETE /finance/coupons/:id
r.delete('/coupons/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Coupon deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Coupon not found', 404); return; }
    next(e);
  }
});

// ─── Revenue Analytics ──

// GET /finance/analytics — Comprehensive revenue analytics
r.get('/analytics', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getConfig();

    // Product sales analytics
    const orders = await prisma.order.findMany({
      where: { paymentStatus: { in: ['PAID', 'PENDING_COD'] } },
      select: { subtotal: true, discount: true, couponDiscount: true, platformFee: true, deliveryCharge: true, totalAmount: true, createdAt: true },
    });

    const productRevenue = {
      totalSales: orders.reduce((s, o) => s + o.subtotal, 0),
      totalDiscounts: orders.reduce((s, o) => s + (o.discount || 0) + (o.couponDiscount || 0), 0),
      totalPlatformFees: orders.reduce((s, o) => s + (o.platformFee || 0), 0),
      totalDeliveryCharges: orders.reduce((s, o) => s + o.deliveryCharge, 0),
      totalCollected: orders.reduce((s, o) => s + o.totalAmount, 0),
      orderCount: orders.length,
    };

    // Doctor appointment analytics
    const appointments = await prisma.appointment.findMany({
      where: { status: 'COMPLETED' },
      select: { amountPaid: true, originalFee: true, couponDiscount: true, platformFee: true, createdAt: true },
    });

    const appointmentRevenue = {
      totalEarned: appointments.reduce((s, a) => s + (a.amountPaid || 0), 0),
      totalOriginalFees: appointments.reduce((s, a) => s + (a.originalFee || a.amountPaid || 0), 0),
      totalDiscounts: appointments.reduce((s, a) => s + (a.couponDiscount || 0), 0),
      totalPlatformFees: appointments.reduce((s, a) => s + (a.platformFee || 0), 0),
      appointmentCount: appointments.length,
    };

    // Payout summary
    const payouts = await prisma.doctorPayout.findMany({
      select: { totalEarnings: true, platformFee: true, netPayout: true, status: true },
    });

    const payoutSummary = {
      totalSettled: payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + p.netPayout, 0),
      totalPending: payouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING').reduce((s, p) => s + p.netPayout, 0),
      totalPlatformCommission: payouts.reduce((s, p) => s + p.platformFee, 0),
    };

    // Coupon analytics
    const couponRedemptions = await prisma.couponRedemption.aggregate({
      _sum: { discount: true },
      _count: true,
    });

    successResponse(res, {
      productRevenue,
      appointmentRevenue,
      payoutSummary,
      coupons: {
        totalRedemptions: couponRedemptions._count,
        totalDiscountGiven: couponRedemptions._sum.discount || 0,
      },
      config: {
        doctorCommission: config.defaultDoctorCommission,
        productCommission: config.defaultProductCommission,
        platformFeePercent: config.platformFeePercent,
        platformFeeFlat: config.platformFeeFlat,
        deliveryCharge: config.deliveryCharge,
        freeDeliveryAbove: config.freeDeliveryAbove,
      },
      // Combined platform revenue
      platformTotal: {
        fromDoctorCommissions: payoutSummary.totalPlatformCommission,
        fromProductFees: productRevenue.totalPlatformFees,
        fromAppointmentFees: appointmentRevenue.totalPlatformFees,
        fromDeliveryCharges: productRevenue.totalDeliveryCharges,
        total: payoutSummary.totalPlatformCommission + productRevenue.totalPlatformFees + appointmentRevenue.totalPlatformFees + productRevenue.totalDeliveryCharges,
      },
    });
  } catch (e) { next(e); }
});

// ─── Product Payouts (revenue settlement for product sales) ──

// POST /finance/product-payouts/generate
r.post('/product-payouts/generate', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commissionRate } = req.body;
    const config = await getConfig();
    const rate = commissionRate ?? config.defaultProductCommission;

    // Find last product payout
    const lastPayout = await prisma.productPayout.findFirst({ orderBy: { periodEnd: 'desc' } });
    const periodStart = lastPayout ? lastPayout.periodEnd : new Date('2024-01-01');
    const periodEnd = new Date();

    // Get paid orders in period
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: ['PAID', 'PENDING_COD'] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { subtotal: true, deliveryCharge: true, totalAmount: true },
    });

    if (orders.length === 0) {
      errorResponse(res, 'No orders found in this period', 400); return;
    }

    const totalSales = orders.reduce((s, o) => s + o.subtotal, 0);
    const deliveryCharges = orders.reduce((s, o) => s + o.deliveryCharge, 0);
    const platformFee = totalSales * (rate / 100);
    const netPayout = totalSales - platformFee;

    const payout = await prisma.productPayout.create({
      data: {
        periodStart,
        periodEnd,
        totalSales,
        totalOrders: orders.length,
        platformFee,
        netPayout,
        commissionRate: rate,
        deliveryCharges,
        status: 'PENDING',
      },
    });

    successResponse(res, payout, 'Product payout generated');
  } catch (e) { next(e); }
});

// GET /finance/product-payouts
r.get('/product-payouts', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    const payouts = await prisma.productPayout.findMany({ where, orderBy: { createdAt: 'desc' } });
    successResponse(res, payouts);
  } catch (e) { next(e); }
});

// PATCH /finance/product-payouts/:id
r.patch('/product-payouts/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = {};
    const validPayoutStatuses = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'];
    if (req.body.status) {
      if (!validPayoutStatuses.includes(req.body.status)) { errorResponse(res, `Invalid status. Must be one of: ${validPayoutStatuses.join(', ')}`, 400); return; }
      data.status = req.body.status;
    }
    if (req.body.transactionId) data.transactionId = req.body.transactionId;
    if (req.body.paymentMethod) data.paymentMethod = req.body.paymentMethod;
    if (req.body.adminNotes !== undefined) data.adminNotes = req.body.adminNotes;
    if (req.body.status === 'PAID') data.paidAt = new Date();

    const payout = await prisma.productPayout.update({ where: { id: req.params.id }, data });
    successResponse(res, payout);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Payout not found', 404); return; }
    next(e);
  }
});

// ─── Audit Log (immutable payment ledger) ──

// GET /finance/audit-log — Paginated, filterable audit log
r.get('/audit-log', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType, period, page = '1', limit = '50' } = req.query;
    const where: any = {};

    if (eventType && eventType !== 'ALL') where.eventType = eventType;

    // Period filter
    if (period) {
      const now = new Date();
      let from: Date | null = null;
      if (period === 'today') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
      else if (period === 'week') { from = new Date(now.getTime() - 7 * 86400000); }
      else if (period === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); }
      else if (period === 'year') { from = new Date(now.getFullYear(), 0, 1); }
      if (from) where.createdAt = { gte: from };
    }

    const parsedPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;
    const [logs, total] = await Promise.all([
      prisma.paymentAuditLog.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip, take: parsedLimit,
      }),
      prisma.paymentAuditLog.count({ where }),
    ]);

    successResponse(res, { logs, total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) });
  } catch (e) { next(e); }
});

// GET /finance/audit-log/summary — Revenue summary (today/week/month)
r.get('/audit-log/summary', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only count actual payment events (not order creation)
    const paidEvents = ['ORDER_PAID', 'ORDER_COD', 'WEBHOOK_CAPTURED', 'APPOINTMENT_PAID'];

    const [todayLogs, weekLogs, monthLogs, allLogs] = await Promise.all([
      prisma.paymentAuditLog.findMany({ where: { eventType: { in: paidEvents }, createdAt: { gte: todayStart } } }),
      prisma.paymentAuditLog.findMany({ where: { eventType: { in: paidEvents }, createdAt: { gte: weekStart } } }),
      prisma.paymentAuditLog.findMany({ where: { eventType: { in: paidEvents }, createdAt: { gte: monthStart } } }),
      prisma.paymentAuditLog.findMany({ where: { eventType: { in: paidEvents } } }),
    ]);

    const summarize = (logs: any[]) => ({
      revenue: logs.reduce((s, l) => s + (l.totalAmount || 0), 0),
      platformFees: logs.reduce((s, l) => s + (l.platformFee || 0), 0),
      couponDiscounts: logs.reduce((s, l) => s + (l.couponDiscount || 0), 0),
      deliveryCharges: logs.reduce((s, l) => s + (l.deliveryCharge || 0), 0),
      codCharges: logs.reduce((s, l) => s + (l.codCharge || 0), 0),
      count: logs.length,
    });

    // Event type breakdown (all time)
    const eventCounts: Record<string, number> = {};
    const allEvents = await prisma.paymentAuditLog.findMany({ select: { eventType: true } });
    for (const e of allEvents) eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;

    successResponse(res, {
      today: summarize(todayLogs),
      week: summarize(weekLogs),
      month: summarize(monthLogs),
      allTime: summarize(allLogs),
      eventBreakdown: eventCounts,
    });
  } catch (e) { next(e); }
});

// GET /finance/audit-log/export — CSV export for CA/accountant
r.get('/audit-log/export', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType, period } = req.query;
    const where: any = {};

    if (eventType && eventType !== 'ALL') where.eventType = eventType;
    if (period) {
      const now = new Date();
      let from: Date | null = null;
      if (period === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (period === 'week') from = new Date(now.getTime() - 7 * 86400000);
      else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (period === 'year') from = new Date(now.getFullYear(), 0, 1);
      if (from) where.createdAt = { gte: from };
    }

    const logs = await prisma.paymentAuditLog.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Build CSV
    const headers = [
      'Date', 'Event Type', 'User ID', 'Order ID', 'Appointment ID', 'Order Number',
      'Razorpay Order ID', 'Razorpay Payment ID', 'Subtotal', 'Coupon Code', 'Coupon Discount',
      'Platform Fee', 'Delivery Charge', 'COD Charge', 'GST Amount', 'Total Amount',
      'Payment Method', 'Currency', 'Doctor ID', 'Commission Rate', 'IP Address',
    ];

    const escCsv = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = logs.map(l => [
      new Date(l.createdAt).toISOString(), l.eventType, l.userId, l.orderId || '',
      l.appointmentId || '', l.orderNumber || '', l.razorpayOrderId || '',
      l.razorpayPaymentId || '', l.subtotal, l.couponCode || '', l.couponDiscount,
      l.platformFee, l.deliveryCharge, l.codCharge, l.gstAmount, l.totalAmount,
      l.paymentMethod || '', l.currency, l.doctorId || '', l.commissionRate ?? '',
      l.ipAddress || '',
    ].map(escCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payment-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

export default r;
