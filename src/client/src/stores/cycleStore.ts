import { create } from 'zustand';

interface CycleState {
  cycleDay: number;
  phase: string;
  daysUntilPeriod: number;
  cycleLength: number;
  periodLength: number;
  setCycleData: (data: Partial<CycleState>) => void;
}

export const useCycleStore = create<CycleState>()((set) => ({
  cycleDay: 14,
  phase: 'ovulation',
  daysUntilPeriod: 14,
  cycleLength: 28,
  periodLength: 5,
  setCycleData: (data) => set(data),
}));

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
