import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscriptionAPI } from '../services/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  interval: string;
  basePrice: number;
  isFree: boolean;
  emoji: string;
  highlights: string[];
  badge?: string;
}

interface UserSubscription {
  id: string;
  status: string;
  plan: SubscriptionPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndDate?: string;
  pricePaid: number;
  isAutoRenew: boolean;
}

interface SubscriptionState {
  subscription: UserSubscription | null;
  isPremium: boolean;
  isLoading: boolean;
  lastFetched: number;
  fetchSubscription: (force?: boolean) => Promise<void>;
  clearSubscription: () => void;
  hasFeature: (key: string) => boolean;
}

const PREMIUM_FEATURES = new Set([
  'cycle:bbt', 'cycle:cervical-mucus', 'cycle:fertility-daily',
  'cycle:fertility-insights', 'cycle:ayurvedic-insights', 'cycle:extended-history',
  'reports:export', 'reports:full', 'dosha:full-assessment',
  'programs:paid', 'articles:premium', 'appointments:priority', 'pregnancy:advanced',
]);

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscription: null,
      isPremium: false,
      isLoading: false,
      lastFetched: 0,

      fetchSubscription: async (force?: boolean) => {
        // Don't refetch within 60 seconds unless forced (e.g., after payment)
        if (!force && Date.now() - get().lastFetched < 60000) return;
        set({ isLoading: true });
        try {
          const res = await subscriptionAPI.getMySubscription();
          const data = res.data?.data || res.data;
          if (data && data.plan) {
            // CANCELLED subs only count as premium if currentPeriodEnd is in the future
            let active = ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(data.status);
            if (data.status === 'CANCELLED' && data.currentPeriodEnd) {
              active = new Date(data.currentPeriodEnd) > new Date();
            }
            set({ subscription: data, isPremium: active, lastFetched: Date.now() });
          } else {
            set({ subscription: null, isPremium: false, lastFetched: Date.now() });
          }
        } catch {
          set({ subscription: null, isPremium: false, lastFetched: Date.now() });
        } finally {
          set({ isLoading: false });
        }
      },

      clearSubscription: () => set({ subscription: null, isPremium: false, isLoading: false, lastFetched: 0 }),

      hasFeature: (key: string) => {
        if (!PREMIUM_FEATURES.has(key)) return true;
        return get().isPremium;
      },
    }),
    { name: 'vedaclue-subscription', partialize: (s) => ({ subscription: s.subscription, isPremium: s.isPremium, lastFetched: s.lastFetched }) }
  )
);
