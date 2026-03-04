import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const data = [
  { id: '1', doc: 'Dr. Priya Sharma', spec: 'Gynecologist', date: '15 Mar 2026', time: '10:30 AM', status: 'Confirmed', amt: 300 },
  { id: '2', doc: 'Dr. Meera Nair', spec: 'Fertility', date: '20 Mar 2026', time: '2:00 PM', status: 'Pending', amt: 450 },
  { id: '3', doc: 'Dr. Kavitha Rao', spec: 'Dermatologist', date: '8 Mar 2026', time: '11:00 AM', status: 'Completed', amt: 250 },
  { id: '4', doc: 'Dr. Anita Desai', spec: 'Obstetrician', date: '1 Mar 2026', time: '9:00 AM', status: 'Cancelled', amt: 500 },
];

const stColors: Record<string,string> = {
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-gray-100 text-gray-500',
};

export default function AppointmentsPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const upcoming = data.filter(a => a.status === 'Confirmed' || a.status === 'Pending');
  const past = data.filter(a => a.status === 'Completed' || a.status === 'Cancelled');
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Appointments</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('upcoming')} className={'flex-1 py-2.5 rounded-lg text-sm font-bold ' + (tab === 'upcoming' ? 'bg-white text-rose-600 shadow' : 'text-gray-400')}>Upcoming</button>
          <button onClick={() => setTab('past')} className={'flex-1 py-2.5 rounded-lg text-sm font-bold ' + (tab === 'past' ? 'bg-white text-rose-600 shadow' : 'text-gray-400')}>Past</button>
        </div>

        {list.length === 0 && <p className="text-center text-gray-400 py-10">No appointments</p>}

        {list.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {a.doc.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{a.doc}</p>
                  <p className="text-xs text-gray-500">{a.spec}</p>
                </div>
              </div>
              <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (stColors[a.status] || '')}>{a.status}</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <div className="flex gap-4 text-xs text-gray-500">
                <span>&#128197; {a.date}</span>
                <span>&#128336; {a.time}</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">&#8377;{a.amt}</span>
            </div>
            {(a.status === 'Confirmed' || a.status === 'Pending') && (
              <button onClick={() => alert(`Appointment with ${a.doc} cancelled.`)} className="mt-3 w-full py-2 border border-red-200 text-red-500 rounded-xl text-xs font-semibold active:bg-red-50 cursor-pointer">Cancel Appointment</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
