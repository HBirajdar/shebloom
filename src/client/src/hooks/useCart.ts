import { useState, useCallback, useEffect } from 'react';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  addedAt: string;
}

const LS_KEY = 'sb_cart';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
function loadLocal(): CartItem[] {
  try {
    const items: CartItem[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    // Auto-clean items older than 30 days
    const now = Date.now();
    const fresh = items.filter(i => !i.addedAt || (now - new Date(i.addedAt).getTime()) < THIRTY_DAYS);
    if (fresh.length !== items.length) localStorage.setItem(LS_KEY, JSON.stringify(fresh));
    return fresh;
  } catch { return []; }
}
function saveLocal(items: CartItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

interface UseCartReturn {
  items: CartItem[];
  total: number;
  count: number;
  loading: boolean;
  addToCart: (product: { productId: string; name: string; price: number; image?: string; qty?: number }) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  fetchCart: () => Promise<void>;
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>(loadLocal);
  const [loading, setLoading] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  // Persist to localStorage whenever items change
  useEffect(() => {
    saveLocal(items);
  }, [items]);

  const fetchCart = useCallback(async () => {
    // Load from localStorage immediately (instant, no flicker)
    setItems(loadLocal());
    // Then try to sync from server (best-effort)
    try {
      setLoading(true);
      const res = await cartAPI.list();
      const serverItems: CartItem[] = res.data?.data?.items ?? [];
      if (serverItems.length > 0) {
        // Merge: server items win for shared ids, keep any local-only items
        const serverIds = new Set(serverItems.map(i => i.productId));
        const localOnly = loadLocal().filter(i => !serverIds.has(i.productId));
        const merged = [...serverItems, ...localOnly];
        setItems(merged);
        saveLocal(merged);
      }
    } catch {
      // Server unavailable — localStorage is the source of truth
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (product: { productId: string; name: string; price: number; image?: string; qty?: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.productId);
      let next: CartItem[];
      if (existing) {
        next = prev.map(i => i.productId === product.productId
          ? { ...i, qty: Math.min(i.qty + (product.qty || 1), 10) }
          : i
        );
      } else {
        next = [...prev, {
          id: `local-${product.productId}-${Date.now()}`,
          productId: product.productId,
          name: product.name,
          price: product.price,
          image: product.image || '',
          qty: product.qty || 1,
          addedAt: new Date().toISOString(),
        }];
      }
      saveLocal(next);
      return next;
    });
    toast.success(`${product.name} added to cart 🛍️`);

    // Sync with server (best-effort)
    try {
      await cartAPI.add(product);
    } catch {
      // localStorage already updated — non-critical
    }
  }, []);

  const removeFromCart = useCallback(async (id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveLocal(next);
      return next;
    });
    try {
      await cartAPI.remove(id);
    } catch {
      // Already removed from localStorage — non-critical
    }
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems(prev => {
      const next = qty < 1
        ? prev.filter(i => i.id !== id)
        : prev.map(i => i.id === id ? { ...i, qty: Math.min(qty, 10) } : i);
      saveLocal(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveLocal([]);
  }, []);

  return { items, total, count, loading, addToCart, removeFromCart, updateQty, clearCart, fetchCart };
}
