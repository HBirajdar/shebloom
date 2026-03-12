// @ts-nocheck
/**
 * VedaClue Data Hooks — Connects React to FastAPI backend
 * 
 * This is the SINGLE SOURCE OF TRUTH layer.
 * Every page reads/writes data through these hooks.
 * Data flows: React → API → PostgreSQL → API → React
 */
import { useState, useEffect, useCallback } from 'react';
import { api, userAPI, cycleAPI, moodAPI, appointmentAPI, doctorAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import toast from 'react-hot-toast';

// ─── Profile Hook ────────────────────────────────
// Fetches user profile from backend on mount
// Updates backend on save, then syncs local state
export function useProfile() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await userAPI.me();
      const data = res.data.data || res.data;
      setProfile(data);
      if (data && user) {
        setUser({ ...user, fullName: data.fullName || user.fullName, email: data.email || user.email });
      }
    } catch { /* ignore if not logged in */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { if (user) fetchProfile(); }, [user?.id]);

  const updateProfile = async (updates: any) => {
    try {
      const res = await userAPI.update(updates);
      const data = res.data.data || res.data;
      setProfile(data);
      if (data && user) {
        setUser({ ...user, fullName: data.fullName || user.fullName, email: data.email || user.email });
      }
      toast.success('Profile updated!');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
      return false;
    }
  };

  const updateGoalAndCycle = async (goal: string, cycleLength: number, periodLength: number, interests?: string[]) => {
    try {
      await userAPI.updateProfile({ primaryGoal: goal, cycleLength, periodLength, interests });
      toast.success('Settings saved!');
      return true;
    } catch {
      toast.error('Failed to save');
      return false;
    }
  };

  return { profile, loading, fetchProfile, updateProfile, updateGoalAndCycle };
}

// ─── Cycle Data Hook ─────────────────────────────
// Fetches cycle predictions from backend
// Syncs with Zustand store for quick access across pages
export function useCycleData() {
  const setCycleData = useCycleStore(s => s.setCycleData);
  const cycleData = useCycleStore();
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<any[]>([]);

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await cycleAPI.predict();
      const data = res.data.data;
      if (data) {
        setCycleData({
          cycleDay: data.cycleDay || cycleData.cycleDay,
          phase: data.phase || cycleData.phase,
          daysUntilPeriod: data.daysUntilPeriod ?? cycleData.daysUntilPeriod,
          cycleLength: data.cycleLength || cycleData.cycleLength,
          periodLength: data.periodLength || cycleData.periodLength,
        });
      }
    } catch { /* silently fail - use defaults */ }
    setLoading(false);
  }, [user?.id]);

  const fetchCycles = useCallback(async () => {
    try {
      const res = await cycleAPI.list();
      setCycles(res.data.data || []);
    } catch {}
  }, [user?.id]);

  const logPeriod = async (data: { startDate: string; endDate?: string; flow?: string }) => {
    try {
      await cycleAPI.log(data);
      toast.success('Period logged!');
      await fetchPredictions(); // Refresh predictions
      await fetchCycles();
      return true;
    } catch {
      toast.error('Failed to log');
      return false;
    }
  };

  const logSymptoms = async (symptoms: string[], date?: string) => {
    try {
      await cycleAPI.logSymptoms({ symptoms, date });
      toast.success('Symptoms saved!');
      return true;
    } catch {
      toast.error('Failed to save');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchPredictions();
      fetchCycles();
    }
  }, [user?.id]);

  return { ...cycleData, loading, cycles, fetchPredictions, fetchCycles, logPeriod, logSymptoms };
}

// ─── Mood Hook ───────────────────────────────────
export function useMoodData() {
  const user = useAuthStore(s => s.user);
  const [history, setHistory] = useState<any[]>([]);

  const logMood = async (mood: string) => {
    try {
      await moodAPI.log({ mood });
      toast.success('Mood logged!');
      return true;
    } catch {
      toast.error('Failed');
      return false;
    }
  };

  const fetchHistory = useCallback(async (days = 30) => {
    try {
      const res = await moodAPI.history(days);
      setHistory(res.data.data || []);
    } catch {}
  }, [user?.id]);

  useEffect(() => { if (user) fetchHistory(); }, [user?.id]);

  return { history, logMood, fetchHistory };
}

// ─── Appointments Hook ───────────────────────────
// REAL bookings that persist in PostgreSQL
export function useAppointments() {
  const user = useAuthStore(s => s.user);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await appointmentAPI.list();
      setBookings(res.data.data || []);
    } catch {}
    setLoading(false);
  }, [user?.id]);

  const createBooking = async (data: { doctorId: string; scheduledAt: string; reason?: string; notes?: string }) => {
    try {
      const res = await appointmentAPI.create(data);
      toast.success('Appointment booked!');
      await fetchBookings(); // Refresh list
      return res.data.data;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Booking failed');
      return null;
    }
  };

  const cancelBooking = async (id: string, reason?: string) => {
    try {
      await appointmentAPI.cancel(id, reason);
      toast.success('Appointment cancelled');
      await fetchBookings();
      return true;
    } catch {
      toast.error('Failed to cancel');
      return false;
    }
  };

  useEffect(() => { if (user) fetchBookings(); }, [user?.id]);

  return { bookings, loading, fetchBookings, createBooking, cancelBooking };
}

// ─── Doctors Hook ────────────────────────────────
export function useDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await doctorAPI.search({});
      const data = res.data.doctors || res.data.data || [];
      if (data.length > 0) setDoctors(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, []);

  return { doctors, loading, fetchDoctors };
}

// ─── App Init Hook ───────────────────────────────
// Call this ONCE in App.tsx or Dashboard to bootstrap all data
export function useAppInit() {
  const user = useAuthStore(s => s.user);
  const isAuth = useAuthStore(s => s.isAuthenticated);
  const setCycleData = useCycleStore(s => s.setCycleData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuth || !user) { setReady(true); return; }

    const init = async () => {
      try {
        // Fetch profile
        const profileRes = await userAPI.me();
        const profile = profileRes.data.data || profileRes.data;
        if (profile) {
          const authStore = useAuthStore.getState();
          authStore.setUser({ ...user, fullName: profile.fullName || user.fullName, email: profile.email || user.email });
        }

        // Sync dosha from localStorage to backend if not yet persisted
        const localDosha = localStorage.getItem('sb_dosha');
        if (localDosha && profile?.profile && !profile.profile.dosha) {
          try { await userAPI.updateProfile({ dosha: localDosha }); } catch {}
        }

        // Fetch cycle predictions
        const cycleRes = await cycleAPI.predict();
        const cycle = cycleRes.data.data;
        if (cycle) {
          setCycleData({
            cycleDay: cycle.cycleDay, phase: cycle.phase,
            daysUntilPeriod: cycle.daysUntilPeriod,
            cycleLength: cycle.cycleLength, periodLength: cycle.periodLength,
          });
        }
      } catch { /* continue with defaults */ }
      setReady(true);
    };

    init();
  }, [isAuth, user?.id]);

  return { ready };
}
