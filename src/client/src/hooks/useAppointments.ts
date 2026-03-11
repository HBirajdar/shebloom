// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import toast from 'react-hot-toast';

const LS_KEY = 'sb_bookings';

function getLocal(): any[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function setLocal(b: any[]) { localStorage.setItem(LS_KEY, JSON.stringify(b)); }

export function useAppointments() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    const local = getLocal();
    try {
      const result = await apiService.getMyAppointments();
      const apiData = (result.data || []).map((b: any) => ({
        id: b.id, doctorId: b.doctorId, doctorName: b.doctor?.fullName || b.doctorName || 'Doctor',
        date: b.scheduledAt?.split('T')[0] || '', time: b.scheduledAt?.split('T')[1]?.substring(0, 5) || '',
        reason: b.notes?.split(' | ')[0] || '', notes: b.notes?.split(' | ')[1] || '',
        status: (['CANCELLED'].includes(b.status) ? 'cancelled' : ['COMPLETED'].includes(b.status) ? 'completed' : ['REJECTED','NO_SHOW'].includes(b.status) ? 'rejected' : 'upcoming'), source: 'api',
        videoLink: b.videoLink || b.meetingLink || '', meetingLink: b.meetingLink || b.videoLink || '',
      }));
      // Merge: API bookings + localStorage bookings (deduplicated)
      const apiIds = new Set(apiData.map((b: any) => b.id));
      const merged = [...apiData, ...local.filter((b: any) => !apiIds.has(b.id))];
      setBookings(merged);
    } catch {
      setBookings(local);
    }
    setLoading(false);
  }, []);

  const createBooking = async (data: { doctorId: string; doctorName: string; date: string; time: string; reason: string; notes: string }) => {
    const convertTo24h = (t: string) => {
      const [time, meridiem] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    };
    const scheduledAt = data.date + 'T' + convertTo24h(data.time) + ':00';
    // Try API first
    try {
      const result = await apiService.createAppointment({ doctorId: data.doctorId, doctorName: data.doctorName, scheduledAt, reason: data.reason, notes: data.notes });
      toast.success('Appointment booked!');
      await fetchBookings();
      const apptData = result.data;
      return { ...apptData, videoLink: apptData.videoLink || apptData.meetingLink || '' };
    } catch {
      // API failed (doctor not in DB) — save to localStorage
      const booking = { id: 'local_' + Date.now(), ...data, status: 'upcoming', source: 'local' };
      const local = getLocal();
      local.unshift(booking);
      setLocal(local);
      setBookings(prev => [booking, ...prev]);
      toast.success('Appointment saved!');
      return booking;
    }
  };

  const cancelBooking = async (id: string) => {
    // Try API cancel
    try { await apiService.cancelAppointment(id); } catch {}
    // Also update localStorage
    const local = getLocal().map((b: any) => b.id === id ? { ...b, status: 'cancelled' } : b);
    setLocal(local);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    toast.success('Cancelled');
  };

  useEffect(() => { fetchBookings(); }, []);

  return { bookings, loading, createBooking, cancelBooking, fetchBookings };
}
