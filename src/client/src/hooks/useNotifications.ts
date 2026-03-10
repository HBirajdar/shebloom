// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../services/api';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await notificationAPI.list();
      const data = res.data?.data ?? [];
      setNotifications(data);
      setUnreadCount(res.data?.unreadCount ?? data.filter((n: Notification) => !n.isRead).length);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to load notifications';
      setError(msg);
      // Don't toast on initial load failure — silently degrade
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationAPI.markRead(id);
    } catch (e: any) {
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
      setUnreadCount(prev => prev + 1);
      toast.error('Could not mark as read');
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const prevNotifications = notifications;
    const prevCount = unreadCount;
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationAPI.markAllRead();
      toast.success('All notifications marked as read');
    } catch (e: any) {
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
      toast.error('Failed to mark all as read');
    }
  }, [notifications, unreadCount]);

  return { notifications, unreadCount, loading, error, markRead, markAllRead, refresh };
}
