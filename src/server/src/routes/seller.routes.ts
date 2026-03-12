// ═══════════════════════════════════════════════════════
// Seller Routes — Registration, Dashboard, Earnings, Products
// Amazon/Flipkart-style marketplace seller panel
// ═══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

r.use(authenticate);

// ─── Seller Registration ─────────────────────────────
r.post('/register', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const userId = q.user!.id;
    const existing = await prisma.seller.findUnique({ where: { userId } });
    if (existing) {
      if (existing.status === 'REJECTED' || existing.status === 'DEACTIVATED') {
        const updated = await prisma.seller.update({
          where: { id: existing.id },
          data: { ...q.body, status: 'PENDING', rejectionReason: null, suspensionReason: null },
        });
        successResponse(s, updated, 'Re-applied as seller');
        return;
      }
      errorResponse(s, 'You already have a seller account', 400); return;
    }

    const {
      businessName, businessType, gstin, panNumber, fssaiLicense, drugLicense,
      businessAddress, city, state, pincode, logoUrl,
      contactEmail, contactPhone, whatsapp,
      bankAccountName, bankAccountNumber, bankIfsc, bankName, upiId,
    } = q.body;

    if (!businessName || !contactEmail || !contactPhone) {
      errorResponse(s, 'Business name, email, and phone are required', 400); return;
    }

    const seller = await prisma.seller.create({
      data: {
        userId,
        businessName, businessType: businessType || 'INDIVIDUAL',
        gstin: gstin || null, panNumber: panNumber || null,
        fssaiLicense: fssaiLicense || null, drugLicense: drugLicense || null,
        businessAddress: businessAddress || null,
        city: city || null, state: state || null, pincode: pincode || null,
        logoUrl: logoUrl || null,
        contactEmail, contactPhone, whatsapp: whatsapp || null,
        bankAccountName: bankAccountName || null, bankAccountNumber: bankAccountNumber || null,
        bankIfsc: bankIfsc || null, bankName: bankName || null, upiId: upiId || null,
      },
    });

    successResponse(s, seller, 'Seller registration submitted! Awaiting admin approval.', 201);
  } catch (e) { n(e); }
});

// ─── Get my seller profile ───────────────────────────
r.get('/me', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { userId: q.user!.id },
      include: { _count: { select: { products: true, transactions: true } } },
    });
    if (!seller) { errorResponse(s, 'No seller account found', 404); return; }
    successResponse(s, seller);
  } catch (e) { n(e); }
});

// ─── Update my seller profile ────────────────────────
r.put('/me', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account found', 404); return; }

    const allowed = [
      'businessName', 'businessType', 'gstin', 'panNumber', 'fssaiLicense', 'drugLicense',
      'businessAddress', 'city', 'state', 'pincode', 'logoUrl',
      'contactEmail', 'contactPhone', 'whatsapp',
      'bankAccountName', 'bankAccountNumber', 'bankIfsc', 'bankName', 'upiId',
    ];
    const data: any = {};
    for (const f of allowed) {
      if (q.body[f] !== undefined) data[f] = q.body[f];
    }

    const updated = await prisma.seller.update({ where: { id: seller.id }, data });
    successResponse(s, updated, 'Profile updated');
  } catch (e) { n(e); }
});

// ─── My Products ─────────────────────────────────────
r.get('/me/products', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account', 404); return; }

    const products = await prisma.product.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(s, products);
  } catch (e) { n(e); }
});

// ─── Seller Dashboard / Overview ─────────────────────
r.get('/me/dashboard', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account', 404); return; }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts, publishedProducts,
      allTx, todayTx, monthTx,
      pendingPayouts, paidPayouts,
    ] = await Promise.all([
      prisma.product.count({ where: { sellerId: seller.id } }),
      prisma.product.count({ where: { sellerId: seller.id, isPublished: true } }),
      prisma.sellerTransaction.findMany({ where: { sellerId: seller.id } }),
      prisma.sellerTransaction.findMany({ where: { sellerId: seller.id, orderDate: { gte: todayStart } } }),
      prisma.sellerTransaction.findMany({ where: { sellerId: seller.id, orderDate: { gte: monthStart } } }),
      prisma.productPayout.findMany({ where: { sellerId: seller.id, status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.productPayout.findMany({ where: { sellerId: seller.id, status: 'PAID' } }),
    ]);

    const sum = (txs: any[]) => ({
      grossSales: txs.reduce((s, t) => s + t.grossAmount, 0),
      commission: txs.reduce((s, t) => s + t.commissionAmount, 0),
      tds: txs.reduce((s, t) => s + t.tdsAmount, 0),
      netEarnings: txs.reduce((s, t) => s + t.netAmount, 0),
      orders: txs.length,
      units: txs.reduce((s, t) => s + t.quantity, 0),
    });

    successResponse(s, {
      seller: { id: seller.id, businessName: seller.businessName, status: seller.status, rating: seller.rating },
      products: { total: totalProducts, published: publishedProducts },
      earnings: {
        today: sum(todayTx),
        thisMonth: sum(monthTx),
        allTime: sum(allTx),
      },
      payouts: {
        pendingAmount: pendingPayouts.reduce((s, p) => s + p.netPayout, 0),
        paidAmount: paidPayouts.reduce((s, p) => s + p.netPayout, 0),
        pendingCount: pendingPayouts.length,
        paidCount: paidPayouts.length,
      },
    });
  } catch (e) { n(e); }
});

// ─── My Transactions (order-wise) ────────────────────
r.get('/me/transactions', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account', 404); return; }

    const { page = '1', limit = '20', settled } = q.query as any;
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * (parseInt(limit) || 20);
    const take = Math.min(parseInt(limit) || 20, 100);

    const where: any = { sellerId: seller.id };
    if (settled === 'true') where.isSettled = true;
    if (settled === 'false') where.isSettled = false;

    const [transactions, total] = await Promise.all([
      prisma.sellerTransaction.findMany({
        where, orderBy: { orderDate: 'desc' }, skip, take,
      }),
      prisma.sellerTransaction.count({ where }),
    ]);

    successResponse(s, { transactions, total, page: Math.max(parseInt(page) || 1, 1), limit: take });
  } catch (e) { n(e); }
});

// ─── My Payouts ──────────────────────────────────────
r.get('/me/payouts', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account', 404); return; }

    const payouts = await prisma.productPayout.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(s, payouts);
  } catch (e) { n(e); }
});

// ─── Top selling products (seller's own) ─────────────
r.get('/me/top-products', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account', 404); return; }

    const txs = await prisma.sellerTransaction.findMany({
      where: { sellerId: seller.id },
      select: { productId: true, productName: true, quantity: true, grossAmount: true, netAmount: true },
    });

    // Aggregate by product
    const map = new Map<string, { productId: string; productName: string; unitsSold: number; grossSales: number; netEarnings: number }>();
    for (const t of txs) {
      const ex = map.get(t.productId) || { productId: t.productId, productName: t.productName, unitsSold: 0, grossSales: 0, netEarnings: 0 };
      ex.unitsSold += t.quantity;
      ex.grossSales += t.grossAmount;
      ex.netEarnings += t.netAmount;
      map.set(t.productId, ex);
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.grossSales - a.grossSales);
    successResponse(s, sorted.slice(0, 20));
  } catch (e) { n(e); }
});

// ─── Area-wise sales (seller's own) ──────────────────
r.get('/me/area-sales', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: q.user!.id } });
    if (!seller) { errorResponse(s, 'No seller account', 404); return; }

    const txs = await prisma.sellerTransaction.findMany({
      where: { sellerId: seller.id },
      select: { buyerState: true, buyerCity: true, grossAmount: true, quantity: true },
    });

    // State-wise
    const stateMap = new Map<string, { state: string; orders: number; revenue: number; units: number }>();
    for (const t of txs) {
      const st = t.buyerState || 'Unknown';
      const ex = stateMap.get(st) || { state: st, orders: 0, revenue: 0, units: 0 };
      ex.orders += 1;
      ex.revenue += t.grossAmount;
      ex.units += t.quantity;
      stateMap.set(st, ex);
    }

    // City-wise (top 20)
    const cityMap = new Map<string, { city: string; state: string; orders: number; revenue: number }>();
    for (const t of txs) {
      const ct = t.buyerCity || 'Unknown';
      const ex = cityMap.get(ct) || { city: ct, state: t.buyerState || '', orders: 0, revenue: 0 };
      ex.orders += 1;
      ex.revenue += t.grossAmount;
      cityMap.set(ct, ex);
    }

    successResponse(s, {
      byState: Array.from(stateMap.values()).sort((a, b) => b.revenue - a.revenue),
      byCity: Array.from(cityMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 20),
    });
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Seller management
// ═══════════════════════════════════════════════════════

// ─── List all sellers ────────────────────────────────
r.get('/admin/list', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { status, search } = q.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true, phone: true, avatarUrl: true } },
        _count: { select: { products: true, transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(s, sellers);
  } catch (e) { n(e); }
});

// ─── Get single seller detail ────────────────────────
r.get('/admin/:id', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: q.params.id },
      include: {
        user: { select: { fullName: true, email: true, phone: true, avatarUrl: true } },
        _count: { select: { products: true, transactions: true, payouts: true } },
      },
    });
    if (!seller) { errorResponse(s, 'Seller not found', 404); return; }
    successResponse(s, seller);
  } catch (e) { n(e); }
});

// ─── Approve / Reject / Suspend seller ───────────────
r.patch('/admin/:id/status', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { status, reason } = q.body;
    const validStatuses = ['APPROVED', 'SUSPENDED', 'REJECTED', 'DEACTIVATED', 'PENDING'];
    if (!validStatuses.includes(status)) {
      errorResponse(s, `Invalid status. Must be: ${validStatuses.join(', ')}`, 400); return;
    }

    const data: any = { status };
    if (status === 'APPROVED') {
      data.isVerified = true;
      data.verifiedAt = new Date();
      data.approvedBy = q.user!.id;
      data.rejectionReason = null;
      data.suspensionReason = null;
    } else if (status === 'REJECTED') {
      data.rejectionReason = reason || null;
    } else if (status === 'SUSPENDED') {
      data.suspensionReason = reason || null;
    }

    const seller = await prisma.seller.update({ where: { id: q.params.id }, data });
    successResponse(s, seller, `Seller ${status.toLowerCase()}`);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(s, 'Seller not found', 404); return; }
    n(e);
  }
});

// ─── Update seller commission rate ───────────────────
r.patch('/admin/:id/commission', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { commissionRate, tdsRate } = q.body;
    const data: any = {};
    if (commissionRate !== undefined) data.commissionRate = Number(commissionRate);
    if (tdsRate !== undefined) data.tdsRate = Number(tdsRate);

    const seller = await prisma.seller.update({ where: { id: q.params.id }, data });
    successResponse(s, seller, 'Commission updated');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(s, 'Seller not found', 404); return; }
    n(e);
  }
});

// ─── Seller earnings breakdown (admin view) ──────────
r.get('/admin/:id/earnings', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const sellerId = q.params.id;
    const txs = await prisma.sellerTransaction.findMany({ where: { sellerId } });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = txs.filter(t => t.orderDate >= monthStart);

    // Unsettled earnings
    const unsettled = txs.filter(t => !t.isSettled);

    successResponse(s, {
      allTime: {
        grossSales: txs.reduce((s, t) => s + t.grossAmount, 0),
        commission: txs.reduce((s, t) => s + t.commissionAmount, 0),
        tds: txs.reduce((s, t) => s + t.tdsAmount, 0),
        netEarnings: txs.reduce((s, t) => s + t.netAmount, 0),
        totalOrders: txs.length,
        totalUnits: txs.reduce((s, t) => s + t.quantity, 0),
      },
      thisMonth: {
        grossSales: monthTxs.reduce((s, t) => s + t.grossAmount, 0),
        commission: monthTxs.reduce((s, t) => s + t.commissionAmount, 0),
        tds: monthTxs.reduce((s, t) => s + t.tdsAmount, 0),
        netEarnings: monthTxs.reduce((s, t) => s + t.netAmount, 0),
        totalOrders: monthTxs.length,
      },
      unsettled: {
        amount: unsettled.reduce((s, t) => s + t.netAmount, 0),
        count: unsettled.length,
      },
    });
  } catch (e) { n(e); }
});

// ─── Generate payout for a specific seller ───────────
r.post('/admin/:id/generate-payout', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const sellerId = q.params.id;
    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) { errorResponse(s, 'Seller not found', 404); return; }

    // Find unsettled transactions
    const unsettled = await prisma.sellerTransaction.findMany({
      where: { sellerId, isSettled: false },
    });

    if (unsettled.length === 0) {
      errorResponse(s, 'No unsettled transactions for this seller', 400); return;
    }

    const periodStart = unsettled.reduce((min, t) => t.orderDate < min ? t.orderDate : min, unsettled[0].orderDate);
    const periodEnd = new Date();

    const totalSales = unsettled.reduce((s, t) => s + t.grossAmount, 0);
    const platformFee = unsettled.reduce((s, t) => s + t.commissionAmount, 0);
    const tdsDeducted = unsettled.reduce((s, t) => s + t.tdsAmount, 0);
    const netPayout = unsettled.reduce((s, t) => s + t.netAmount, 0);

    // Create payout and mark transactions as settled atomically
    const payout = await prisma.$transaction(async (tx) => {
      const p = await tx.productPayout.create({
        data: {
          sellerId,
          periodStart,
          periodEnd,
          totalSales,
          totalOrders: unsettled.length,
          platformFee,
          netPayout,
          commissionRate: seller.commissionRate,
          tdsDeducted,
          status: 'PENDING',
        },
      });

      await tx.sellerTransaction.updateMany({
        where: { id: { in: unsettled.map(t => t.id) } },
        data: { isSettled: true, settledAt: new Date(), payoutId: p.id },
      });

      return p;
    });

    successResponse(s, payout, `Payout of ₹${netPayout.toFixed(2)} generated for ${seller.businessName}`);
  } catch (e) { n(e); }
});

// ─── Admin: all seller payouts ───────────────────────
r.get('/admin/payouts/all', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { status, sellerId } = q.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    // Only seller payouts (not platform payouts)
    where.sellerId = where.sellerId || { not: null };

    const payouts = await prisma.productPayout.findMany({
      where,
      include: { seller: { select: { businessName: true, contactEmail: true, bankName: true, upiId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(s, payouts);
  } catch (e) { n(e); }
});

// ─── Admin: update payout status (mark as paid, etc.) ─
r.patch('/admin/payouts/:payoutId', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data: any = {};
    const { status, transactionId, paymentMethod, adminNotes } = q.body;
    if (status) {
      const valid = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'ON_HOLD'];
      if (!valid.includes(status)) { errorResponse(s, `Invalid status`, 400); return; }
      data.status = status;
      if (status === 'PAID') data.paidAt = new Date();
    }
    if (transactionId) data.transactionId = transactionId;
    if (paymentMethod) data.paymentMethod = paymentMethod;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const payout = await prisma.productPayout.update({ where: { id: q.params.payoutId }, data });
    successResponse(s, payout);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(s, 'Payout not found', 404); return; }
    n(e);
  }
});

// ─── Admin: Platform-wide seller analytics ───────────
r.get('/admin/analytics/overview', requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSellers, approvedSellers, pendingSellers,
      allTx, monthTx,
      topSellersTx,
    ] = await Promise.all([
      prisma.seller.count(),
      prisma.seller.count({ where: { status: 'APPROVED' } }),
      prisma.seller.count({ where: { status: 'PENDING' } }),
      prisma.sellerTransaction.findMany(),
      prisma.sellerTransaction.findMany({ where: { orderDate: { gte: monthStart } } }),
      prisma.sellerTransaction.findMany({
        select: { sellerId: true, grossAmount: true, commissionAmount: true, netAmount: true, quantity: true },
      }),
    ]);

    // Top sellers by gross sales
    const sellerMap = new Map<string, { sellerId: string; grossSales: number; commission: number; netEarnings: number; orders: number; units: number }>();
    for (const t of topSellersTx) {
      const ex = sellerMap.get(t.sellerId) || { sellerId: t.sellerId, grossSales: 0, commission: 0, netEarnings: 0, orders: 0, units: 0 };
      ex.grossSales += t.grossAmount;
      ex.commission += t.commissionAmount;
      ex.netEarnings += t.netAmount;
      ex.orders += 1;
      ex.units += t.quantity;
      sellerMap.set(t.sellerId, ex);
    }
    const topSellers = Array.from(sellerMap.values()).sort((a, b) => b.grossSales - a.grossSales).slice(0, 10);

    // Fetch seller names
    const sellerIds = topSellers.map(ts => ts.sellerId);
    const sellerNames = await prisma.seller.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, businessName: true },
    });
    const nameMap = new Map(sellerNames.map(sn => [sn.id, sn.businessName]));

    // Top products platform-wide
    const productMap = new Map<string, { productId: string; productName: string; unitsSold: number; grossSales: number }>();
    for (const t of allTx) {
      const ex = productMap.get(t.productId) || { productId: t.productId, productName: t.productName, unitsSold: 0, grossSales: 0 };
      ex.unitsSold += t.quantity;
      ex.grossSales += t.grossAmount;
      productMap.set(t.productId, ex);
    }
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.grossSales - a.grossSales).slice(0, 10);

    // Area-wise platform sales
    const stateMap = new Map<string, { state: string; orders: number; revenue: number }>();
    for (const t of allTx) {
      const st = t.buyerState || 'Unknown';
      const ex = stateMap.get(st) || { state: st, orders: 0, revenue: 0 };
      ex.orders += 1;
      ex.revenue += t.grossAmount;
      stateMap.set(st, ex);
    }

    successResponse(s, {
      sellers: { total: totalSellers, approved: approvedSellers, pending: pendingSellers },
      revenue: {
        allTime: {
          grossSales: allTx.reduce((s, t) => s + t.grossAmount, 0),
          platformCommission: allTx.reduce((s, t) => s + t.commissionAmount, 0),
          tdsCollected: allTx.reduce((s, t) => s + t.tdsAmount, 0),
          sellerPayable: allTx.reduce((s, t) => s + t.netAmount, 0),
          totalOrders: allTx.length,
        },
        thisMonth: {
          grossSales: monthTx.reduce((s, t) => s + t.grossAmount, 0),
          platformCommission: monthTx.reduce((s, t) => s + t.commissionAmount, 0),
          totalOrders: monthTx.length,
        },
      },
      topSellers: topSellers.map(ts => ({ ...ts, businessName: nameMap.get(ts.sellerId) || 'Unknown' })),
      topProducts,
      salesByState: Array.from(stateMap.values()).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (e) { n(e); }
});

// ─── Admin: Export seller transactions CSV ───────────
r.get('/admin/export/transactions', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { sellerId, period, settled } = q.query as any;
    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (settled === 'true') where.isSettled = true;
    if (settled === 'false') where.isSettled = false;

    if (period) {
      const now = new Date();
      let from: Date | null = null;
      if (period === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (period === 'week') from = new Date(now.getTime() - 7 * 86400000);
      else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (period === 'year') from = new Date(now.getFullYear(), 0, 1);
      if (from) where.orderDate = { gte: from };
    }

    const txs = await prisma.sellerTransaction.findMany({
      where,
      include: { seller: { select: { businessName: true, contactEmail: true, gstin: true, panNumber: true } } },
      orderBy: { orderDate: 'desc' },
    });

    const headers = [
      'Date', 'Seller Name', 'Seller Email', 'GSTIN', 'PAN',
      'Product Name', 'Product ID', 'Order ID', 'Quantity',
      'Sale Price', 'Gross Amount', 'Commission Rate (%)', 'Commission Amount',
      'TDS Rate (%)', 'TDS Amount', 'Net Payable',
      'Buyer City', 'Buyer State', 'Buyer Pincode', 'Payment Method',
      'Is Settled', 'Payout ID',
    ];

    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = txs.map(t => [
      new Date(t.orderDate).toISOString().slice(0, 10),
      t.seller.businessName, t.seller.contactEmail, t.seller.gstin || '', t.seller.panNumber || '',
      t.productName, t.productId, t.orderId, t.quantity,
      t.salePrice, t.grossAmount, t.commissionRate, t.commissionAmount,
      t.tdsRate, t.tdsAmount, t.netAmount,
      t.buyerCity || '', t.buyerState || '', t.buyerPincode || '', t.paymentMethod || '',
      t.isSettled ? 'Yes' : 'No', t.payoutId || '',
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    s.setHeader('Content-Type', 'text/csv');
    s.setHeader('Content-Disposition', `attachment; filename="seller-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
    s.send(csv);
  } catch (e) { n(e); }
});

// ─── Admin: Export seller payouts CSV ────────────────
r.get('/admin/export/payouts', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const payouts = await prisma.productPayout.findMany({
      where: { sellerId: { not: null } },
      include: { seller: { select: { businessName: true, contactEmail: true, gstin: true, panNumber: true, bankName: true, bankAccountNumber: true, bankIfsc: true, upiId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Payout ID', 'Date', 'Seller Name', 'Seller Email', 'GSTIN', 'PAN',
      'Period Start', 'Period End', 'Total Sales', 'Total Orders',
      'Commission Rate (%)', 'Platform Fee', 'TDS Deducted', 'Net Payout',
      'Status', 'Payment Method', 'Transaction ID', 'Paid Date',
      'Bank Name', 'Account Number', 'IFSC', 'UPI ID', 'Admin Notes',
    ];

    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = payouts.map(p => [
      p.id, new Date(p.createdAt).toISOString().slice(0, 10),
      p.seller?.businessName || '', p.seller?.contactEmail || '', p.seller?.gstin || '', p.seller?.panNumber || '',
      new Date(p.periodStart).toISOString().slice(0, 10), new Date(p.periodEnd).toISOString().slice(0, 10),
      p.totalSales, p.totalOrders, p.commissionRate, p.platformFee, p.tdsDeducted, p.netPayout,
      p.status, p.paymentMethod || '', p.transactionId || '', p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : '',
      p.seller?.bankName || '', p.seller?.bankAccountNumber || '', p.seller?.bankIfsc || '', p.seller?.upiId || '',
      p.adminNotes || '',
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    s.setHeader('Content-Type', 'text/csv');
    s.setHeader('Content-Disposition', `attachment; filename="seller-payouts-${new Date().toISOString().slice(0, 10)}.csv"`);
    s.send(csv);
  } catch (e) { n(e); }
});

// ─── Admin: Export all sellers CSV ───────────────────
r.get('/admin/export/sellers', requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const sellers = await prisma.seller.findMany({
      include: { user: { select: { fullName: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Seller ID', 'User Name', 'User Email', 'User Phone',
      'Business Name', 'Business Type', 'GSTIN', 'PAN', 'FSSAI', 'Drug License',
      'City', 'State', 'Pincode',
      'Contact Email', 'Contact Phone', 'WhatsApp',
      'Bank Name', 'Account Number', 'IFSC', 'UPI ID',
      'Commission Rate (%)', 'TDS Rate (%)',
      'Total Sales', 'Total Orders', 'Total Products', 'Rating', 'Return Rate (%)',
      'Status', 'Is Verified', 'Joined Date',
    ];

    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = sellers.map(sl => [
      sl.id, sl.user.fullName, sl.user.email || '', sl.user.phone || '',
      sl.businessName, sl.businessType, sl.gstin || '', sl.panNumber || '', sl.fssaiLicense || '', sl.drugLicense || '',
      sl.city || '', sl.state || '', sl.pincode || '',
      sl.contactEmail, sl.contactPhone, sl.whatsapp || '',
      sl.bankName || '', sl.bankAccountNumber || '', sl.bankIfsc || '', sl.upiId || '',
      sl.commissionRate, sl.tdsRate,
      sl.totalSales, sl.totalOrders, sl.totalProducts, sl.rating, sl.returnRate,
      sl.status, sl.isVerified ? 'Yes' : 'No',
      new Date(sl.createdAt).toISOString().slice(0, 10),
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    s.setHeader('Content-Type', 'text/csv');
    s.setHeader('Content-Disposition', `attachment; filename="sellers-directory-${new Date().toISOString().slice(0, 10)}.csv"`);
    s.send(csv);
  } catch (e) { n(e); }
});

export default r;
