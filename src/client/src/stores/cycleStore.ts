import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserGoal = 'periods' | 'fertility' | 'pregnancy' | 'wellness';

interface CycleState {
  cycleDay: number;
  phase: string;
  daysUntilPeriod: number;
  cycleLength: number;
  periodLength: number;
  goal: UserGoal;
  pregnancyWeek: number;
  lastPeriodDate: string;
  // Bug D fix: track whether real API data has been loaded
  hasRealData: boolean;
  setCycleData: (data: Partial<CycleState>) => void;
  setGoal: (goal: UserGoal) => void;
}

export const useCycleStore = create<CycleState>()(
  persist(
    (set) => ({
      // Bug D fix: default to 0/null-equivalent so we never show Day 14 / ovulation
      cycleDay: 1,
      phase: 'follicular',
      daysUntilPeriod: 0,
      cycleLength: 28,
      periodLength: 5,
      goal: 'periods',
      pregnancyWeek: 16,
      lastPeriodDate: '',
      hasRealData: false,
      setCycleData: (data) => set(data),
      setGoal: (goal) => set({ goal }),
    }),
    {
      name: 'shebloom-cycle',
      partialize: (state) => ({
        cycleDay: state.cycleDay,
        phase: state.phase,
        daysUntilPeriod: state.daysUntilPeriod,
        cycleLength: state.cycleLength,
        periodLength: state.periodLength,
        goal: state.goal,
        pregnancyWeek: state.pregnancyWeek,
        lastPeriodDate: state.lastPeriodDate,
        hasRealData: state.hasRealData,
      }),
    }
  )
);

interface AppState {
  activeTab: string;
  selectedMood: string | null;
  waterCount: number;
  setTab: (tab: string) => void;
  setMood: (mood: string) => void;
  setWater: (n: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  activeTab: 'home',
  selectedMood: null,
  waterCount: 3,
  setTab: (activeTab) => set({ activeTab }),
  setMood: (selectedMood) => set({ selectedMood }),
  setWater: (waterCount) => set({ waterCount }),
}));
