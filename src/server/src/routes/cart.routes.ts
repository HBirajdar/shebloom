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
import { authenticate, AuthRequest } from '../middleware/auth';

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
    s.json({ success: true, data: { items, total, count: items.reduce((sum, i) => sum + i.qty, 0) } });
  } catch (e) { n(e); }
});

// ─── POST /cart/add ──────────────────────────────────
r.post('/add', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const { productId, name, price, image, qty = 1 } = q.body as Partial<CartItem>;

    if (!productId || !name || price === undefined) {
      s.status(400).json({ success: false, error: 'productId, name and price are required' });
      return;
    }

    const cart = getCart(uid);
    const existing = cart.find(i => i.productId === productId);

    if (existing) {
      existing.qty = Math.min(existing.qty + (qty || 1), 10);
    } else {
      cart.push({
        id: `${uid}-${productId}-${Date.now()}`,
        productId,
        name,
        price,
        image: image || '',
        qty: Math.min(qty || 1, 10),
        addedAt: new Date().toISOString(),
      });
    }

    setCart(uid, cart);
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    s.json({ success: true, data: { items: cart, total }, message: `${name} added to cart` });
  } catch (e) { n(e); }
});

// ─── DELETE /cart/:id ────────────────────────────────
r.delete('/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const cart = getCart(uid).filter(i => i.id !== q.params.id);
    setCart(uid, cart);
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    s.json({ success: true, data: { items: cart, total }, message: 'Item removed from cart' });
  } catch (e) { n(e); }
});

// ─── POST /cart/checkout ─────────────────────────────
r.post('/checkout', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const uid = q.user!.id;
    const cart = getCart(uid);
    if (cart.length === 0) {
      s.status(400).json({ success: false, error: 'Cart is empty' });
      return;
    }
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    // Clear cart after checkout
    setCart(uid, []);
    s.json({
      success: true,
      data: {
        orderId: `SB-${Date.now()}`,
        items: cart,
        total,
        status: 'enquiry_received',
        message: 'Your order enquiry has been received. Our team will contact you shortly.',
      },
    });
  } catch (e) { n(e); }
});

export default r;
