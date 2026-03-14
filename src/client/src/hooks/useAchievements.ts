import { useState, useEffect, useCallback } from 'react';
import { achievementsAPI } from '../services/api';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
}

export interface AchievementSummary {
  total: number;
  earned: number;
  remaining: number;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  summary: AchievementSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Local fallback definitions for when API is unavailable
const LOCAL_DEFS: Achievement[] = [
  { id: 'first_period', title: 'First Log', description: 'Logged your first period', icon: '🌸', category: 'tracking', earned: false },
  { id: 'streak_7',    title: '7-Day Streak', description: 'Logged mood or symptoms 7 days in a row', icon: '🔥', category: 'consistency', earned: false },
  { id: 'three_cycles', title: 'Cycle Expert', description: 'Tracked 3 complete cycles', icon: '🌙', category: 'tracking', earned: false },
  { id: 'water_week',  title: 'Hydration Hero', description: 'Hit your water goal 7 days in a row', icon: '💧', category: 'wellness', earned: false },
  { id: 'mood_master', title: 'Mood Master', description: 'Logged mood 30 times', icon: '😊', category: 'awareness', earned: false },
  { id: 'symptom_tracker', title: 'Symptom Tracker', description: 'Tracked symptoms 10 times', icon: '📊', category: 'tracking', earned: false },
  { id: 'early_bird',  title: 'Early Adopter', description: 'Member since the beginning', icon: '⭐', category: 'special', earned: false },
];

function computeLocalEarned(): Set<string> {
  const earned = new Set<string>();
  try {
    // first_period — has logged any cycle data
    if (localStorage.getItem('sb_cycle_start')) earned.add('first_period');
    // streak_7
    const streak = Number(localStorage.getItem('sb_streak') || '0');
    if (streak >= 7) earned.add('streak_7');
    // water_week — check last logged water
    const water = Number(localStorage.getItem('sb_water') || '0');
    if (water >= 8) earned.add('water_week');
    // early_bird — always granted as local member
    earned.add('early_bird');
  } catch {}
  return earned;
}

export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<AchievementSummary>({ total: 0, earned: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await achievementsAPI.list();
      const data = res.data?.data;
      setAchievements(data?.achievements ?? LOCAL_DEFS);
      setSummary(data?.summary ?? { total: LOCAL_DEFS.length, earned: 0, remaining: LOCAL_DEFS.length });
    } catch {
      // Fallback to local computation
      const localEarned = computeLocalEarned();
      const withEarned = LOCAL_DEFS.map(a => ({ ...a, earned: localEarned.has(a.id) }));
      const earnedCount = withEarned.filter(a => a.earned).length;
      setAchievements(withEarned);
      setSummary({ total: withEarned.length, earned: earnedCount, remaining: withEarned.length - earnedCount });
      // Don't set error — degraded mode is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { achievements, summary, loading, error, refresh };
}
