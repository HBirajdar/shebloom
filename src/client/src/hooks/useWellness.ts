// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { wellnessAPI } from '../services/api';
import toast from 'react-hot-toast';

export interface WellnessActivity {
  id: string;
  title: string;
  description?: string;
  category: string;
  durationMinutes: number;
  difficulty: string;
  cyclePhases: string[];
  imageUrl?: string;
  instructions?: any;
}

export interface DailyScore {
  score: number;
  components: {
    mood: { score: number; logged: boolean };
    water: { score: number; glasses: number; target: number };
    symptoms: { score: number; count: number };
  };
  date: string;
}

interface UseWellnessReturn {
  activities: WellnessActivity[];
  dailyScore: DailyScore | null;
  loading: boolean;
  scoreLoading: boolean;
  error: string | null;
  logWater: (glasses: number) => Promise<void>;
  logSleep: (hours: number) => Promise<void>;
  logExercise: (minutes: number) => Promise<void>;
  fetchActivities: (params?: { category?: string; phase?: string }) => Promise<void>;
  refreshScore: () => Promise<void>;
}

export function useWellness(): UseWellnessReturn {
  const [activities, setActivities] = useState<WellnessActivity[]>([]);
  const [dailyScore, setDailyScore] = useState<DailyScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshScore = useCallback(async () => {
    try {
      setScoreLoading(true);
      const res = await wellnessAPI.dailyScore();
      setDailyScore(res.data?.data ?? null);
    } catch {
      // Silently fail — score is non-critical, UI uses local fallback
    } finally {
      setScoreLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async (params?: { category?: string; phase?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await wellnessAPI.list(params);
      setActivities(res.data?.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshScore();
    fetchActivities();
  }, []);

  const logWater = useCallback(async (glasses: number) => {
    try {
      await wellnessAPI.log({ type: 'water', value: glasses });
      await refreshScore();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to log water');
    }
  }, [refreshScore]);

  const logSleep = useCallback(async (hours: number) => {
    try {
      await wellnessAPI.log({ type: 'sleep', value: hours });
      toast.success(`${hours}h sleep logged ☁️`);
      await refreshScore();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to log sleep');
    }
  }, [refreshScore]);

  const logExercise = useCallback(async (minutes: number) => {
    try {
      await wellnessAPI.log({ type: 'exercise', value: minutes });
      toast.success(`${minutes} min exercise logged 💪`);
      await refreshScore();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to log exercise');
    }
  }, [refreshScore]);

  return {
    activities,
    dailyScore,
    loading,
    scoreLoading,
    error,
    logWater,
    logSleep,
    logExercise,
    fetchActivities,
    refreshScore,
  };
}
