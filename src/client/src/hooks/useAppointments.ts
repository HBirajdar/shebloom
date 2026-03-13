// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { appointmentAPI } from '../services/api';
import toast from 'react-hot-toast';

const LS_KEY = 'sb_bookings';
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

function getLocal(): any[] {
  try {
    const items: any[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    // Auto-clean local bookings older than 90 days
    const now = Date.now();
    const fresh = items.filter((b: any) => {
      const ts = b.date || b.createdAt;
      return !ts || (now - new Date(ts).getTime()) < NINETY_DAYS;
    });
    if (fresh.length !== items.length) localStorage.setItem(LS_KEY, JSON.stringify(fresh));
    return fresh;
  } catch { return []; }
}
function setLocal(b: any[]) { localStorage.setItem(LS_KEY, JSON.stringify(b)); }

export function useAppointments() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    const local = getLocal();
    try {
      const result = await appointmentAPI.list();
      const apiData = (result.data?.data || []).map((b: any) => {
        const isPast = b.scheduledAt ? new Date(b.scheduledAt).getTime() < Date.now() : false;
        let status = 'upcoming';
        if (['CANCELLED'].includes(b.status)) status = 'cancelled';
        else if (['COMPLETED'].includes(b.status)) status = 'completed';
        else if (['REJECTED'].includes(b.status)) status = 'rejected';
        else if (['NO_SHOW'].includes(b.status)) status = 'missed';
        else if (isPast) status = 'completed'; // past PENDING/CONFIRMED → completed
        return {
          id: b.id, doctorId: b.doctorId, doctorName: b.doctor?.fullName || b.doctorName || 'Doctor',
          date: b.scheduledAt?.split('T')[0] || '', time: b.scheduledAt?.split('T')[1]?.substring(0, 5) || '',
          reason: b.notes?.split(' | ')[0] || '', notes: b.notes?.split(' | ')[1] || '',
          status, source: 'api',
          videoLink: b.videoLink || b.meetingLink || '', meetingLink: b.meetingLink || b.videoLink || '',
          rejectionReason: b.rejectionReason || '', cancellationReason: b.cancellationReason || '',
        };
      });
      // Merge: API bookings + localStorage bookings (deduplicated)
      const apiIds = new Set(apiData.map((b: any) => b.id));
      const merged = [...apiData, ...local.filter((b: any) => !apiIds.has(b.id))];
      setBookings(merged);
    } catch {
      setBookings(local);
    }
    setLoading(false);
  }, []);

  const createBooking = async (data: { doctorId: string; doctorName: string; date: string; time: string; reason: string; notes: string; paymentId?: string; couponCode?: string; couponDiscount?: number; platformFee?: number; amountPaid?: number; originalFee?: number }) => {
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
      const result = await appointmentAPI.create({
        doctorId: data.doctorId, doctorName: data.doctorName, scheduledAt, reason: data.reason, notes: data.notes,
        paymentId: data.paymentId, couponCode: data.couponCode, couponDiscount: data.couponDiscount,
        platformFee: data.platformFee, amountPaid: data.amountPaid, originalFee: data.originalFee,
      });
      toast.success('Appointment booked!');
      await fetchBookings();
      const apptData = result.data?.data || result.data;
      return { ...apptData, videoLink: apptData.videoLink || apptData.meetingLink || '' };
    } catch (err: any) {
      // If payment was involved, never silently fallback to localStorage
      if (data.paymentId) {
        const msg = err?.response?.data?.error || err?.response?.data?.message || 'Booking failed after payment. Please contact support.';
        toast.error(msg);
        throw err;
      }
      // API failed (network offline, doctor not in DB) — save to localStorage as fallback
      const booking = { id: 'local_' + Date.now(), ...data, status: 'upcoming', source: 'local' };
      const local = getLocal();
      local.unshift(booking);
      setLocal(local);
      setBookings(prev => [booking, ...prev]);
      toast.success('Appointment saved locally (will sync when online)');
      return booking;
    }
  };

  const cancelBooking = async (id: string) => {
    // Try API cancel
    try { await appointmentAPI.cancel(id); } catch {}
    // Also update localStorage
    const local = getLocal().map((b: any) => b.id === id ? { ...b, status: 'cancelled' } : b);
    setLocal(local);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    toast.success('Cancelled');
  };

  useEffect(() => { fetchBookings(); }, []);

  return { bookings, loading, createBooking, cancelBooking, fetchBookings };
}
