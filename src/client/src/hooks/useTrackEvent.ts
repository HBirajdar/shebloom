import { useCallback, useRef } from 'react';
import { analyticsAPI } from '../services/api';

// Generate a session ID that persists for the browser tab lifetime
const SESSION_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('vc_sid') || (() => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('vc_sid', id);
      return id;
    })())
  : '';

interface TrackOptions {
  category?: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

/**
 * Fire-and-forget event tracking hook.
 * Events are batched and sent every 3 seconds to minimize network requests.
 * Falls back to immediate send on page unload.
 */
export function useTrackEvent() {
  const queueRef = useRef<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const batch = [...queueRef.current];
    queueRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (batch.length === 1) {
      analyticsAPI.track(batch[0]);
    } else {
      analyticsAPI.trackBatch(batch);
    }
  }, []);

  const track = useCallback((event: string, options?: TrackOptions) => {
    queueRef.current.push({
      event,
      category: options?.category,
      label: options?.label,
      value: options?.value,
      metadata: options?.metadata,
      sessionId: SESSION_ID,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });

    // Debounce: flush after 3s of inactivity
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 3000);

    // If queue gets large, flush immediately
    if (queueRef.current.length >= 10) flush();
  }, [flush]);

  return { track, flush };
}

/**
 * Standalone track function for use outside React components
 * (e.g., in stores, utilities, or event handlers)
 */
export function trackEvent(event: string, options?: TrackOptions) {
  analyticsAPI.track({
    event,
    category: options?.category,
    label: options?.label,
    value: options?.value,
    metadata: options?.metadata,
    sessionId: SESSION_ID,
  });
}
