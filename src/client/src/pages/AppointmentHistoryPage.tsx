// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50 text-amber-700 border border-amber-200', icon: '⏳', label: 'Pending' },
  CONFIRMED: { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: '✓', label: 'Confirmed' },
  CANCELLED: { bg: 'bg-red-50 text-red-600 border border-red-200', icon: '✕', label: 'Cancelled' },
  COMPLETED: { bg: 'bg-blue-50 text-blue-700 border border-blue-200', icon: '✓', label: 'Completed' },
  NO_SHOW: { bg: 'bg-gray-50 text-gray-600 border border-gray-200', icon: '⊘', label: 'Missed' },
  REJECTED: { bg: 'bg-red-50 text-red-600 border border-red-200', icon: '✕', label: 'Rejected' },
  IN_PROGRESS: { bg: 'bg-purple-50 text-purple-700 border border-purple-200', icon: '●', label: 'In Progress' },
};

const FILTERS = ['All', 'Upcoming', 'Completed', 'Cancelled'] as const;

export default function AppointmentHistoryPage() {
  const nav = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await appointmentAPI.list();
      const data = res.data?.data || res.data || [];
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a: any, b: any) => new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime()
      );
      setAppointments(sorted);
    } catch {
      setAppointments([]);
      toast.error('Failed to load appointment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  // Helper: is appointment truly upcoming? Must be PENDING/CONFIRMED AND scheduled in the future
  const isUpcoming = (a: any) => {
    if (a.status !== 'PENDING' && a.status !== 'CONFIRMED') return false;
    const scheduled = new Date(a.scheduledAt || a.createdAt).getTime();
    return scheduled > Date.now();
  };
  // Helper: is appointment effectively completed? Either COMPLETED status or past PENDING/CONFIRMED
  const isCompleted = (a: any) => {
    if (a.status === 'COMPLETED') return true;
    if ((a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.scheduledAt || a.createdAt).getTime() <= Date.now()) return true;
    return false;
  };

  const filtered = appointments.filter(a => {
    if (filter === 'All') return true;
    if (filter === 'Upcoming') return isUpcoming(a);
    if (filter === 'Completed') return isCompleted(a);
    if (filter === 'Cancelled') return a.status === 'CANCELLED';
    return true;
  });

  const counts = {
    All: appointments.length,
    Upcoming: appointments.filter(a => isUpcoming(a)).length,
    Completed: appointments.filter(a => isCompleted(a)).length,
    Cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await appointmentAPI.cancel(cancelTarget.id, cancelReason || undefined);
      toast.success('Appointment cancelled');
      setCancelTarget(null);
      setCancelReason('');
      fetchAppointments();
    } catch {
      toast.error('Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
  };
  const fmtTime = (d: string) => {
    try { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return ''; }
  };

  const emptyMessages: Record<string, { icon: string; text: string; sub?: string }> = {
    All: { icon: '📅', text: 'No appointments yet', sub: 'Book your first consultation!' },
    Upcoming: { icon: '🎉', text: 'No upcoming appointments' },
    Completed: { icon: '📋', text: 'No completed appointments yet' },
    Cancelled: { icon: '✓', text: 'No cancelled appointments' },
  };

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">←</button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Appointments</h1>
            <p className="text-[9px] text-gray-400">Your booking history</p>
          </div>
        </div>
        {/* Filter tabs */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={'px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5 ' +
                (filter === f ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white/60 text-gray-400')}>
              {f}
              <span className={'text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ' +
                (filter === f ? 'bg-white/30' : 'bg-gray-100')}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Summary stats */}
        <div className="bg-white rounded-3xl shadow-lg p-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: counts.All, color: 'text-gray-800' },
              { label: 'Upcoming', value: counts.Upcoming, color: 'text-emerald-600' },
              { label: 'Completed', value: counts.Completed, color: 'text-blue-600' },
              { label: 'Cancelled', value: counts.Cancelled, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={'text-lg font-extrabold ' + s.color}>{s.value}</p>
                <p className="text-[9px] text-gray-400 font-bold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl shadow-lg p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                    <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
                  </div>
                  <div className="w-16 h-5 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">{emptyMessages[filter].icon}</span>
            <p className="text-sm font-bold text-gray-400">{emptyMessages[filter].text}</p>
            {emptyMessages[filter].sub && <p className="text-xs text-gray-300 mt-1">{emptyMessages[filter].sub}</p>}
            {filter === 'All' && (
              <button onClick={() => nav('/appointments')} className="mt-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-rose-200">
                Book Now →
              </button>
            )}
          </div>
        ) : (
          /* Appointment cards */
          filtered.map(a => {
            const effectivelyCompleted = isCompleted(a);
            const st = effectivelyCompleted && a.status !== 'COMPLETED'
              ? STATUS_STYLES.COMPLETED
              : (STATUS_STYLES[a.status] || STATUS_STYLES.PENDING);
            const isActive = isUpcoming(a);
            return (
              <div key={a.id} className={'bg-white rounded-3xl shadow-lg p-4 ' + (a.status === 'CANCELLED' ? 'opacity-60' : '')}>
                {/* Top row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md">
                      {a.doctorName ? a.doctorName.charAt(0) : '👩‍⚕️'}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-gray-800">{a.doctorName || 'Doctor'}</p>
                      <p className="text-[10px] text-gray-400">{a.type || 'Consultation'}</p>
                    </div>
                  </div>
                  <span className={'text-[9px] font-bold px-2.5 py-1 rounded-full ' + st.bg}>
                    {st.label} {st.icon}
                  </span>
                </div>

                {/* Date/time/duration */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
                  <span>📅 {fmtDate(a.scheduledAt || a.createdAt)}</span>
                  <span>🕐 {fmtTime(a.scheduledAt || a.createdAt)}</span>
                  {a.duration && <span>{a.duration} min</span>}
                </div>

                <div className="border-t border-gray-100 pt-2 space-y-1.5">
                  {a.amountPaid != null && (
                    <p className="text-[10px] text-gray-500">💰 ₹{a.amountPaid} paid</p>
                  )}
                  {a.notes && (
                    <p className="text-[10px] text-gray-500">📝 {a.notes}</p>
                  )}
                  {a.cancellationReason && (
                    <p className="text-[10px] text-red-400">Reason: {a.cancellationReason}</p>
                  )}
                </div>

                {/* Actions */}
                {isActive && (
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => setCancelTarget(a)}
                      className="flex-1 py-2.5 rounded-2xl bg-red-50 text-red-600 text-xs font-bold active:scale-95 transition-all">
                      Cancel ✕
                    </button>
                    {a.meetingLink && (
                      <a href={a.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold text-center active:scale-95 transition-all shadow-md shadow-rose-200">
                        Join Meeting →
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cancel Confirmation Bottom Sheet */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-5" />
            <h3 className="text-lg font-extrabold text-gray-900 text-center">Cancel this appointment?</h3>
            <p className="text-xs text-gray-400 text-center mt-1">
              {cancelTarget.doctorName} — {fmtDate(cancelTarget.scheduledAt || cancelTarget.createdAt)}
            </p>
            <div className="mt-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Reason (optional)</label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling?"
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none resize-none" rows={3} />
            </div>
            <button onClick={handleCancel} disabled={cancelling}
              className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm active:scale-95 transition-all shadow-md shadow-rose-200 disabled:opacity-50">
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
            <button onClick={() => { setCancelTarget(null); setCancelReason(''); }}
              className="w-full mt-2 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-95 transition-all">
              Keep Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
