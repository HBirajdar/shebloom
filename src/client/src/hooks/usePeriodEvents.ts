import { useState, useEffect, useCallback } from 'react';
import { cycleAPI, userAPI } from '../services/api';
import { useCycleStore } from '../stores/cycleStore';
import toast from 'react-hot-toast';

export function usePeriodEvents() {
  const setCycleData = useCycleStore(s => s.setCycleData);
  const [events, setEvents] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await cycleAPI.list();
      setEvents(res.data.data || []);
    } catch {}
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await cycleAPI.predict();
      const d = res.data.data;
      if (d && typeof d.cycleDay === 'number') {
        setPredictions(d);
        setCycleData({ cycleDay: d.cycleDay, phase: d.phase, daysUntilPeriod: d.daysUntilPeriod, cycleLength: d.cycleLength || 28, periodLength: d.periodLength || 5 });
      }
    } catch {}
  }, []);

  const addEvent = async (data: { startDate: string; endDate?: string; notes?: string }) => {
    try {
      const res = await cycleAPI.log(data);
      toast.success('Period logged!');
      await fetchEvents();
      await fetchPredictions();
      return res.data.data;
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to log'); return null; }
  };

  const logSymptoms = async (symptoms: string[], notes?: string) => {
    try {
      await cycleAPI.logSymptoms({ symptoms, notes });
      toast.success('Symptoms saved!');
    } catch { toast.error('Failed'); }
  };

  const saveCycleSettings = async (cycleLength: number, periodLength: number) => {
    try {
      await userAPI.updateProfile({ cycleLength, periodLength });
      setCycleData({ cycleLength, periodLength });
      toast.success('Settings saved!');
      await fetchPredictions();
    } catch { toast.error('Failed'); }
  };

  useEffect(() => { Promise.all([fetchEvents(), fetchPredictions()]).finally(() => setLoading(false)); }, []);

  return { events, predictions, loading, addEvent, logSymptoms, fetchEvents, fetchPredictions, saveCycleSettings };
}
