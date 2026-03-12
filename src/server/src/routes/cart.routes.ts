// ══════════════════════════════════════════════════════
// src/server/src/routes/cart.routes.ts
// In-memory per-user session cart (no Cart model in DB)
// Cart is also managed client-side in AyurvedaPage.tsx
// POST /cart/add    – add item
// GET  /cart        – get cart
// DELETE /cart/:id  – remove item
// POST /cart/checkout – checkout (logs order enquiry)
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();
r.use(authenticate);

// In-memory store: { userId -> CartItem[] }
// In production this should move to Redis or a Cart DB model
const cartStore = new Map<string, CartItem[]>();

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  addedAt: string;
}

const getCart = (userId: string): CartItem[] => cartStore.get(userId) || [];
const setCart = (userId: string, items: CartItem[]) => cartStore.set(userId, items);

// ─── GET /cart ───────────────────────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const items = getCart(q.user!.id);
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    successResponse(s, { items, total, count: items.reduce((sum, i) => sum + i.qty, 0) });
  } catch (e) { n(e); }
});

// ─── POST /cart/add ──────────────────────────────────
r.post('/add', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const { productId, qty = 1 } = q.body;

    if (!productId) {
      errorResponse(s, 'productId is required', 400);
      return;
    }

    // Always fetch price from DB to prevent price manipulation
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, discountPrice: true, imageUrl: true, inStock: true, stock: true },
    });
    if (!product) { errorResponse(s, 'Product not found', 404); return; }
    if (!product.inStock || (product.stock ?? 0) <= 0) { errorResponse(s, 'Product is out of stock', 400); return; }

    const verifiedPrice = product.discountPrice ?? product.price;

    const cart = getCart(uid);
    const existing = cart.find(i => i.productId === productId);

    if (existing) {
      existing.qty = Math.min(existing.qty + (qty || 1), 10);
      existing.price = verifiedPrice; // Always use DB price
    } else {
      cart.push({
        id: `${uid}-${productId}-${Date.now()}`,
        productId,
        name: product.name,
        price: verifiedPrice,
        image: product.imageUrl || '',
        qty: Math.min(qty || 1, 10),
        addedAt: new Date().toISOString(),
      });
    }

    setCart(uid, cart);
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    successResponse(s, { items: cart, total }, `${product.name} added to cart`);
  } catch (e) { n(e); }
});

// ─── DELETE /cart/:id ────────────────────────────────
r.delete('/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const cart = getCart(uid).filter(i => i.id !== q.params.id);
    setCart(uid, cart);
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    successResponse(s, { items: cart, total }, 'Item removed from cart');
  } catch (e) { n(e); }
});

// ─── POST /cart/checkout ─────────────────────────────
r.post('/checkout', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const cart = getCart(uid);
    if (cart.length === 0) {
      errorResponse(s, 'Cart is empty', 400);
      return;
    }
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    // Clear cart after checkout
    setCart(uid, []);
    successResponse(s, {
      orderId: `SB-${Date.now()}`,
      items: cart,
      total,
      status: 'enquiry_received',
    }, 'Your order enquiry has been received. Our team will contact you shortly.');
  } catch (e) { n(e); }
});

export default r;
