import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';
import { cycleAPI } from '../services/api';
import toast from 'react-hot-toast';

const SYM = ['Cramps','Headache','Bloating','Fatigue','Acne','Nausea','Back Pain','Cravings','Anxiety','Irritable','Insomnia','Spotting'];

export default function TrackerPage() {
  const nav = useNavigate();
  const { cycleDay, phase, periodLength, cycleLength, daysUntilPeriod } = useCycleStore();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [yr, setYr] = useState(now.getFullYear());
  const [sym, setSym] = useState<string[]>([]);

  const fd = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo+1, 0).getDate();
  const td = now.getDate();
  const cur = mo===now.getMonth() && yr===now.getFullYear();

  const tog = (s: string) => setSym(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
  const save = async () => { try { await cycleAPI.logSymptoms({symptoms:sym}); toast.success('Saved!'); } catch { toast.error('Error'); } };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={()=>nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Period Tracker</h1>
      </div>
      <div className="px-5 pt-5 space-y-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-3">
            <button onClick={()=>{if(mo===0){setMo(11);setYr(yr-1);}else setMo(mo-1);}}>&#9664;</button>
            <h3 className="font-bold">{new Date(yr,mo).toLocaleString('en',{month:'long'})} {yr}</h3>
            <button onClick={()=>{if(mo===11){setMo(0);setYr(yr+1);}else setMo(mo+1);}}>&#9654;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S','M','T','W','T','F','S'].map(d=><div key={d} className="text-center text-[10px] text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length:fd}).map((_,i)=><div key={'e'+i}/>)}
            {Array.from({length:dim}).map((_,i)=>{
              const d=i+1; const isT=cur&&d===td;
              const diff=d-td+cycleDay;
              const isP=cur&&diff>=1&&diff<=periodLength;
              const isF=cur&&diff>=(cycleLength-19)&&diff<=(cycleLength-13);
              let c='w-8 h-8 rounded-full flex items-center justify-center text-xs mx-auto ';
              if(isT) c+='ring-2 ring-rose-500 font-bold '; if(isP) c+='bg-rose-100 text-rose-700 '; else if(isF) c+='bg-emerald-100 text-emerald-700 '; else c+='text-gray-700 ';
              return <button key={d} className={c}>{d}</button>;
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-rose-50 rounded-xl p-3"><p className="text-[10px] text-rose-400">Day</p><p className="text-xl font-bold text-rose-700">{cycleDay}</p></div>
            <div className="bg-purple-50 rounded-xl p-3"><p className="text-[10px] text-purple-400">Phase</p><p className="text-xl font-bold text-purple-700 capitalize">{phase}</p></div>
            <div className="bg-blue-50 rounded-xl p-3"><p className="text-[10px] text-blue-400">Next</p><p className="text-xl font-bold text-blue-700">{daysUntilPeriod}d</p></div>
            <div className="bg-amber-50 rounded-xl p-3"><p className="text-[10px] text-amber-400">Cycle</p><p className="text-xl font-bold text-amber-700">{cycleLength}d</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold mb-3">Log Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {SYM.map(s=><button key={s} onClick={()=>tog(s)} className={'px-3 py-1.5 rounded-full text-xs border '+(sym.includes(s)?'border-rose-400 bg-rose-50 text-rose-600':'border-gray-200 text-gray-500')}>{s}</button>)}
          </div>
          {sym.length>0&&<button onClick={save} className="mt-3 w-full py-2.5 bg-rose-500 text-white rounded-xl text-sm font-semibold">Save ({sym.length})</button>}
        </div>
      </div>
    </div>
  );
}
