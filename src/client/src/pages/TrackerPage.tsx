import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';
import { cycleAPI } from '../services/api';
import toast from 'react-hot-toast';

const SYM = ['Cramps','Headache','Bloating','Fatigue','Acne','Nausea','Back Pain','Cravings','Anxiety','Irritable','Insomnia','Spotting'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TrackerPage() {
  const nav = useNavigate();
  const { cycleDay, phase, periodLength, cycleLength, daysUntilPeriod } = useCycleStore();
  const setCycle = useCycleStore(s => s.setCycleData);
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [yr, setYr] = useState(now.getFullYear());
  const [selDay, setSelDay] = useState<number | null>(now.getDate());
  const [sym, setSym] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tmpCycle, setTmpCycle] = useState(cycleLength);
  const [tmpPeriod, setTmpPeriod] = useState(periodLength);

  const fd = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const td = now.getDate();
  const isCurMo = mo === now.getMonth() && yr === now.getFullYear();

  // Calculate phases for any day in current month
  const getDayInfo = (d: number) => {
    if (!isCurMo) return { type: 'none', label: '' };
    const diff = d - td + cycleDay;
    if (diff >= 1 && diff <= periodLength) return { type: 'period', label: 'Period day ' + diff };
    const ovDay = cycleLength - 14;
    const fStart = ovDay - 5;
    const fEnd = ovDay + 1;
    if (diff === ovDay) return { type: 'ovulation', label: 'Ovulation day' };
    if (diff >= fStart && diff <= fEnd) return { type: 'fertile', label: 'Fertile window' };
    if (diff > periodLength && diff < fStart) return { type: 'follicular', label: 'Follicular phase' };
    if (diff > fEnd) return { type: 'luteal', label: 'Luteal phase' };
    return { type: 'none', label: '' };
  };

  const selInfo = selDay ? getDayInfo(selDay) : null;
  const selDate = selDay ? new Date(yr, mo, selDay) : null;

  const ovulationDay = cycleLength - 14;
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;
  const daysToOvulation = ovulationDay > cycleDay ? ovulationDay - cycleDay : 0;

  const tog = (s: string) => setSym(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const save = async () => {
    try { await cycleAPI.logSymptoms({ symptoms: sym, date: selDate?.toISOString() }); toast.success('Symptoms saved!'); }
    catch { toast.error('Failed to save'); }
  };

  const prevMo = () => { if (mo === 0) { setMo(11); setYr(yr - 1); } else setMo(mo - 1); setSelDay(null); };
  const nextMo = () => { if (mo === 11) { setMo(0); setYr(yr + 1); } else setMo(mo + 1); setSelDay(null); };

  const saveCycleSettings = () => {
    setCycle({ cycleLength: tmpCycle, periodLength: tmpPeriod });
    setShowSettings(false);
    toast.success('Cycle settings updated!');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/dashboard')} className="text-xl">{'\u2190'}</button>
          <h1 className="text-lg font-bold">Period Tracker</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="text-xs font-semibold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full active:scale-95">{'\u2699\uFE0F'} Settings</button>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Calendar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMo} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90">{'\u25C0'}</button>
            <h3 className="font-bold text-gray-800">{MONTHS[mo]} {yr}</h3>
            <button onClick={nextMo} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90">{'\u25B6'}</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: fd }).map((_, i) => <div key={'e' + i} />)}
            {Array.from({ length: dim }).map((_, i) => {
              const d = i + 1;
              const isToday = isCurMo && d === td;
              const isSel = d === selDay;
              const info = getDayInfo(d);
              let bg = 'bg-transparent';
              let txt = 'text-gray-700';
              let dot = '';
              if (info.type === 'period') { bg = 'bg-rose-100'; txt = 'text-rose-700'; dot = 'bg-rose-500'; }
              else if (info.type === 'ovulation') { bg = 'bg-purple-100'; txt = 'text-purple-700'; dot = 'bg-purple-500'; }
              else if (info.type === 'fertile') { bg = 'bg-emerald-50'; txt = 'text-emerald-700'; dot = 'bg-emerald-400'; }
              if (isSel) { bg = 'bg-rose-500'; txt = 'text-white'; }

              return (
                <button key={d} onClick={() => setSelDay(d)}
                  className={'w-9 h-9 rounded-full flex flex-col items-center justify-center text-xs mx-auto transition-all active:scale-90 ' + bg + ' ' + txt + (isToday && !isSel ? ' ring-2 ring-rose-400 font-bold' : '')}>
                  {d}
                  {dot && !isSel && <span className={'w-1 h-1 rounded-full mt-0.5 ' + dot} />}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 justify-center">
            {[
              { c: 'bg-rose-500', l: 'Period' },
              { c: 'bg-emerald-400', l: 'Fertile' },
              { c: 'bg-purple-500', l: 'Ovulation' },
            ].map(x => (
              <div key={x.l} className="flex items-center gap-1">
                <span className={'w-2 h-2 rounded-full ' + x.c} />
                <span className="text-[10px] text-gray-500">{x.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Detail */}
        {selDay && selInfo && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              {selDate?.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {selInfo.label ? (
              <div className={'inline-block px-3 py-1 rounded-full text-xs font-semibold ' + (
                selInfo.type === 'period' ? 'bg-rose-100 text-rose-600' :
                selInfo.type === 'ovulation' ? 'bg-purple-100 text-purple-600' :
                selInfo.type === 'fertile' ? 'bg-emerald-100 text-emerald-600' :
                selInfo.type === 'follicular' ? 'bg-blue-100 text-blue-600' :
                selInfo.type === 'luteal' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
              )}>
                {selInfo.label}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No cycle data for this date</p>
            )}
            {isCurMo && selDay === td && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-rose-50 rounded-lg p-2"><p className="text-[10px] text-rose-400">Cycle Day</p><p className="font-bold text-rose-700">{cycleDay}</p></div>
                <div className="bg-purple-50 rounded-lg p-2"><p className="text-[10px] text-purple-400">Phase</p><p className="font-bold text-purple-700 capitalize">{phase}</p></div>
              </div>
            )}
          </div>
        )}

        {/* Cycle Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Cycle Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-rose-50 rounded-xl p-3">
              <p className="text-[10px] text-rose-400">Cycle Day</p>
              <p className="text-xl font-bold text-rose-700">{cycleDay}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-[10px] text-purple-400">Phase</p>
              <p className="text-xl font-bold text-purple-700 capitalize">{phase}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] text-blue-400">Next Period</p>
              <p className="text-xl font-bold text-blue-700">{daysUntilPeriod}d</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[10px] text-emerald-400">Ovulation In</p>
              <p className="text-xl font-bold text-emerald-700">{daysToOvulation > 0 ? daysToOvulation + 'd' : 'Done'}</p>
            </div>
          </div>
        </div>

        {/* Fertility Window Detail */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-purple-800 mb-2">{'\u{1F495}'} Conception Planning</h3>
          <div className="space-y-2 text-xs text-purple-700">
            <div className="flex justify-between"><span>Fertile Window</span><span className="font-bold">Day {fertileStart} \u2013 {fertileEnd}</span></div>
            <div className="flex justify-between"><span>Ovulation Day</span><span className="font-bold">Day {ovulationDay}</span></div>
            <div className="flex justify-between"><span>Best Days to Try</span><span className="font-bold">Day {ovulationDay - 2} \u2013 {ovulationDay}</span></div>
            <div className="flex justify-between"><span>Period Length</span><span className="font-bold">{periodLength} days</span></div>
            <div className="flex justify-between"><span>Cycle Length</span><span className="font-bold">{cycleLength} days</span></div>
          </div>
        </div>

        {/* Symptom Logger */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold mb-3">Log Symptoms {selDay && isCurMo ? 'for Today' : ''}</h3>
          <div className="flex flex-wrap gap-2">
            {SYM.map(s => (
              <button key={s} onClick={() => tog(s)}
                className={'px-3 py-1.5 rounded-full text-xs border transition-all active:scale-95 ' + (sym.includes(s) ? 'border-rose-400 bg-rose-50 text-rose-600 font-semibold' : 'border-gray-200 text-gray-500')}>
                {s}
              </button>
            ))}
          </div>
          {sym.length > 0 && (
            <button onClick={save} className="mt-3 w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform">
              Save {sym.length} Symptom{sym.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Cycle Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Cycle Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 text-xl">{'\u2715'}</button>
            </div>

            {[
              { l: 'Cycle Length', v: tmpCycle, s: setTmpCycle, mn: 21, mx: 45, unit: 'days', desc: 'Average length of your full cycle' },
              { l: 'Period Length', v: tmpPeriod, s: setTmpPeriod, mn: 2, mx: 10, unit: 'days', desc: 'How many days your period lasts' },
            ].map(x => (
              <div key={x.l}>
                <label className="text-sm font-semibold text-gray-700">{x.l}</label>
                <p className="text-xs text-gray-400 mb-2">{x.desc}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => x.s(Math.max(x.mn, x.v - 1))} className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold text-lg active:scale-90 transition-transform">{'\u2212'}</button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-gray-900">{x.v}</span>
                    <span className="text-sm text-gray-400 ml-1">{x.unit}</span>
                  </div>
                  <button onClick={() => x.s(Math.min(x.mx, x.v + 1))} className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold text-lg active:scale-90 transition-transform">+</button>
                </div>
                <input type="range" min={x.mn} max={x.mx} value={x.v} onChange={e => x.s(Number(e.target.value))}
                  className="w-full mt-2 accent-rose-500" />
              </div>
            ))}

            <button onClick={saveCycleSettings} className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold active:scale-95 transition-transform">
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
