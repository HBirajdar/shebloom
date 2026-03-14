import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pregnancyAPI, wellnessContentAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── Comprehensive Week Data ────────────────────
const weekData: Record<number, { size: string; emoji: string; len: string; wt: string; tri: number; baby: string[]; mom: string[]; tips: string[]; nutrition: string[]; exercise: string[] }> = {
  4: { size: 'Poppy Seed', emoji: '\u{1F33E}', len: '0.1 cm', wt: '<1g', tri: 1,
    baby: ['Embryo implants in uterus wall', 'Neural tube beginning to form', 'Tiny heart starts to develop', 'Amniotic sac forming around embryo'],
    mom: ['Missed period — first sign!', 'Fatigue and breast tenderness', 'Possible light spotting (implantation)', 'Heightened sense of smell'],
    tips: ['Start prenatal vitamins with 400\u00B5g folic acid', 'Avoid alcohol, smoking & raw fish', 'Schedule your first prenatal appointment', 'Begin tracking symptoms in a journal'],
    nutrition: ['Folic acid (leafy greens, fortified cereals)', 'Iron (red meat, spinach, lentils)', 'Stay hydrated — 8–10 glasses/day', 'Small frequent meals if nauseated'],
    exercise: ['Walking 20–30 min daily', 'Gentle yoga & stretching', 'Avoid contact sports', 'Listen to your body — rest when tired'] },
  8: { size: 'Raspberry', emoji: '\u{1FAD0}', len: '1.6 cm', wt: '1g', tri: 1,
    baby: ['All major organs forming', 'Tiny fingers and toes appear', 'Heart beats at 150–170 BPM', 'Eyelids starting to fuse shut'],
    mom: ['Morning sickness at its peak', 'Frequent urination begins', 'Breast size increasing', 'Extreme fatigue is normal'],
    tips: ['Eat small meals every 2–3 hours', 'Ginger tea helps with nausea', 'Get 8–9 hours of sleep', 'First ultrasound may happen now'],
    nutrition: ['Vitamin B6 helps nausea (bananas, nuts)', 'Protein at every meal', 'Avoid unpasteurized dairy', 'Calcium-rich foods (yogurt, cheese)'],
    exercise: ['Prenatal swimming', 'Light pilates', 'Kegel exercises — start now!', 'Rest on your side when possible'] },
  12: { size: 'Lime', emoji: '\u{1F34B}', len: '5.4 cm', wt: '14g', tri: 1,
    baby: ['Reflexes developing — can kick!', 'Fingernails and toenails growing', 'Vocal cords beginning to form', 'Kidneys start producing urine'],
    mom: ['Nausea often starts improving', 'Energy returning gradually', 'Slight baby bump may show', 'Skin may glow or break out'],
    tips: ['First trimester screening (NT scan)', 'Share news with close family', 'Start moisturizing belly daily', 'Begin researching birthing classes'],
    nutrition: ['Omega-3 fatty acids (salmon, walnuts)', 'Fiber-rich foods prevent constipation', 'Vitamin D (sunlight, fortified milk)', 'Limit caffeine to 200mg/day'],
    exercise: ['Prenatal yoga classes', 'Stationary cycling', 'Arm exercises with light weights', 'Pelvic floor exercises'] },
  16: { size: 'Avocado', emoji: '\u{1F951}', len: '11.6 cm', wt: '100g', tri: 2,
    baby: ['Can make facial expressions!', 'Bones hardening (ossifying)', 'Can hear your heartbeat', 'Eyebrows and eyelashes growing'],
    mom: ['Baby bump clearly visible', 'May feel first flutters ("quickening")', 'Round ligament pain possible', 'Nasal congestion is common'],
    tips: ['Schedule anomaly scan (18–20 weeks)', 'Start sleeping on your left side', 'Plan a babymoon trip', 'Begin thinking about baby names'],
    nutrition: ['Increase protein intake to 75g/day', 'Calcium: 1000mg/day (dairy, tofu)', 'Vitamin C (oranges, bell peppers)', 'Iron supplements if prescribed'],
    exercise: ['Swimming is excellent now', 'Prenatal dance classes', 'Walking 30–45 min daily', 'Avoid high-altitude exercise'] },
  20: { size: 'Banana', emoji: '\u{1F34C}', len: '16.5 cm', wt: '300g', tri: 2,
    baby: ['Developing sleep/wake cycles', 'Can swallow amniotic fluid', 'Vernix (waxy coating) on skin', 'Gender visible on ultrasound'],
    mom: ['Regular kicks felt daily', 'Skin stretching — possible itching', 'Linea nigra may appear', 'Hair and nails growing faster'],
    tips: ['HALFWAY THERE! Celebrate! \u{1F389}', 'Anatomy scan this week', 'Start a kick count journal', 'Research childbirth education classes'],
    nutrition: ['DHA supplement for brain development', 'Zinc (pumpkin seeds, chickpeas)', 'Magnesium (dark chocolate, avocado)', 'Drink 3 liters of water daily'],
    exercise: ['Aqua aerobics', 'Modified yoga poses', 'Gentle back stretches', 'Avoid exercises lying flat on back'] },
  24: { size: 'Corn Cob', emoji: '\u{1F33D}', len: '30 cm', wt: '600g', tri: 2,
    baby: ['Lungs developing surfactant', 'Face fully formed', 'Responds to your voice', 'Taste buds are functional'],
    mom: ['Braxton Hicks may start', 'Swelling in feet and ankles', 'Glucose screening test due', 'Back pain increasing'],
    tips: ['Take glucose tolerance test', 'Elevate feet when resting', 'Practice relaxation techniques', 'Start planning the nursery'],
    nutrition: ['Monitor sugar intake for GD test', 'Potassium (bananas, sweet potatoes)', 'Fiber to prevent hemorrhoids', 'Small meals to reduce heartburn'],
    exercise: ['Prenatal pilates', 'Side-lying exercises', 'Shoulder and neck stretches', 'Pelvic tilts for back pain'] },
  28: { size: 'Eggplant', emoji: '\u{1F346}', len: '37.5 cm', wt: '1 kg', tri: 3,
    baby: ['Eyes can open and close', 'Brain developing rapidly', 'Can dream (REM sleep!)', 'Responds to light through belly'],
    mom: ['Third trimester begins!', 'Shortness of breath', 'Trouble sleeping at night', 'Frequent Braxton Hicks'],
    tips: ['Start counting kicks daily (10 in 2hrs)', 'Prepare your hospital bag', 'Discuss birth plan with doctor', 'Take a hospital tour'],
    nutrition: ['Increase calorie intake by 450/day', 'Vitamin K (broccoli, kale)', 'Evening primrose oil (after 36w, discuss with doctor)', 'Probiotic foods for gut health'],
    exercise: ['Gentle walking only', 'Birthing ball exercises', 'Deep breathing practice', 'Perineal massage preparation'] },
  32: { size: 'Coconut', emoji: '\u{1F965}', len: '42 cm', wt: '1.7 kg', tri: 3,
    baby: ['Practicing breathing movements', 'Bones hardening (skull stays soft)', 'All five senses are functional', 'Gaining ~250g per week'],
    mom: ['Frequent bathroom trips', 'Heartburn and indigestion', 'Nesting instinct kicks in', 'Difficulty finding comfortable sleep position'],
    tips: ['Finalize birth plan', 'Install car seat', 'Wash baby clothes & bedding', 'Practice labor breathing exercises'],
    nutrition: ['Dates (6/day from 36w helps labor)', 'Red raspberry leaf tea (discuss with doctor first)', 'High-protein snacks', 'Limit salty foods for swelling'],
    exercise: ['Squats for labor preparation', 'Cat-cow stretches', 'Ankle circles for swelling', 'Visualization & meditation'] },
  36: { size: 'Honeydew', emoji: '\u{1F348}', len: '47 cm', wt: '2.6 kg', tri: 3,
    baby: ['Head may engage in pelvis', 'Lungs nearly mature', 'Fat layer developing', 'Gaining 30g every day'],
    mom: ['Increased pelvic pressure', 'Lightning crotch pain', '"Dropping" — baby moves lower', 'Cervix may start softening'],
    tips: ['Hospital bag should be packed', 'Know the signs of labor', 'Group B strep test this week', 'Rest as much as possible'],
    nutrition: ['Energy-boosting snacks for labor', 'Continue prenatal vitamins', 'Hydration is critical', 'Complex carbs for sustained energy'],
    exercise: ['Walking to encourage engagement', 'Hip circles on birthing ball', 'Relaxation exercises', 'Partner massage techniques'] },
  40: { size: 'Watermelon', emoji: '\u{1F349}', len: '51 cm', wt: '3.4 kg', tri: 3,
    baby: ['Fully developed!', 'Lungs ready for first breath', 'Immune system boosted by antibodies', 'Average 51cm long, 3.4kg'],
    mom: ['Cervix dilating', 'Mucus plug may pass', 'Extreme nesting urge', 'Contractions may begin anytime'],
    tips: ['Baby can arrive any day!', 'Time contractions (5-1-1 rule)', 'Stay calm — you are ready', 'Call doctor when water breaks'],
    nutrition: ['Light, easily digestible meals', 'Energy bars for early labor', 'Coconut water for electrolytes', 'Honey for quick energy'],
    exercise: ['Walking to stay active and comfortable', 'Nipple stimulation (with doctor OK)', 'Stair climbing', 'Gentle bouncing on birth ball'] },
};

const weeks = Object.keys(weekData).map(Number);
const triNames = ['', '1st Trimester', '2nd Trimester', '3rd Trimester'];
const triColors = ['', 'text-emerald-600 bg-emerald-50', 'text-blue-600 bg-blue-50', 'text-purple-600 bg-purple-50'];

// ─── Baby Growth SVG ─────────────────────────────
export default function PregnancyPage() {
  const nav = useNavigate();
  const isMountedRef = useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);
  const [week, setWeek] = useState(16);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [hasPregnancy, setHasPregnancy] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'baby' | 'mom' | 'tips' | 'nutrition' | 'exercise'>('baby');
  const [done, setDone] = useState<Record<number, boolean[]>>({});
  const [showDateInput, setShowDateInput] = useState(false);
  const [lmpInput, setLmpInput] = useState('');
  const [showEmergencySigns, setShowEmergencySigns] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showAllTabItems, setShowAllTabItems] = useState(false);

  // ─── DB content (Redis → DB → hardcoded fallback) ─────
  const [dbWeekData, setDbWeekData] = useState<Record<number, any>>({});
  useEffect(() => {
    if (!hasPregnancy) return;
    let cancelled = false;
    wellnessContentAPI.getByType('pregnancy_week', { week }).then(r => {
      if (cancelled) return;
      const items = r?.data?.data;
      if (!Array.isArray(items) || items.length === 0) return;
      const meta = items.find((i: any) => i.key?.endsWith('_meta'));
      const baby = items.filter((i: any) => i.category === 'baby').sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i: any) => i.body);
      const mom = items.filter((i: any) => i.category === 'mom').sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i: any) => i.body);
      const tips = items.filter((i: any) => i.category === 'tips').sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i: any) => i.body);
      const nutrition = items.filter((i: any) => i.category === 'nutrition').sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i: any) => i.body);
      const exercise = items.filter((i: any) => i.category === 'exercise').sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i: any) => i.body);
      if (baby.length || mom.length || tips.length) {
        setDbWeekData(prev => ({ ...prev, [week]: {
          size: meta?.title || meta?.metadata?.size || '',
          emoji: meta?.emoji || '', len: meta?.metadata?.length || '',
          wt: meta?.metadata?.weight || '', tri: meta?.metadata?.trimester || 1,
          baby, mom, tips, nutrition, exercise,
        }}));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [week, hasPregnancy]);

  useEffect(() => {
    let cancelled = false;
    pregnancyAPI.get().then(r => {
      if (cancelled) return;
      const data = r.data?.data;
      if (data?.pregnancyWeek && typeof data.pregnancyWeek === 'number') {
        const keys = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
        const nearest = keys.reduce((prev, curr) =>
          Math.abs(curr - data.pregnancyWeek) < Math.abs(prev - data.pregnancyWeek) ? curr : prev
        );
        setWeek(nearest);
        setHasPregnancy(true);
      } else {
        setHasPregnancy(false);
      }
      setApiLoaded(true);
    }).catch(() => { if (!cancelled) { setHasPregnancy(false); setApiLoaded(true); } });
    return () => { cancelled = true; };
  }, []);

  if (!apiLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPregnancy) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">←</button>
          <h1 className="text-lg font-bold flex-1">Pregnancy Tracker</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
          <span className="text-7xl mb-4">🤰</span>
          <h2 className="text-xl font-extrabold text-gray-900">Pregnancy Tracker</h2>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-xs">
            Track your pregnancy week by week with personalized tips, baby development info, and nutrition guidance.
          </p>
          <div className="mt-6 bg-purple-50 rounded-2xl p-5 w-full max-w-xs text-left space-y-2">
            <p className="text-xs font-extrabold text-purple-700 mb-2">You'll see weekly:</p>
            {['👶 Baby size & development', '🧘 Safe exercises & yoga', '🥗 Nutrition & supplements', '💡 Doctor-approved tips'].map(t => (
              <p key={t} className="text-xs text-purple-600">{t}</p>
            ))}
          </div>
          {showDateInput ? (
            <div className="mt-6 w-full max-w-xs space-y-3">
              <label className="text-xs font-bold text-gray-600 block text-left">Last Menstrual Period Date</label>
              <input
                type="date"
                value={lmpInput}
                onChange={e => setLmpInput(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDateInput(false); setLmpInput(''); }}
                  className="flex-1 py-3 rounded-2xl text-gray-600 font-bold text-sm border border-gray-200 active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  disabled={!apiLoaded}
                  onClick={() => {
                    if (!lmpInput) { toast.error('Please select a date'); return; }
                    setApiLoaded(false);
                    pregnancyAPI.create({ lastPeriodDate: lmpInput }).then(() => {
                      if (!isMountedRef.current) return;
                      setHasPregnancy(null);
                      setShowDateInput(false);
                      pregnancyAPI.get().then(r => {
                        if (!isMountedRef.current) return;
                        const data = r.data?.data;
                        if (data?.pregnancyWeek) {
                          const keys = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
                          const nearest = keys.reduce((prev, curr) =>
                            Math.abs(curr - data.pregnancyWeek) < Math.abs(prev - data.pregnancyWeek) ? curr : prev
                          );
                          setWeek(nearest);
                          setHasPregnancy(true);
                        }
                        setApiLoaded(true);
                      }).catch(() => { if (isMountedRef.current) { toast.error('Could not load pregnancy data. Please refresh.'); setApiLoaded(true); } });
                    }).catch(() => { if (isMountedRef.current) { toast.error('Invalid date format'); setApiLoaded(true); } });
                  }}
                  className="flex-1 py-3 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                >
                  {!apiLoaded ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDateInput(true)}
              className="mt-6 w-full max-w-xs py-4 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              🌸 I'm Pregnant! Set My Due Date
            </button>
          )}
        </div>
      </div>
    );
  }

  const d = dbWeekData[week] || weekData[week] || weekData[16];
  const pct = Math.round((week / 40) * 100);
  const daysLeft = (40 - week) * 7;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysLeft);

  const toggleCheck = (ci: number) => {
    const cur = done[week] || d.tips.map(() => false);
    const next = [...cur];
    next[ci] = !next[ci];
    setDone({ ...done, [week]: next });
  };

  const checks = done[week] || d.tips.map(() => false);
  const tabContent: Record<string, { items: string[]; color: string; icon: string }> = {
    baby: { items: [`Length: ${d.len}  \u00B7  Weight: ${d.wt}`, ...d.baby], color: 'purple', icon: '\u{1F476}' },
    mom: { items: d.mom, color: 'pink', icon: '\u{1F930}' },
    tips: { items: d.tips, color: 'emerald', icon: '\u{1F4A1}' },
    nutrition: { items: d.nutrition, color: 'amber', icon: '\u{1F957}' },
    exercise: { items: d.exercise, color: 'blue', icon: '\u{1F3CB}\uFE0F' },
  };

  const cur = tabContent[tab];
  const TAB_PREVIEW_COUNT = 3;
  const hasMoreTabItems = cur.items.length > TAB_PREVIEW_COUNT;
  const visibleTabItems = showAllTabItems ? cur.items : cur.items.slice(0, TAB_PREVIEW_COUNT);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
        <h1 className="text-lg font-bold flex-1">Pregnancy Tracker</h1>
        <span className={'text-[10px] font-bold px-2 py-1 rounded-full ' + triColors[d.tri]}>{triNames[d.tri]}</span>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-600 rounded-3xl p-5 text-white overflow-hidden relative">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 bg-white/10 rounded-full" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-white text-[10px] uppercase tracking-widest font-bold drop-shadow-sm">Week</p>
              <p className="text-5xl font-extrabold leading-none mt-1 drop-shadow-sm">{week}</p>
              <p className="text-white text-sm mt-1 font-medium drop-shadow-sm">of 40 weeks</p>
            </div>
            <div className="text-center bg-white/15 rounded-2xl p-3 backdrop-blur-sm">
              <span className="text-5xl block">{d.emoji}</span>
              <p className="text-[11px] text-white mt-1 font-bold">{d.size}</p>
            </div>
          </div>
          {/* Progress bar - high contrast */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-[10px] font-bold text-white mb-1">
              <span>{pct}% complete</span>
              <span>{daysLeft} days left</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div className="bg-white h-3 rounded-full transition-all shadow-sm" style={{ width: pct + '%' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-white/80 font-medium">1st Tri</span>
              <span className="text-[9px] text-white/80 font-medium">2nd Tri</span>
              <span className="text-[9px] text-white/80 font-medium">3rd Tri</span>
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <div className="bg-white/20 rounded-xl px-4 py-2.5 text-center backdrop-blur-sm inline-flex items-center gap-2">
              <p className="text-[10px] text-white/90 font-medium uppercase">Due</p>
              <p className="text-sm font-extrabold text-white">{dueDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase">Select Week</h3>
            <span className="text-xs text-gray-500">{pct}% complete</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {weeks.map(w => (
              <button key={w} onClick={() => { setWeek(w); setShowAllTabItems(false); }}
                className={'flex-shrink-0 w-12 h-12 rounded-2xl text-xs font-bold transition-all active:scale-90 flex flex-col items-center justify-center ' +
                  (w === week ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' :
                  w < week ? 'bg-purple-50 text-purple-400' : 'bg-gray-50 text-gray-400')}>
                {w}
                <span className="text-[7px] font-normal">{w <= 12 ? 'T1' : w <= 26 ? 'T2' : 'T3'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100">
            {([['baby', '\u{1F476} Baby'], ['mom', '\u{1F930} You'], ['tips', '\u{1F4A1} Tips'], ['nutrition', '\u{1F957} Food'], ['exercise', '\u{1F3CB}\uFE0F Move']] as const).map(([key, label]) => (
              <button key={key} onClick={() => { setTab(key); setShowAllTabItems(false); }}
                className={'flex-shrink-0 px-4 py-3 text-[10px] font-bold whitespace-nowrap transition-all ' + (tab === key ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50' : 'text-gray-400')}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {visibleTabItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ' +
                  (cur.color === 'purple' ? 'bg-purple-400' : cur.color === 'pink' ? 'bg-pink-400' : cur.color === 'emerald' ? 'bg-emerald-400' : cur.color === 'amber' ? 'bg-amber-400' : 'bg-blue-400')}>
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
            {hasMoreTabItems && !showAllTabItems && (
              <button onClick={() => setShowAllTabItems(true)} className="text-xs font-bold text-purple-600 pt-1">
                Show more {'\u2192'}
              </button>
            )}
            {hasMoreTabItems && showAllTabItems && (
              <button onClick={() => setShowAllTabItems(false)} className="text-xs font-bold text-purple-600 pt-1">
                Show less {'\u2191'}
              </button>
            )}
          </div>
        </div>

        {/* Weekly Checklist */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">{'\u2705'} Week {week} Checklist</h3>
            <span className="text-[10px] text-gray-400">{checks.filter(Boolean).length}/{checks.length} done</span>
          </div>
          <div className="space-y-1">
            {d.tips.map((tip: string, i: number) => (
              <button key={i} onClick={() => toggleCheck(i)} className="flex items-center gap-3 w-full py-2.5 px-1 rounded-xl transition-colors active:bg-gray-50">
                <div className={'w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] transition-all flex-shrink-0 ' +
                  (checks[i] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300')}>
                  {checks[i] && '\u2713'}
                </div>
                <span className={'text-sm flex-1 text-left ' + (checks[i] ? 'text-gray-400 line-through' : 'text-gray-700')}>{tip}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Appointments */}
        {(() => {
          const allAppts = [
            { show: week < 12, text: 'First prenatal visit & dating scan (8\u201312 weeks)' },
            { show: week < 14, text: 'First trimester screening / NT scan (11\u201314 weeks)' },
            { show: week >= 12 && week < 22, text: 'Anatomy scan / anomaly ultrasound (18\u201322 weeks)' },
            { show: week >= 20 && week < 28, text: 'Glucose tolerance test (24\u201328 weeks)' },
            { show: week >= 28 && week < 36, text: 'Bi-weekly checkups + growth scan' },
            { show: week >= 35 && week < 38, text: 'Group B Streptococcus test (35\u201337 weeks)' },
            { show: week >= 36, text: 'Weekly checkups until delivery' },
          ].filter(a => a.show);
          const nextAppt = allAppts[0];
          const restAppts = allAppts.slice(1);
          return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-blue-800 mb-2">{'\u{1F4C5}'} Next Appointment</h3>
              {nextAppt ? (
                <div className="bg-white/70 rounded-xl px-3 py-2.5 text-sm text-blue-700 font-medium">
                  {'\u2192'} {nextAppt.text}
                </div>
              ) : (
                <p className="text-xs text-blue-600">No upcoming appointments for this week range.</p>
              )}
              {restAppts.length > 0 && (
                <>
                  <button onClick={() => setShowAllAppointments(!showAllAppointments)} className="text-xs font-bold text-blue-600 mt-2">
                    {showAllAppointments ? 'Hide appointments \u2191' : `View all appointments (${restAppts.length} more) \u2192`}
                  </button>
                  {showAllAppointments && (
                    <div className="space-y-1.5 mt-2 text-xs text-blue-700">
                      {restAppts.map((a, i) => <p key={i}>{'\u2022'} {a.text}</p>)}
                    </div>
                  )}
                </>
              )}
              <button onClick={() => nav('/doctors')} className="text-blue-600 font-bold underline mt-2 block text-xs">Find a Doctor {'\u2192'}</button>
            </div>
          );
        })()}

        {/* Emergency Signs — collapsed by default */}
        <div className="rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowEmergencySigns(!showEmergencySigns)}
            className="w-full text-left bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between"
          >
            <span className="text-xs font-bold text-red-600">{'\u26A0\uFE0F'} Know the warning signs</span>
            <span className="text-red-400 text-xs">{showEmergencySigns ? '\u2191' : '\u2193'}</span>
          </button>
          {showEmergencySigns && (
            <div className="bg-red-50 border border-t-0 border-red-100 rounded-b-2xl px-4 pb-4 pt-2 -mt-3">
              <h3 className="text-sm font-bold text-red-700 mb-2">Call Your Doctor If...</h3>
              <div className="text-xs text-red-600 space-y-1.5">
                <p>{'\u2022'} Heavy bleeding or fluid leaking</p>
                <p>{'\u2022'} Severe abdominal pain / cramping</p>
                <p>{'\u2022'} High fever (above 100.4\u00B0F / 38\u00B0C)</p>
                <p>{'\u2022'} Severe headache or vision changes</p>
                {week >= 28 && <p>{'\u2022'} Fewer than 10 kicks in 2 hours during kick counts</p>}
                {week < 37 && <p>{'\u2022'} Regular contractions before 37 weeks (preterm labor)</p>}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-gray-400 text-center px-4 pb-2">
          For informational purposes only. Consult your healthcare provider for medical advice.
        </p>
      </div>
    </div>
  );
}
