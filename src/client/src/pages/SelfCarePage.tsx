// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';

const phaseWellness: Record<string, { title: string; emoji: string; color: string; affirmation: string; breath: string; journalPrompt: string; selfCare: string[] }> = {
  menstrual: { title: 'Rest & Restore', emoji: '\u{1FA78}', color: '#E11D48',
    affirmation: 'I honor my body\'s need for rest. I am allowed to slow down.',
    breath: '4-7-8 Relaxation: Inhale 4s, hold 7s, exhale 8s',
    journalPrompt: 'What does my body need most right now? How can I be gentle with myself this week?',
    selfCare: ['Warm bath with essential oils', 'Gentle stretching or yin yoga', 'Hot tea and a good book', 'Say no to one extra commitment', 'Eat your favorite comfort food guilt-free'] },
  follicular: { title: 'Create & Explore', emoji: '\u{1F331}', color: '#059669',
    affirmation: 'I am full of creative energy. Today I start something new.',
    breath: 'Energizing Breath: Quick inhale-exhale through nose, 30 rounds',
    journalPrompt: 'What new project or goal excites me? What would I do if I couldn\'t fail?',
    selfCare: ['Try a new workout or class', 'Plan something social', 'Start a creative project', 'Meal prep healthy foods', 'Explore somewhere new'] },
  ovulation: { title: 'Shine & Connect', emoji: '\u2728', color: '#7C3AED',
    affirmation: 'I am confident, radiant, and worthy of all good things.',
    breath: 'Box Breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s',
    journalPrompt: 'What conversation have I been avoiding? Today I have the courage to speak my truth.',
    selfCare: ['Have that important conversation', 'Dress up and feel good', 'Connect deeply with someone', 'Dance or move joyfully', 'Express yourself creatively'] },
  luteal: { title: 'Nurture & Complete', emoji: '\u{1F343}', color: '#D97706',
    affirmation: 'I am enough exactly as I am. My feelings are valid.',
    breath: 'Nadi Shodhana: Alternate nostril breathing, 10 rounds',
    journalPrompt: 'What am I grateful for today? What can I let go of that no longer serves me?',
    selfCare: ['Dark chocolate (guilt-free magnesium!)', 'Early bedtime with calming music', 'Warm oil self-massage', 'Organize or clean one space', 'Call someone who makes you smile'] },
};

export default function SelfCarePage() {
  const nav = useNavigate();
  const { phase } = useCycleStore();
  const [view, setView] = useState<'today' | 'breathe' | 'journal' | 'sos'>('today');
  const [breathState, setBreathState] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathCount, setBreathCount] = useState(0);
  const [breathTimer, setBreathTimer] = useState(0);
  const [journalText, setJournalText] = useState('');
  const [gratitude, setGratitude] = useState(['', '', '']);
  const [moodScore, setMoodScore] = useState(0);
  const [energyScore, setEnergyScore] = useState(0);
  const [stressScore, setStressScore] = useState(0);
  const [checkedCare, setCheckedCare] = useState<number[]>([]);
  const [sosContacts, setSosContacts] = useState<{ name: string; phone: string }[]>([]);
  const [sosName, setSosName] = useState('');
  const [sosPhone, setSosPhone] = useState('');
  const timerRef = useRef<any>(null);

  const pw = phaseWellness[phase] || phaseWellness.menstrual;

  // Breathing exercise
  const startBreathing = () => {
    setBreathCount(0);
    setBreathState('inhale');
    let count = 0;
    const cycle = () => {
      count++;
      if (count > 12) { setBreathState('idle'); setBreathCount(0); return; }
      setBreathCount(count);
      setBreathState('inhale'); setBreathTimer(4);
      setTimeout(() => { setBreathState('hold'); setBreathTimer(4); }, 4000);
      setTimeout(() => { setBreathState('exhale'); setBreathTimer(4); }, 8000);
      setTimeout(cycle, 12000);
    };
    cycle();
  };

  const stopBreathing = () => { setBreathState('idle'); setBreathCount(0); clearTimeout(timerRef.current); };

  const toggleCare = (i: number) => setCheckedCare(c => c.includes(i) ? c.filter(x => x !== i) : [...c, i]);

  const addSosContact = () => {
    if (!sosName || !sosPhone) return;
    setSosContacts([...sosContacts, { name: sosName, phone: sosPhone }]);
    setSosName(''); setSosPhone('');
  };

  const ScoreSlider = ({ label, emoji, value, onChange, color }: { label: string; emoji: string; value: number; onChange: (v: number) => void; color: string }) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-gray-700">{emoji} {label}</span>
        <span className="text-xs font-extrabold" style={{ color }}>{value}/10</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => onChange(n)}
            className="flex-1 h-8 rounded-lg transition-all active:scale-90"
            style={{ backgroundColor: n <= value ? color + '30' : '#F1F5F9', borderWidth: n <= value ? 2 : 0, borderColor: color }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
          <div><h1 className="text-base font-extrabold text-gray-900">Self Care {'\u{1F9D8}'}</h1><p className="text-[9px] text-gray-400">Your mental wellness matters</p></div>
        </div>
        <div className="px-5 pb-2 flex gap-2">
          {([['today', '\u{1F3AF} Today'], ['breathe', '\u{1F32C}\uFE0F Breathe'], ['journal', '\u{1F4DD} Journal'], ['sos', '\u{1F6A8} Safety']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (view === k ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500')}
              style={view === k ? { background: `linear-gradient(135deg, ${pw.color}, ${pw.color}CC)` } : {}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* TODAY */}
        {view === 'today' && (<>
          {/* Phase Affirmation */}
          <div className="rounded-2xl p-5 text-white text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${pw.color}, ${pw.color}CC)` }}>
            <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full" />
            <span className="text-4xl block mb-2">{pw.emoji}</span>
            <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold">{pw.title}</p>
            <p className="text-base font-bold mt-2 leading-relaxed italic">"{pw.affirmation}"</p>
          </div>

          {/* Mood Check */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">How are you today?</h3>
            <ScoreSlider label="Mood" emoji={'\u{1F60A}'} value={moodScore} onChange={setMoodScore} color="#10B981" />
            <ScoreSlider label="Energy" emoji={'\u26A1'} value={energyScore} onChange={setEnergyScore} color="#F59E0B" />
            <ScoreSlider label="Stress" emoji={'\u{1F4A8}'} value={stressScore} onChange={setStressScore} color="#EF4444" />
            {stressScore >= 8 && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 mt-2">
                <p className="text-xs font-bold text-rose-700">{'\u{1F49C}'} Your stress is high today</p>
                <p className="text-[10px] text-rose-600">Try the breathing exercise or talk to someone you trust. You don't have to carry this alone.</p>
              </div>
            )}
          </div>

          {/* Phase Self-Care Checklist */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-1">Today's Self-Care</h3>
            <p className="text-[10px] text-gray-400 mb-3">Curated for your {phase} phase</p>
            {pw.selfCare.map((care, i) => (
              <button key={i} onClick={() => toggleCare(i)} className="flex items-center gap-3 w-full py-2.5 border-b border-gray-50 last:border-0">
                <div className={'w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] transition-all flex-shrink-0 ' +
                  (checkedCare.includes(i) ? 'text-white' : 'border-gray-300')} style={checkedCare.includes(i) ? { backgroundColor: pw.color, borderColor: pw.color } : {}}>
                  {checkedCare.includes(i) && '\u2713'}
                </div>
                <span className={'text-xs flex-1 text-left ' + (checkedCare.includes(i) ? 'text-gray-400 line-through' : 'text-gray-700')}>{care}</span>
              </button>
            ))}
          </div>
        </>)}

        {/* BREATHE */}
        {view === 'breathe' && (<>
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <h3 className="text-sm font-extrabold text-gray-900 mb-1">{'\u{1F32C}\uFE0F'} Guided Breathing</h3>
            <p className="text-[10px] text-gray-400 mb-6">{pw.breath}</p>

            {/* Breathing circle */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <div className={'absolute inset-0 rounded-full transition-all duration-[4000ms] ease-in-out flex items-center justify-center ' +
                (breathState === 'inhale' ? 'scale-100 bg-blue-100' : breathState === 'hold' ? 'scale-100 bg-purple-100' : breathState === 'exhale' ? 'scale-75 bg-green-100' : 'scale-75 bg-gray-100')}>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-gray-900">
                    {breathState === 'idle' ? '\u{1F32C}\uFE0F' : breathState === 'inhale' ? 'Inhale' : breathState === 'hold' ? 'Hold' : 'Exhale'}
                  </p>
                  {breathState !== 'idle' && <p className="text-xs text-gray-500 mt-1">Round {breathCount}/4</p>}
                </div>
              </div>
            </div>

            {breathState === 'idle' ? (
              <button onClick={startBreathing} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95" style={{ background: `linear-gradient(135deg, ${pw.color}, ${pw.color}CC)` }}>
                Start Breathing Exercise
              </button>
            ) : (
              <button onClick={stopBreathing} className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-95">Stop</button>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <h3 className="text-xs font-bold text-blue-800 mb-2">Breathing Benefits</h3>
            <div className="space-y-1 text-[10px] text-blue-700">
              <p>{'\u2022'} Reduces cortisol (stress hormone) by up to 30%</p>
              <p>{'\u2022'} Activates parasympathetic nervous system</p>
              <p>{'\u2022'} Helps with period cramps and PMS anxiety</p>
              <p>{'\u2022'} 5 minutes daily = measurable stress reduction</p>
            </div>
          </div>
        </>)}

        {/* JOURNAL */}
        {view === 'journal' && (<>
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: pw.color + '08', borderColor: pw.color + '20' }}>
            <p className="text-xs font-bold" style={{ color: pw.color }}>Today's Prompt:</p>
            <p className="text-sm text-gray-700 mt-1 italic leading-relaxed">"{pw.journalPrompt}"</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">{'\u{1F4DD}'} Free Write</h3>
            <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder="Write whatever comes to mind..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none resize-none leading-relaxed" rows={8} />
            <p className="text-[9px] text-gray-400 mt-1 text-right">{journalText.length} characters</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">{'\u{1F64F}'} 3 Gratitudes</h3>
            {[0, 1, 2].map(i => (
              <input key={i} value={gratitude[i]} onChange={e => { const g = [...gratitude]; g[i] = e.target.value; setGratitude(g); }}
                placeholder={['I am grateful for...', 'I appreciate...', 'Something good today...'][i]}
                className="w-full mb-2 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
            ))}
          </div>
        </>)}

        {/* SOS / SAFETY */}
        {view === 'sos' && (<>
          <div className="bg-red-50 rounded-2xl p-5 border border-red-200 text-center">
            <span className="text-4xl">{'\u{1F6A8}'}</span>
            <h2 className="text-lg font-extrabold text-red-800 mt-2">Emergency Safety</h2>
            <p className="text-xs text-red-600 mt-1">If you are in immediate danger, call your local emergency number.</p>
            <a href="tel:112" className="block mt-3 w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold text-sm active:scale-95">
              {'\u{1F4DE}'} Call Emergency (112)
            </a>
          </div>

          {/* Helpline numbers */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">{'\u{1F4DE}'} Helplines</h3>
            {[
              { name: 'Women Helpline (India)', num: '181', emoji: '\u{1F1EE}\u{1F1F3}' },
              { name: 'National Commission for Women', num: '7827-170-170', emoji: '\u{1F46E}\u200D\u2640\uFE0F' },
              { name: 'Domestic Violence Helpline', num: '1800-599-0019', emoji: '\u{1F91D}' },
              { name: 'Mental Health Helpline (iCall)', num: '9152987821', emoji: '\u{1F9E0}' },
              { name: 'Suicide Prevention (AASRA)', num: '9820466726', emoji: '\u{1F49C}' },
            ].map(h => (
              <a key={h.num} href={'tel:' + h.num.replace(/-/g, '')} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 active:bg-gray-50">
                <span className="text-lg">{h.emoji}</span>
                <div className="flex-1"><p className="text-xs font-bold text-gray-800">{h.name}</p></div>
                <span className="text-xs font-extrabold text-emerald-600">{h.num}</span>
              </a>
            ))}
          </div>

          {/* Trusted Contacts */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">{'\u{1F46D}'} My Trusted Contacts</h3>
            {sosContacts.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">{c.name.charAt(0)}</div>
                <div className="flex-1"><p className="text-xs font-bold text-gray-800">{c.name}</p></div>
                <a href={'tel:' + c.phone} className="text-xs font-bold text-emerald-600">{'\u{1F4DE}'} Call</a>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input value={sosName} onChange={e => setSosName(e.target.value)} placeholder="Sugandhika" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
              <input value={sosPhone} onChange={e => setSosPhone(e.target.value)} placeholder="9405424185" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
              <button onClick={addSosContact} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold active:scale-95">+</button>
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
            <h3 className="text-xs font-bold text-purple-800">{'\u{1F49C}'} You Are Not Alone</h3>
            <p className="text-[10px] text-purple-700 mt-1 leading-relaxed">1 in 3 women worldwide experience violence. If you or someone you know needs help, reach out. These helplines are free, confidential, and available 24/7.</p>
          </div>
        </>)}
      </div>
    </div>
  );
}
