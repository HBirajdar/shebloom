// ══════════════════════════════════════════════════════
// Payment Routes — Razorpay + COD orders
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import { sendOrderConfirmation } from '../services/email.service';

const r = Router();
r.use(authenticate);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const DELIVERY_CHARGE = 49;
const FREE_DELIVERY_ABOVE = 499;

// POST /payments/create-order
r.post('/create-order', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { items, deliveryAddress, notes } = q.body;
    const uid = q.user!.id;

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

    const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
    const totalAmount = subtotal + deliveryCharge;
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
        deliveryCharge,
        totalAmount,
        paymentMethod: 'razorpay',
        paymentStatus: 'PENDING',
        razorpayOrderId: rzpOrder.id,
        orderStatus: 'PENDING',
        deliveryAddress: deliveryAddress as any,
        notes: notes || null,
        items: {
          create: orderItems,
        },
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

    // Reduce stock (best-effort, fire-and-forget)
    for (const item of order.items) {
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }).catch(() => {});
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
    const { items, deliveryAddress, notes } = q.body;
    const uid = q.user!.id;

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

    const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
    const totalAmount = subtotal + deliveryCharge;
    const orderNumber = `VC-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: uid,
        subtotal,
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

    successResponse(s, { success: true, orderId: order.id, orderNumber: order.orderNumber }, 'Order placed successfully', 201);
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
