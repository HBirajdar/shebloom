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
    if (!webhookSecret) { res.status(200).json({ received: true }); return; }

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      res.status(400).json({ error: 'Invalid webhook signature' }); return;
    }

    const event = req.body;
    if (event.event === 'payment.captured') {
      const paymentId = event.payload?.payment?.entity?.id;
      const razorpayOrderId = event.payload?.payment?.entity?.order_id;

      if (razorpayOrderId) {
        // Find and update the order
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId, paymentStatus: 'PENDING' },
          include: { items: true },
        });
        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', paymentId, orderStatus: 'CONFIRMED' },
          });
          // Reduce stock
          for (const item of order.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            }).catch(() => {});
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
  if (amount < coupon.minOrderAmount) return { discount: 0, couponCode: null, error: `Min ₹${coupon.minOrderAmount} required` };
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return { discount: 0, couponCode: null, error: 'Coupon limit reached' };
  if (coupon.redemptions.length >= coupon.maxUsesPerUser) return { discount: 0, couponCode: null, error: 'Already used' };
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
      const price = (product as any).discountPrice || (product as any).price;
      const totalPrice = price * item.quantity;
      subtotal += totalPrice;
      orderItems.push({ productId: product.id, productName: (product as any).name, quantity: item.quantity, price, totalPrice });
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
    const orderNumber = `VC-${Date.now()}`;

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

    // Fetch order with user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, fullName: true, phone: true } } },
    });
    if (!order) { errorResponse(s, 'Order not found', 404); return; }

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        paymentId: razorpayPaymentId,
        razorpaySignature,
        orderStatus: 'CONFIRMED',
      },
    });

    // Reduce stock for each ordered item
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }).catch(() => {});
    }

    // Record coupon redemption
    if (order.couponCode) {
      await recordCouponRedemption(order.couponCode, order.userId, order.couponDiscount || 0, order.id).catch(() => {});
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

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) { errorResponse(s, `Product not found: ${item.productId}`, 400); return; }
      const price = (product as any).discountPrice || (product as any).price;
      const totalPrice = price * item.quantity;
      subtotal += totalPrice;
      orderItems.push({ productId: product.id, productName: (product as any).name, quantity: item.quantity, price, totalPrice });
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
    const orderNumber = `VC-${Date.now()}`;

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

    // Record coupon
    if (couponResult.couponCode) {
      await recordCouponRedemption(couponResult.couponCode, uid, couponDiscount, order.id).catch(() => {});
    }

    // Reduce stock
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }).catch(() => {});
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
      commissionRate,
      breakdown: {
        originalFee,
        couponDiscount,
        platformFee,
        total: finalAmount,
      },
    });
  } catch (e) { n(e); }
});

// POST /payments/verify-appointment — Verify appointment payment
r.post('/verify-appointment', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = q.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      errorResponse(s, 'Payment verification failed', 400); return;
    }

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
