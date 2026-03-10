// @ts-nocheck
import { useState, useCallback } from 'react';
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cartAPI.list();
      setItems(res.data?.data?.items ?? []);
    } catch {
      // Cart is also managed locally — silent fail is acceptable
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (product: { productId: string; name: string; price: number; image?: string; qty?: number }) => {
    // Optimistic local update
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.productId);
      if (existing) {
        return prev.map(i => i.productId === product.productId
          ? { ...i, qty: Math.min(i.qty + (product.qty || 1), 10) }
          : i
        );
      }
      return [...prev, {
        id: `local-${product.productId}-${Date.now()}`,
        productId: product.productId,
        name: product.name,
        price: product.price,
        image: product.image || '',
        qty: product.qty || 1,
        addedAt: new Date().toISOString(),
      }];
    });
    toast.success(`${product.name} added to cart 🛍️`);

    // Sync with server (best-effort)
    try {
      await cartAPI.add(product);
    } catch {
      // Already optimistically added — server sync failure is non-critical
    }
  }, []);

  const removeFromCart = useCallback(async (id: string) => {
    const prevItems = items;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await cartAPI.remove(id);
    } catch {
      setItems(prevItems);
      toast.error('Failed to remove item');
    }
  }, [items]);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty < 1) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.min(qty, 10) } : i));
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return { items, total, count, loading, addToCart, removeFromCart, updateQty, clearCart, fetchCart };
}
