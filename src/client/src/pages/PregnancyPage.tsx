import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const weekData: Record<number, { size: string; sizeEmoji: string; length: string; weight: string; baby: string[]; mom: string[]; tips: string[]; trimester: number }> = {
  4: { size: 'Poppy Seed', sizeEmoji: '\u{1F33E}', length: '0.1 cm', weight: '<1g', trimester: 1,
    baby: ['Embryo implants in uterus', 'Neural tube forming', 'Heart begins to form'],
    mom: ['Missed period', 'Fatigue and tenderness', 'Possible nausea starting'],
    tips: ['Start prenatal vitamins with folic acid', 'Avoid alcohol and smoking', 'Schedule your first prenatal visit'] },
  8: { size: 'Raspberry', sizeEmoji: '\u{1FAD0}', length: '1.6 cm', weight: '1g', trimester: 1,
    baby: ['Fingers and toes forming', 'Heart beating at 150-170 bpm', 'Eyelids beginning to form'],
    mom: ['Morning sickness peaks', 'Frequent urination', 'Heightened sense of smell'],
    tips: ['Eat small frequent meals for nausea', 'Stay hydrated', 'Get plenty of rest'] },
  12: { size: 'Lime', sizeEmoji: '\u{1F34B}', length: '5.4 cm', weight: '14g', trimester: 1,
    baby: ['Reflexes developing', 'Fingernails growing', 'Vocal cords forming'],
    mom: ['Nausea may start improving', 'Slight baby bump visible', 'Energy levels increasing'],
    tips: ['First trimester screening tests', 'Start gentle exercise routine', 'Begin moisturizing belly skin'] },
  16: { size: 'Avocado', sizeEmoji: '\u{1F951}', length: '11.6 cm', weight: '100g', trimester: 2,
    baby: ['Facial expressions forming', 'Can hear sounds', 'Skeleton hardening'],
    mom: ['Baby bump growing', 'May feel first flutters', 'Round ligament pain possible'],
    tips: ['Schedule anomaly scan (18-20 weeks)', 'Stay active with prenatal yoga', 'Eat calcium-rich foods'] },
  20: { size: 'Banana', sizeEmoji: '\u{1F34C}', length: '16.5 cm', weight: '300g', trimester: 2,
    baby: ['Can swallow amniotic fluid', 'Developing sleep cycles', 'Vernix coating skin'],
    mom: ['Feeling regular kicks', 'Possible back pain', 'Skin changes (linea nigra)'],
    tips: ['Halfway there! Celebrate', 'Anomaly scan this week', 'Start sleeping on your side'] },
  24: { size: 'Corn Cob', sizeEmoji: '\u{1F33D}', length: '30 cm', weight: '600g', trimester: 2,
    baby: ['Lungs developing surfactant', 'Face fully formed', 'Responding to touch and sound'],
    mom: ['Braxton Hicks may start', 'Swelling in feet/ankles', 'Glucose screening test due'],
    tips: ['Take glucose tolerance test', 'Elevate feet when resting', 'Practice relaxation techniques'] },
  28: { size: 'Eggplant', sizeEmoji: '\u{1F346}', length: '37.5 cm', weight: '1kg', trimester: 3,
    baby: ['Eyes can open and close', 'Brain developing rapidly', 'Can recognize your voice'],
    mom: ['Third trimester begins', 'Shortness of breath', 'Trouble sleeping'],
    tips: ['Start counting kicks daily', 'Prepare hospital bag', 'Discuss birth plan with doctor'] },
  32: { size: 'Coconut', sizeEmoji: '\u{1F965}', length: '42 cm', weight: '1.7kg', trimester: 3,
    baby: ['Practicing breathing movements', 'Bones hardening (skull stays soft)', 'Developing immune system'],
    mom: ['Frequent bathroom trips', 'Heartburn and indigestion', 'Nesting instinct may kick in'],
    tips: ['Finalize birth plan', 'Take childbirth classes', 'Install car seat'] },
  36: { size: 'Honeydew Melon', sizeEmoji: '\u{1F348}', length: '47 cm', weight: '2.6kg', trimester: 3,
    baby: ['Head may engage in pelvis', 'Lungs nearly mature', 'Gaining 30g per day'],
    mom: ['Increased pelvic pressure', 'Difficulty sleeping', 'Braxton Hicks more frequent'],
    tips: ['Pack hospital bag now', 'Know signs of labor', 'Rest as much as possible'] },
  40: { size: 'Watermelon', sizeEmoji: '\u{1F349}', length: '51 cm', weight: '3.4kg', trimester: 3,
    baby: ['Fully developed and ready!', 'Chest and head have same circumference', 'Lungs ready to breathe'],
    mom: ['Cervix may be dilating', 'Contractions may start', 'Extreme nesting urge'],
    tips: ['Baby can arrive any day!', 'Stay calm and relaxed', 'Call doctor if water breaks'] },
};

const weeks = Object.keys(weekData).map(Number);
const trimesterNames = ['', '1st Trimester', '2nd Trimester', '3rd Trimester'];
const trimesterWeeks = ['', 'Weeks 1\u201312', 'Weeks 13\u201326', 'Weeks 27\u201340'];

export default function PregnancyPage() {
  const nav = useNavigate();
  const [week, setWeek] = useState(16);
  const [tab, setTab] = useState<'baby' | 'mom' | 'tips'>('baby');
  const [done, setDone] = useState<Record<number, boolean[]>>({});

  const data = weekData[week] || weekData[16];
  const pct = Math.round((week / 40) * 100);
  const daysLeft = (40 - week) * 7;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysLeft);

  const toggleCheck = (wi: number, ci: number) => {
    const cur = done[wi] || data.tips.map(() => false);
    const next = [...cur];
    next[ci] = !next[ci];
    setDone({ ...done, [wi]: next });
  };

  const checks = done[week] || data.tips.map(() => false);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')} className="text-xl">{'\u2190'}</button>
        <h1 className="text-lg font-bold">Pregnancy Tracker</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Week Hero Card */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wider">Week</p>
              <p className="text-5xl font-extrabold">{week}</p>
              <p className="text-white/70 text-xs mt-1">of 40 \u2022 {trimesterNames[data.trimester]}</p>
            </div>
            <div className="text-center">
              <span className="text-5xl">{data.sizeEmoji}</span>
              <p className="text-xs text-white/80 mt-1">{data.size}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>{pct}% complete</span>
              <span>{daysLeft} days left</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5">
              <div className="bg-white h-2.5 rounded-full transition-all" style={{ width: pct + '%' }} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <div className="bg-white/15 rounded-xl px-3 py-2 text-xs flex-1 text-center">
              <p className="text-white/60">Length</p><p className="font-bold">{data.length}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-xs flex-1 text-center">
              <p className="text-white/60">Weight</p><p className="font-bold">{data.weight}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-xs flex-1 text-center">
              <p className="text-white/60">Due Date</p><p className="font-bold">{dueDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Select Week</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {weeks.map(w => (
              <button key={w} onClick={() => setWeek(w)}
                className={'flex-shrink-0 w-11 h-11 rounded-full text-xs font-bold transition-all active:scale-90 ' +
                  (w === week ? 'bg-purple-500 text-white shadow-lg' :
                   w <= week ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400')}>
                {w}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3].map(t => (
              <span key={t} className={'text-[10px] font-semibold ' + (data.trimester === t ? 'text-purple-600' : 'text-gray-300')}>
                {trimesterWeeks[t]}
              </span>
            ))}
          </div>
        </div>

        {/* Baby / Mom / Tips Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {([['baby', '\u{1F476} Baby'], ['mom', '\u{1F930} You'], ['tips', '\u{1F4CB} Tips']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={'flex-1 py-3 text-xs font-bold transition-colors ' + (tab === key ? 'text-purple-600 border-b-2 border-purple-500' : 'text-gray-400')}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {(tab === 'baby' ? data.baby : tab === 'mom' ? data.mom : data.tips).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ' +
                  (tab === 'baby' ? 'bg-purple-100 text-purple-500' : tab === 'mom' ? 'bg-pink-100 text-pink-500' : 'bg-emerald-100 text-emerald-500')}>
                  {tab === 'tips' ? (i + 1) : '\u2022'}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Checklist */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">{'\u2705'} Week {week} Checklist</h3>
          {data.tips.map((tip, i) => (
            <button key={i} onClick={() => toggleCheck(week, i)} className="flex items-center gap-3 w-full py-2.5 border-b border-gray-50 last:border-0">
              <div className={'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors ' +
                (checks[i] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300')}>
                {checks[i] && '\u2713'}
              </div>
              <span className={'text-sm flex-1 text-left ' + (checks[i] ? 'text-gray-400 line-through' : 'text-gray-700')}>{tip}</span>
            </button>
          ))}
        </div>

        {/* Upcoming Appointments Reminder */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-blue-800 mb-2">{'\u{1F4C5}'} Key Appointments</h3>
          <div className="space-y-2 text-xs text-blue-700">
            {week < 12 && <p>{'\u2022'} First prenatal visit & dating scan (8\u201312 weeks)</p>}
            {week < 14 && <p>{'\u2022'} First trimester screening (11\u201314 weeks)</p>}
            {week < 20 && <p>{'\u2022'} Anomaly scan / anatomy ultrasound (18\u201322 weeks)</p>}
            {week < 28 && <p>{'\u2022'} Glucose tolerance test (24\u201328 weeks)</p>}
            {week >= 28 && week < 36 && <p>{'\u2022'} Bi-weekly checkups begin</p>}
            {week >= 36 && <p>{'\u2022'} Weekly checkups until delivery</p>}
            <button onClick={() => nav('/doctors')} className="text-blue-600 font-bold underline mt-1">Find a Doctor {'\u2192'}</button>
          </div>
        </div>

        {/* Emergency Signs */}
        <div className="bg-red-50 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-red-700 mb-2">{'\u26A0\uFE0F'} When to Call Your Doctor</h3>
          <div className="text-xs text-red-600 space-y-1">
            <p>{'\u2022'} Heavy bleeding or fluid leakage</p>
            <p>{'\u2022'} Severe abdominal pain or cramping</p>
            <p>{'\u2022'} High fever (above 100.4\u00B0F / 38\u00B0C)</p>
            <p>{'\u2022'} Severe headache or vision changes</p>
            <p>{'\u2022'} Reduced or no baby movements (after 28 weeks)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
