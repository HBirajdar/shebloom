// ══════════════════════════════════════════════════════
// Payment Routes — Razorpay + COD orders
// ══════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import { sendOrderConfirmation } from '../services/email.service';

const r = Router();

// POST /payments/webhook — Razorpay server-to-server webhook
// NOTE: This route must be BEFORE r.use(authenticate)
// and needs raw body — registered separately in app.ts
r.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Payment] RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook');
      res.status(400).json({ error: 'Webhook not configured' });
      return;
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing webhook signature header' });
      return;
    }

    // Use raw body bytes for signature verification (raw middleware applied in app.ts)
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(400).json({ error: 'Invalid webhook signature' }); return;
    }

    // Parse body only after signature is verified
    const event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    if (event.event === 'payment.captured') {
      const paymentId = event.payload?.payment?.entity?.id;
      const razorpayOrderId = event.payload?.payment?.entity?.order_id;

      if (razorpayOrderId) {
        // Atomically find and update the order (only if still PENDING — prevents double processing)
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId, paymentStatus: 'PENDING' },
          include: { items: true },
        });
        if (order) {
          // Use updateMany with paymentStatus check as a guard against race with /verify
          const updated = await prisma.order.updateMany({
            where: { id: order.id, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'PAID', paymentId, orderStatus: 'CONFIRMED' },
          });
          // Only decrement stock + record coupon if WE were the one who updated
          if (updated.count > 0) {
            try {
              await prisma.$transaction(async (tx) => {
                for (const item of order.items) {
                  await tx.product.updateMany({
                    where: { id: item.productId, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                  });
                }
                if (order.couponCode) {
                  const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode! } });
                  if (coupon) {
                    await tx.couponRedemption.create({
                      data: { couponId: coupon.id, userId: order.userId, orderId: order.id, discount: order.couponDiscount || 0 },
                    });
                    await tx.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
                  }
                }
              });
            } catch (e: any) {
              console.error('[CRITICAL] Webhook stock/coupon transaction failed for order', order.id, ':', e.message);
            }
            // Audit log: webhook captured
            auditLog({
              userId: order.userId, eventType: 'WEBHOOK_CAPTURED', orderId: order.id,
              orderNumber: order.orderNumber, razorpayOrderId, razorpayPaymentId: paymentId,
              subtotal: order.subtotal, couponCode: order.couponCode || undefined,
              couponDiscount: order.couponDiscount, platformFee: order.platformFee,
              deliveryCharge: order.deliveryCharge, totalAmount: order.totalAmount,
              paymentMethod: 'razorpay', metadata: { source: 'razorpay_webhook' },
            });
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (e) {
    res.status(200).json({ received: true }); // Always return 200 to Razorpay
  }
});

r.use(authenticate);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Helper: get platform config
async function getConfig() {
  let c = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
  if (!c) c = await prisma.platformConfig.create({ data: { id: 'default' } });
  return c;
}

// Helper: validate & calculate coupon discount
async function applyCoupon(code: string, userId: string, amount: number, scope: string, productIds?: string[], doctorId?: string) {
  if (!code) return { discount: 0, couponCode: null };
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
    include: { redemptions: { where: { userId } } },
  });
  if (!coupon || !coupon.isActive) return { discount: 0, couponCode: null, error: 'Invalid coupon' };
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) return { discount: 0, couponCode: null, error: 'Coupon not yet active' };
  if (coupon.validUntil && now > coupon.validUntil) return { discount: 0, couponCode: null, error: 'Coupon expired' };
  if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== scope) return { discount: 0, couponCode: null, error: `Coupon valid for ${coupon.applicableTo.toLowerCase()} only` };
  if (amount > 0 && amount < coupon.minOrderAmount) return { discount: 0, couponCode: null, error: `Min ₹${coupon.minOrderAmount} required` };
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return { discount: 0, couponCode: null, error: 'Coupon limit reached' };
  if (coupon.redemptions.length >= coupon.maxUsesPerUser) return { discount: 0, couponCode: null, error: 'Already used' };
  // First-order-only check (like Zepto/PharmEasy)
  if (coupon.firstOrderOnly) {
    const hasOrders = await prisma.order.count({ where: { userId, paymentStatus: 'PAID' } });
    const hasAppointments = await prisma.appointment.count({ where: { userId, status: { not: 'CANCELLED' } } });
    if (hasOrders > 0 || hasAppointments > 0) return { discount: 0, couponCode: null, error: 'This coupon is for first-time users only' };
  }
  if (doctorId && coupon.specificDoctorIds.length > 0 && !coupon.specificDoctorIds.includes(doctorId)) return { discount: 0, couponCode: null, error: 'Not valid for this doctor' };
  if (productIds?.length && coupon.specificProductIds.length > 0 && !productIds.some(pid => coupon.specificProductIds.includes(pid))) return { discount: 0, couponCode: null, error: 'Not valid for these products' };

  let discount = coupon.discountType === 'PERCENTAGE'
    ? amount * (coupon.discountValue / 100)
    : coupon.discountValue;
  if (coupon.discountType === 'PERCENTAGE' && coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
    discount = coupon.maxDiscountAmount;
  }
  discount = Math.min(discount, amount); // Never exceed amount
  return { discount: Math.round(discount * 100) / 100, couponCode: coupon.code, couponId: coupon.id };
}

// Helper: record coupon redemption
async function recordCouponRedemption(couponCode: string, userId: string, discount: number, orderId?: string, appointmentId?: string) {
  if (!couponCode) return;
  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
  if (!coupon) return;
  await prisma.couponRedemption.create({
    data: { couponId: coupon.id, userId, orderId, appointmentId, discount },
  });
  await prisma.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
}

// Helper: write immutable payment audit log entry
async function auditLog(entry: {
  userId: string; eventType: string;
  orderId?: string; appointmentId?: string; orderNumber?: string;
  razorpayOrderId?: string; razorpayPaymentId?: string;
  subtotal?: number; couponCode?: string; couponDiscount?: number;
  platformFee?: number; deliveryCharge?: number; codCharge?: number;
  gstAmount?: number; totalAmount?: number;
  paymentMethod?: string; currency?: string; doctorId?: string;
  commissionRate?: number; ipAddress?: string; userAgent?: string; metadata?: any;
}) {
  await prisma.paymentAuditLog.create({ data: entry as any }).catch((e) => {
    console.error('[AuditLog] Failed to write:', e.message);
  });
}

// Helper: create seller transaction records for each order item
async function createSellerTransactions(orderId: string, orderItems: any[], deliveryAddress: any, paymentMethod: string) {
  try {
    // Fetch products with seller info
    const productIds = orderItems.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sellerId: true },
    });
    const sellerMap = new Map(products.map(p => [p.id, p.sellerId]));

    for (const item of orderItems) {
      const sellerId = sellerMap.get(item.productId);
      if (!sellerId) continue; // Platform-owned product, skip

      const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
      if (!seller || seller.status !== 'APPROVED') continue;

      const grossAmount = item.price * item.quantity;
      const commissionRate = seller.commissionRate;
      const commissionAmount = Math.round(grossAmount * commissionRate / 100 * 100) / 100;
      const tdsRate = seller.tdsRate || 0;
      const tdsAmount = Math.round(grossAmount * tdsRate / 100 * 100) / 100;
      const netAmount = Math.round((grossAmount - commissionAmount - tdsAmount) * 100) / 100;

      const addr = deliveryAddress || {};
      await prisma.sellerTransaction.create({
        data: {
          sellerId,
          orderId,
          orderItemId: item.id || '',
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          salePrice: item.price,
          grossAmount,
          commissionRate,
          commissionAmount,
          tdsRate,
          tdsAmount,
          netAmount,
          buyerCity: addr.city || null,
          buyerState: addr.state || null,
          buyerPincode: addr.pincode || null,
          paymentMethod,
        },
      });

      // Update seller lifetime stats
      await prisma.seller.update({
        where: { id: sellerId },
        data: {
          totalSales: { increment: grossAmount },
          totalOrders: { increment: 1 },
        },
      }).catch((e: any) => console.error('[SellerStats] Update failed for seller', sellerId, ':', e.message));
    }
  } catch (e: any) {
    console.error('[SellerTransaction] Failed:', e.message);
  }
}

// POST /payments/create-order
r.post('/create-order', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { items, deliveryAddress, notes, couponCode } = q.body;
    const uid = q.user!.id;
    const config = await getConfig();

    if (!items?.length) { errorResponse(s, 'Cart is empty', 400); return; }
    if (!deliveryAddress?.fullName || !deliveryAddress?.phone || !deliveryAddress?.addressLine1 || !deliveryAddress?.city || !deliveryAddress?.state || !deliveryAddress?.pincode) {
      errorResponse(s, 'Complete delivery address required', 400); return;
    }

    // Fetch products + validate
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) { errorResponse(s, `Product not found: ${item.productId}`, 400); return; }
      if (!(product as any).inStock || (product as any).stock < item.quantity) {
        errorResponse(s, `Insufficient stock for "${(product as any).name}" (available: ${(product as any).stock || 0})`, 400); return;
      }
      const price = (product as any).discountPrice ?? (product as any).price;
      const totalPrice = price * item.quantity;
      subtotal += totalPrice;
      orderItems.push({ productId: product.id, productName: (product as any).name, quantity: item.quantity, price, totalPrice, sellerId: (product as any).sellerId || null });
    }

    // Min order check
    if (config.minOrderAmount > 0 && subtotal < config.minOrderAmount) {
      errorResponse(s, `Minimum order amount is ₹${config.minOrderAmount}`, 400); return;
    }

    // Apply coupon
    const couponResult = await applyCoupon(couponCode, uid, subtotal, 'PRODUCTS', productIds);
    if (couponCode && couponResult.error) { errorResponse(s, couponResult.error, 400); return; }
    const couponDiscount = couponResult.discount;

    // Calculate fees (like Zomato/Zepto platform fee model)
    const deliveryCharge = subtotal >= config.freeDeliveryAbove ? 0 : config.deliveryCharge;
    const platformFee = Math.round((config.platformFeeFlat + (subtotal * config.platformFeePercent / 100)) * 100) / 100;
    const afterDiscount = subtotal - couponDiscount;
    const totalAmount = Math.max(0, afterDiscount + deliveryCharge + platformFee);
    const orderNumber = `VC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: orderNumber,
    });

    // Save to DB
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: uid,
        subtotal,
        discount: couponDiscount,
        couponCode: couponResult.couponCode || null,
        couponDiscount,
        platformFee,
        deliveryCharge,
        totalAmount,
        paymentMethod: 'razorpay',
        paymentStatus: 'PENDING',
        razorpayOrderId: rzpOrder.id,
        orderStatus: 'PENDING',
        deliveryAddress: deliveryAddress as any,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Audit log: order created
    auditLog({
      userId: uid, eventType: 'ORDER_CREATED', orderId: order.id, orderNumber,
      razorpayOrderId: rzpOrder.id, subtotal, couponCode: couponResult.couponCode || undefined,
      couponDiscount, platformFee, deliveryCharge, totalAmount,
      paymentMethod: 'razorpay', ipAddress: q.ip || undefined,
      userAgent: q.headers['user-agent'] || undefined,
    });

    successResponse(s, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      breakdown: { subtotal, couponDiscount, platformFee, deliveryCharge, total: totalAmount },
    });
  } catch (e) { n(e); }
});

// POST /payments/verify
r.post('/verify', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = q.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      errorResponse(s, 'Payment verification failed', 400); return;
    }

    // Fetch order with user — verify it belongs to the requesting user
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: q.user!.id },
      include: { items: true, user: { select: { email: true, fullName: true, phone: true } } },
    });
    if (!order) { errorResponse(s, 'Order not found', 404); return; }

    // Prevent re-verification of already paid/cancelled orders
    if (order.paymentStatus !== 'PENDING') {
      successResponse(s, { success: true, orderId, orderNumber: order.orderNumber, alreadyProcessed: true }); return;
    }

    // Atomically update order (guard against double processing from webhook race)
    const updated = await prisma.order.updateMany({
      where: { id: orderId, paymentStatus: 'PENDING' },
      data: {
        paymentStatus: 'PAID',
        paymentId: razorpayPaymentId,
        razorpaySignature,
        orderStatus: 'CONFIRMED',
      },
    });

    // Only decrement stock + record coupon if WE were the one who updated
    if (updated.count > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const item of order.items) {
            await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
          }
          if (order.couponCode) {
            const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode! } });
            if (coupon) {
              await tx.couponRedemption.create({
                data: { couponId: coupon.id, userId: order.userId, orderId: order.id, discount: order.couponDiscount || 0 },
              });
              await tx.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
            }
          }
        });
      } catch (e: any) {
        console.error('[CRITICAL] Verify stock/coupon transaction failed for order', order.id, ':', e.message);
      }
      // Audit log: order paid
      auditLog({
        userId: order.userId, eventType: 'ORDER_PAID', orderId: order.id,
        orderNumber: order.orderNumber, razorpayOrderId, razorpayPaymentId,
        subtotal: order.subtotal, couponCode: order.couponCode || undefined,
        couponDiscount: order.couponDiscount, platformFee: order.platformFee,
        deliveryCharge: order.deliveryCharge, totalAmount: order.totalAmount,
        paymentMethod: 'razorpay', ipAddress: q.ip || undefined,
      });

      // Create seller transactions for marketplace payouts
      try {
        await createSellerTransactions(order.id, order.items, order.deliveryAddress, 'razorpay');
      } catch (e: any) {
        console.error('[CRITICAL] Seller transaction creation failed for order', order.id, e.message);
      }
    }

    // Send order confirmation email (best-effort)
    if (order.user.email) {
      const addr = order.deliveryAddress as any;
      sendOrderConfirmation(order.user.email, {
        customerName: order.user.fullName || addr?.fullName || 'Customer',
        orderId: order.orderNumber,
        items: order.items.map(i => ({ name: i.productName, qty: i.quantity, price: i.price })),
        total: order.totalAmount,
        deliveryAddress: `${addr?.addressLine1 || ''}, ${addr?.city || ''}, ${addr?.state || ''} ${addr?.pincode || ''}`,
        estimatedDelivery: '5-7 business days',
      }).catch(() => {});
    }

    successResponse(s, { success: true, orderId, orderNumber: order.orderNumber });
  } catch (e) { n(e); }
});

// POST /payments/cod
r.post('/cod', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { items, deliveryAddress, notes, couponCode } = q.body;
    const uid = q.user!.id;
    const config = await getConfig();

    if (!config.codEnabled) { errorResponse(s, 'Cash on Delivery is not available', 400); return; }
    if (!items?.length) { errorResponse(s, 'Cart is empty', 400); return; }
    if (!deliveryAddress?.fullName || !deliveryAddress?.phone || !deliveryAddress?.addressLine1 || !deliveryAddress?.city || !deliveryAddress?.state || !deliveryAddress?.pincode) {
      errorResponse(s, 'Complete delivery address required', 400); return;
    }

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) { errorResponse(s, `Product not found: ${item.productId}`, 400); return; }
      if (!(product as any).inStock || (product as any).stock < item.quantity) {
        errorResponse(s, `Insufficient stock for "${(product as any).name}" (available: ${(product as any).stock || 0})`, 400); return;
      }
      const price = (product as any).discountPrice ?? (product as any).price;
      const totalPrice = price * item.quantity;
      subtotal += totalPrice;
      orderItems.push({ productId: product.id, productName: (product as any).name, quantity: item.quantity, price, totalPrice, sellerId: (product as any).sellerId || null });
    }

    if (config.minOrderAmount > 0 && subtotal < config.minOrderAmount) {
      errorResponse(s, `Minimum order amount is ₹${config.minOrderAmount}`, 400); return;
    }

    // Apply coupon
    const couponResult = await applyCoupon(couponCode, uid, subtotal, 'PRODUCTS', productIds);
    if (couponCode && couponResult.error) { errorResponse(s, couponResult.error, 400); return; }
    const couponDiscount = couponResult.discount;

    const deliveryCharge = subtotal >= config.freeDeliveryAbove ? 0 : config.deliveryCharge;
    const platformFee = Math.round((config.platformFeeFlat + (subtotal * config.platformFeePercent / 100)) * 100) / 100;
    const codCharge = config.codExtraCharge || 0;
    const afterDiscount = subtotal - couponDiscount;
    const totalAmount = Math.max(0, afterDiscount + deliveryCharge + platformFee + codCharge);
    const orderNumber = `VC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: uid,
        subtotal,
        discount: couponDiscount,
        couponCode: couponResult.couponCode || null,
        couponDiscount,
        platformFee,
        deliveryCharge,
        totalAmount,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING_COD',
        orderStatus: 'CONFIRMED',
        deliveryAddress: deliveryAddress as any,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: true, user: { select: { email: true, fullName: true } } },
    });

    // Atomically decrement stock + record coupon in a single transaction
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of orderItems) {
          await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
        }
        if (couponResult.couponCode) {
          const coupon = await tx.coupon.findUnique({ where: { code: couponResult.couponCode! } });
          if (coupon) {
            await tx.couponRedemption.create({
              data: { couponId: coupon.id, userId: uid, orderId: order.id, discount: couponDiscount },
            });
            await tx.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
          }
        }
      });
    } catch (e: any) {
      console.error('[CRITICAL] COD stock/coupon transaction failed for order', order.id, ':', e.message);
    }

    // Audit log: COD order placed
    auditLog({
      userId: uid, eventType: 'ORDER_COD', orderId: order.id, orderNumber,
      subtotal, couponCode: couponResult.couponCode || undefined,
      couponDiscount, platformFee, deliveryCharge, codCharge, totalAmount,
      paymentMethod: 'COD', ipAddress: q.ip || undefined,
      userAgent: q.headers['user-agent'] || undefined,
    });

    // Create seller transactions for marketplace payouts
    try {
      await createSellerTransactions(order.id, order.items, deliveryAddress, 'COD');
    } catch (e: any) {
      console.error('[CRITICAL] Seller transaction creation failed for order', order.id, e.message);
    }

    // Send order confirmation email
    if (order.user.email) {
      const addr = order.deliveryAddress as any;
      sendOrderConfirmation(order.user.email, {
        customerName: order.user.fullName || addr?.fullName || 'Customer',
        orderId: order.orderNumber,
        items: order.items.map(i => ({ name: i.productName, qty: i.quantity, price: i.price })),
        total: order.totalAmount,
        deliveryAddress: `${addr?.addressLine1 || ''}, ${addr?.city || ''}, ${addr?.state || ''} ${addr?.pincode || ''}`,
        estimatedDelivery: '5-7 business days',
      }).catch(() => {});
    }

    successResponse(s, {
      success: true, orderId: order.id, orderNumber: order.orderNumber,
      breakdown: { subtotal, couponDiscount, platformFee, deliveryCharge, codCharge, total: totalAmount },
    }, 'Order placed successfully', 201);
  } catch (e) { n(e); }
});

// POST /payments/appointment-order — Create Razorpay order for doctor consultation
// Supports coupons, platform fee, per-doctor commission tracking
r.post('/appointment-order', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { doctorId, couponCode } = q.body;
    const uid = q.user!.id;
    const config = await getConfig();

    if (!doctorId) { errorResponse(s, 'Doctor ID is required', 400); return; }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) { errorResponse(s, 'Doctor not found', 404); return; }

    const originalFee = doctor.consultationFee || 0;
    if (originalFee <= 0) {
      successResponse(s, { free: true, doctorId, amount: 0, originalFee: 0, breakdown: { originalFee: 0, couponDiscount: 0, platformFee: 0, total: 0 } });
      return;
    }

    // Apply coupon (if provided)
    const couponResult = await applyCoupon(couponCode, uid, originalFee, 'CONSULTATION', undefined, doctorId);
    if (couponCode && couponResult.error) { errorResponse(s, couponResult.error, 400); return; }
    const couponDiscount = couponResult.discount;

    // Platform convenience fee (like Practo booking fee)
    const platformFee = Math.round((config.platformFeeFlat + (originalFee * config.platformFeePercent / 100)) * 100) / 100;

    // Final amount = original fee - coupon + platform fee
    const finalAmount = Math.max(0, originalFee - couponDiscount + platformFee);

    // Per-doctor commission rate (Practo model: top docs get lower rate)
    const commissionRate = doctor.commissionRate ?? config.defaultDoctorCommission;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      errorResponse(s, 'Payment gateway not configured. Please contact support.', 500); return;
    }

    const receipt = `APPT-${Date.now()}`;
    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: 'INR',
        receipt,
        notes: {
          type: 'appointment',
          doctorId: String(doctorId),
          userId: String(uid),
          doctorName: String(doctor.fullName || 'Doctor'),
          couponCode: couponResult.couponCode || '',
        },
      });
    } catch (rzpErr: any) {
      console.error('[Razorpay] Order creation failed:', rzpErr?.error || rzpErr?.message || rzpErr);
      errorResponse(s, rzpErr?.error?.description || 'Payment gateway error. Please try again later.', 502); return;
    }

    // Audit log: appointment order created
    auditLog({
      userId: uid, eventType: 'APPOINTMENT_ORDER_CREATED', doctorId,
      razorpayOrderId: rzpOrder.id, subtotal: originalFee,
      couponCode: couponResult.couponCode || undefined, couponDiscount,
      platformFee, totalAmount: finalAmount, paymentMethod: 'razorpay',
      commissionRate, ipAddress: q.ip || undefined,
      userAgent: q.headers['user-agent'] || undefined,
    });

    successResponse(s, {
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      doctorName: doctor.fullName,
      fee: finalAmount,
      originalFee,
      couponCode: couponResult.couponCode || null,
      couponDiscount,
      breakdown: {
        originalFee,
        couponDiscount,
        platformFee,
        total: finalAmount,
      },
    });
  } catch (e) { n(e); }
});

// POST /payments/verify-appointment — Verify appointment payment + record coupon redemption
r.post('/verify-appointment', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = q.body;
    const uid = q.user!.id;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      errorResponse(s, 'Payment verification failed', 400); return;
    }

    // Retrieve the Razorpay order to get coupon info from notes
    let rzpOrder: any = null;
    try {
      rzpOrder = await razorpay.orders.fetch(razorpayOrderId);
    } catch {}

    const orderNotes = rzpOrder?.notes || {};
    const couponCode = orderNotes.couponCode || null;
    const doctorId = orderNotes.doctorId || null;

    // Record coupon redemption (appointment financial data is set via appointment creation route)
    let couponDiscount = 0;
    if (couponCode) {
      if (doctorId) {
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        const result = await applyCoupon(couponCode, uid, doctor?.consultationFee || 0, 'CONSULTATION', undefined, doctorId);
        couponDiscount = result.discount;
      }
      await recordCouponRedemption(couponCode, uid, couponDiscount).catch((e: any) => console.error('[Coupon] Appointment redemption recording failed:', e.message));
    }

    // Audit log: appointment paid
    const paidAmount = rzpOrder ? (rzpOrder.amount / 100) : 0;
    auditLog({
      userId: uid, eventType: 'APPOINTMENT_PAID', doctorId: doctorId || undefined,
      razorpayOrderId, razorpayPaymentId,
      couponCode: couponCode || undefined, couponDiscount,
      totalAmount: paidAmount, paymentMethod: 'razorpay',
      ipAddress: q.ip || undefined,
      userAgent: q.headers['user-agent'] || undefined,
    });

    successResponse(s, { verified: true, paymentId: razorpayPaymentId });
  } catch (e) { n(e); }
});

// GET /payments/orders
r.get('/orders', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: q.user!.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(s, orders);
  } catch (e) { n(e); }
});

// GET /payments/orders/:id
r.get('/orders/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: q.params.id, userId: q.user!.id },
      include: { items: true },
    });
    if (!order) { errorResponse(s, 'Order not found', 404); return; }
    successResponse(s, order);
  } catch (e) { n(e); }
});

export default r;
