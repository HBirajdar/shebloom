import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentAPI } from '../services/api';
import toast from 'react-hot-toast';

const sampleData = [
  { id: '1', doctor: { fullName: 'Dr. Priya Sharma' }, type: 'consultation', scheduledAt: '2026-03-15T10:30:00Z', status: 'CONFIRMED', amountPaid: 300 },
  { id: '2', doctor: { fullName: 'Dr. Meera Nair' }, type: 'consultation', scheduledAt: '2026-03-20T14:00:00Z', status: 'PENDING', amountPaid: 450 },
];

const stColors: Record<string,string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function AppointmentsPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [appts, setAppts] = useState<any[]>(sampleData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentAPI.list()
      .then(r => { if (r.data.data?.length) setAppts(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appts.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING');
  const past = appts.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');
  const list = tab === 'upcoming' ? upcoming : past;

  const handleCancel = async (id: string) => {
    try {
      await appointmentAPI.cancel(id, 'User cancelled');
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a));
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const getName = (a: any) => a.doctor?.fullName || a.doc || 'Doctor';
  const getInitials = (name: string) => name.split(' ').map((w: string) => w[0]).join('').slice(0, 2);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')} className="text-xl">&#8592;</button>
        <h1 className="text-lg font-bold">Appointments</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('upcoming')} className={'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ' + (tab === 'upcoming' ? 'bg-white text-rose-600 shadow' : 'text-gray-400')}>Upcoming</button>
          <button onClick={() => setTab('past')} className={'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ' + (tab === 'past' ? 'bg-white text-rose-600 shadow' : 'text-gray-400')}>Past</button>
        </div>

        {loading && <div className="text-center py-10"><div className="w-8 h-8 mx-auto border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" /><p className="text-gray-400 text-sm mt-2">Loading...</p></div>}

        {!loading && list.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-gray-400">No {tab} appointments</p>
            <button onClick={() => nav('/doctors')} className="mt-3 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-semibold">Find a Doctor</button>
          </div>
        )}

        {!loading && list.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {getInitials(getName(a))}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{getName(a)}</p>
                  <p className="text-xs text-gray-500 capitalize">{a.type || 'Consultation'}</p>
                </div>
              </div>
              <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (stColors[a.status] || 'bg-gray-100 text-gray-500')}>{a.status}</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <div className="flex gap-4 text-xs text-gray-500">
                <span>📅 {formatDate(a.scheduledAt || a.date)}</span>
                <span>🕐 {formatTime(a.scheduledAt || a.date)}</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">₹{a.amountPaid || a.amt || 0}</span>
            </div>
            {(a.status === 'CONFIRMED' || a.status === 'PENDING') && (
              <button onClick={() => handleCancel(a.id)} className="mt-3 w-full py-2 border border-red-200 text-red-500 rounded-xl text-xs font-semibold active:bg-red-50 cursor-pointer transition-colors">Cancel Appointment</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
