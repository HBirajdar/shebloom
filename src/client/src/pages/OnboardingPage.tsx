// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';

const GOALS = [
  { key: 'periods', emoji: '🩸', label: 'Track my period', desc: 'Monitor cycles & symptoms', storeKey: 'periods' },
  { key: 'ttc', emoji: '🤰', label: 'Try to conceive', desc: 'Fertility window tracking', storeKey: 'fertility' },
  { key: 'pcos', emoji: '💆', label: 'Manage PCOS', desc: 'Hormonal balance & relief', storeKey: 'wellness' },
  { key: 'wellness', emoji: '🧘', label: 'General wellness', desc: 'Holistic health journey', storeKey: 'wellness' },
];

const GOAL_SUBTITLES = {
  periods: "Let's set up your cycle tracker",
  ttc: "Let's optimize your fertility journey",
  pcos: "Let's manage your hormonal health",
  wellness: "Let's personalize your wellness path",
};

const CYCLE_TIPS = {
  periods: '💡 Average cycle is 28 days. Track for 3 months for personalized predictions.',
  ttc: '💡 Knowing your exact cycle length helps predict your fertile window accurately.',
  pcos: '💡 PCOS can cause irregular cycles. Track consistently for better insights.',
  wellness: '💡 Your cycle length helps us recommend the right wellness activities.',
};

const NOTIF_OPTIONS = [
  { key: 'period_reminders', emoji: '🩸', title: 'Period reminders', subtitle: 'Get notified before your period starts' },
  { key: 'fertile_alerts', emoji: '🌡️', title: 'Fertile window alerts', subtitle: 'Know your most fertile days' },
  { key: 'daily_tips', emoji: '💡', title: 'Daily wellness tips', subtitle: 'Quick tips tailored to your cycle phase' },
  { key: 'ayurvedic_recs', emoji: '🌿', title: 'Ayurvedic recommendations', subtitle: 'Dosha-based diet & lifestyle advice' },
];

const DOSHA_QUESTIONS = [
  { q: 'What best describes your body type?', opts: [{ label: 'Thin & light, difficulty gaining weight', dosha: 'Vata' }, { label: 'Medium & muscular, athletic build', dosha: 'Pitta' }, { label: 'Larger & stable, gains weight easily', dosha: 'Kapha' }] },
  { q: 'When stressed, you tend to:', opts: [{ label: 'Worry, feel anxious or scattered', dosha: 'Vata' }, { label: 'Get angry, intense or perfectionistic', dosha: 'Pitta' }, { label: 'Withdraw, feel heavy or depressed', dosha: 'Kapha' }] },
  { q: 'Your sleep is usually:', opts: [{ label: 'Light & irregular, often waking up', dosha: 'Vata' }, { label: 'Moderate with vivid or intense dreams', dosha: 'Pitta' }, { label: 'Deep & long, love sleeping in', dosha: 'Kapha' }] },
];

const DOSHA_INFO = {
  Vata: { emoji: '🌬️', desc: 'Creative, energetic, quick-thinking. Balanced by warmth, routine, and grounding foods.' },
  Pitta: { emoji: '🔥', desc: 'Sharp, ambitious, focused. Balanced by cooling, calming foods and practices.' },
  Kapha: { emoji: '🌿', desc: 'Stable, nurturing, patient. Balanced by stimulating, light, and warm experiences.' },
};

export default function OnboardingPage() {
  const nav = useNavigate();
  const { setGoal, setCycleData } = useCycleStore();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLen, setCycleLen] = useState(28);
  const [doshaAnswers, setDoshaAnswers] = useState([]);
  const [doshaQ, setDoshaQ] = useState(0);
  const [dosha, setDosha] = useState('');
  const [notifPrefs, setNotifPrefs] = useState(['period_reminders', 'fertile_alerts', 'daily_tips', 'ayurvedic_recs']);
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [animClass, setAnimClass] = useState('animate-fadeInUp');

  const handleGoalSelect = (g) => {
    setSelectedGoal(g.key);
    setGoal(g.storeKey);
  };

  const handleDoshaAnswer = (chosen) => {
    const next = [...doshaAnswers, chosen];
    setDoshaAnswers(next);
    if (doshaQ < 2) { setDoshaQ(doshaQ + 1); }
    else {
      const counts = { Vata: 0, Pitta: 0, Kapha: 0 };
      next.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
      const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      setDosha(winner);
      localStorage.setItem('sb_dosha', winner);
    }
  };

  const toggleNotif = (key) => {
    setNotifPrefs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const changeStep = (newStep) => {
    setAnimClass('');
    requestAnimationFrame(() => {
      setStep(newStep);
      setAnimClass('animate-fadeInUp');
    });
  };

  const handleFinish = () => {
    if (lastPeriod) setCycleData({ lastPeriodDate: lastPeriod, cycleLength: cycleLen });
    localStorage.setItem('sb_notif_prefs', JSON.stringify(notifPrefs));
    if (referralCode.trim()) localStorage.setItem('sb_referral_code', referralCode.trim());
    nav('/auth');
  };

  const canNext = () => {
    if (step === 1) return !!selectedGoal;
    if (step === 2) return !!lastPeriod;
    if (step === 5) return !!dosha;
    return true;
  };

  const TOTAL = 6;

  const goalSubtitle = selectedGoal ? GOAL_SUBTITLES[selectedGoal] : '';

  return (
    <div className={'h-[100dvh] flex flex-col max-w-[430px] mx-auto overflow-hidden ' + (step === 0 ? '' : 'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50')} style={step === 0 ? { background: 'linear-gradient(135deg,#E11D48,#EC4899,#8B5CF6)' } : undefined}>

      {/* Transition keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.35s ease-out both; }
      `}</style>

      {/* Progress bar (steps 1-6) */}
      {step > 0 && (
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => changeStep(Math.max(0, step - 1))} className="text-gray-400 text-sm font-bold active:scale-95 transition-transform">←</button>
            <span className="text-[10px] font-bold text-gray-400">Step {step} of {TOTAL}</span>
            <button onClick={() => nav('/auth')} className="text-[10px] font-bold text-gray-400 active:scale-95 transition-transform">Skip</button>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: (step / TOTAL * 100) + '%', background: 'linear-gradient(90deg,#E11D48,#F43F5E)' }} />
          </div>
          {goalSubtitle && step > 1 && (
            <p className="text-[10px] text-rose-500 font-bold text-center mt-2">{goalSubtitle}</p>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 pb-12">
            <div className="text-8xl mb-6 animate-pulse">🌸</div>
            <h1 className="text-4xl font-extrabold text-white mb-3 leading-tight">Welcome to<br />VedaClue</h1>
            <p className="text-white/80 text-sm leading-relaxed mb-2">Your complete women's wellness companion</p>
            <p className="text-white/60 text-xs mb-10">Period tracking · Ayurveda · Expert doctors</p>
            <button onClick={() => changeStep(1)} className="w-full bg-white rounded-2xl py-4 font-extrabold text-base active:scale-95 transition-transform shadow-xl" style={{ color: '#E11D48' }}>
              Get Started 🌸
            </button>
            <button onClick={() => nav('/auth')} className="mt-4 text-white/60 text-sm active:scale-95 transition-transform">Already have an account? Sign in</button>
          </div>
        )}

        {/* STEP 1: Goal */}
        {step === 1 && (
          <div className={`flex-1 px-5 pt-4 pb-2 ${animClass}`}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">What's your goal? 🎯</h2>
            <p className="text-xs text-gray-500 mb-5">This personalizes your entire experience</p>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map(g => (
                <button key={g.key} onClick={() => handleGoalSelect(g)}
                  className={'p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ' + (selectedGoal === g.key ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-gray-200 bg-white')}>
                  <span className="text-3xl block mb-2">{g.emoji}</span>
                  <p className="text-xs font-extrabold text-gray-900 leading-tight">{g.label}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{g.desc}</p>
                  {selectedGoal === g.key && <span className="text-[9px] font-bold text-rose-500 mt-1 block">✓ Selected</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Last period */}
        {step === 2 && (
          <div className={`flex-1 px-5 pt-4 pb-2 ${animClass}`}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Last period date? 🗓️</h2>
            <p className="text-xs text-gray-500 mb-5">Helps predict your next period & fertile window</p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Start date of last period</label>
              <input type="date" value={lastPeriod} max={new Date().toISOString().split('T')[0]}
                onChange={e => setLastPeriod(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:border-rose-400 focus:outline-none" />
            </div>
            {lastPeriod && (
              <div className="mt-4 bg-rose-50 rounded-2xl p-4 flex items-center gap-3 border border-rose-100">
                <span className="text-2xl">🌸</span>
                <div>
                  <p className="text-xs font-bold text-rose-700">Next period estimated</p>
                  <p className="text-sm font-extrabold text-rose-800">
                    {(() => { const d = new Date(lastPeriod); d.setDate(d.getDate() + cycleLen); return d.toLocaleDateString('en', { month: 'long', day: 'numeric' }); })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Cycle length */}
        {step === 3 && (
          <div className={`flex-1 px-5 pt-4 pb-2 ${animClass}`}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Cycle length? 📏</h2>
            <p className="text-xs text-gray-500 mb-5">Days between the start of one period to the next</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-center gap-5 mb-6">
                <button onClick={() => setCycleLen(Math.max(21, cycleLen - 1))} className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 font-extrabold text-2xl active:scale-95 transition-transform">−</button>
                <div className="text-center">
                  <span className="text-6xl font-extrabold text-gray-900">{cycleLen}</span>
                  <p className="text-xs text-gray-500 font-bold mt-1">days</p>
                </div>
                <button onClick={() => setCycleLen(Math.min(45, cycleLen + 1))} className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 font-extrabold text-2xl active:scale-95 transition-transform">+</button>
              </div>
              <input type="range" min={21} max={45} value={cycleLen} onChange={e => setCycleLen(+e.target.value)} className="w-full accent-rose-500" />
              <div className="flex justify-between text-[9px] text-gray-400 mt-1"><span>21</span><span>45 days</span></div>
            </div>
            <div className="mt-4 bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-[10px] font-bold text-amber-700">💡 Your ovulation estimated on Day {cycleLen - 14}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Average cycle is 28 days. Most are 21–35 days.</p>
            </div>
            {selectedGoal && CYCLE_TIPS[selectedGoal] && (
              <div className="mt-3 bg-purple-50 rounded-2xl p-4 border border-purple-100">
                <p className="text-[10px] font-bold text-purple-700">{CYCLE_TIPS[selectedGoal]}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Notification preferences */}
        {step === 4 && (
          <div className={`flex-1 px-5 pt-4 pb-2 ${animClass}`}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Stay in the loop 🔔</h2>
            <p className="text-xs text-gray-500 mb-5">Choose what you'd like to be reminded about</p>
            <div className="space-y-3">
              {NOTIF_OPTIONS.map(opt => {
                const enabled = notifPrefs.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleNotif(opt.key)}
                    className={'w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ' + (enabled ? 'border-rose-400 bg-rose-50 shadow-sm' : 'border-gray-200 bg-white')}
                  >
                    <span className="text-2xl shrink-0">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-gray-900">{opt.title}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{opt.subtitle}</p>
                    </div>
                    <div className={'w-10 h-6 rounded-full flex items-center px-0.5 transition-all shrink-0 ' + (enabled ? 'bg-rose-500 justify-end' : 'bg-gray-300 justify-start')}>
                      <div className="w-5 h-5 bg-white rounded-full shadow-sm transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Dosha */}
        {step === 5 && (
          <div className={`flex-1 px-5 pt-4 pb-2 ${animClass}`}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Discover your Dosha ✨</h2>
            <p className="text-xs text-gray-500 mb-4">3 quick questions to find your Ayurvedic type</p>
            {dosha ? (
              <div>
                <div className="rounded-3xl p-6 text-white text-center mb-4" style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                  <span className="text-5xl block mb-3">{DOSHA_INFO[dosha]?.emoji}</span>
                  <p className="text-sm text-white/80">You are primarily</p>
                  <p className="text-3xl font-extrabold">{dosha}</p>
                  <p className="text-white/80 text-xs mt-3 leading-relaxed">{DOSHA_INFO[dosha]?.desc}</p>
                </div>
                <p className="text-[10px] text-center text-gray-400">Your experience will be personalized for your Dosha 🌿</p>
              </div>
            ) : (
              <div>
                <div className="flex gap-1.5 mb-4">
                  {[0,1,2].map(i => <div key={i} className={'h-1.5 flex-1 rounded-full ' + (i <= doshaQ ? 'bg-rose-400' : 'bg-gray-200')} />)}
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-800 mb-4 leading-relaxed">{DOSHA_QUESTIONS[doshaQ].q}</p>
                  <div className="space-y-2.5">
                    {DOSHA_QUESTIONS[doshaQ].opts.map(opt => (
                      <button key={opt.dosha} onClick={() => handleDoshaAnswer(opt.dosha)}
                        className="w-full text-left p-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 active:scale-[0.99] transition-all">
                        <p className="text-xs font-bold text-gray-700">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: All Set */}
        {step === 6 && (
          <div className={`flex-1 px-5 pt-4 pb-2 flex flex-col ${animClass}`}>
            <div className="text-center mb-6">
              <span className="text-6xl block animate-bounce">🎉</span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-3">You're all set!</h2>
              <p className="text-xs text-gray-500 mt-2">Your personalized journey begins now</p>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3 mb-5">
              <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Your Profile Summary</h3>
              {[
                { label: 'Goal', value: (GOALS.find(g => g.key === selectedGoal)?.emoji || '🩸') + ' ' + (GOALS.find(g => g.key === selectedGoal)?.label || 'Track my period') },
                { label: 'Cycle Length', value: cycleLen + ' days' },
                { label: 'Dosha', value: dosha ? (DOSHA_INFO[dosha]?.emoji + ' ' + dosha) : '✨ Not set' },
                { label: 'Notifications', value: notifPrefs.length + ' of ' + NOTIF_OPTIONS.length + ' enabled' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-extrabold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 mb-4">
              <p className="text-[10px] text-rose-700 font-bold mb-2">🌸 What's waiting for you</p>
              {['Personalized cycle predictions', 'Phase-specific Ayurveda picks', 'Wellness activity tracking', 'Expert doctor network'].map(f => (
                <p key={f} className="text-[10px] text-rose-600 mb-1">✓ {f}</p>
              ))}
            </div>

            {/* Referral code */}
            <div className="mb-5">
              <button
                onClick={() => setShowReferral(!showReferral)}
                className="text-[11px] font-bold text-purple-600 active:scale-95 transition-transform flex items-center gap-1"
              >
                🎁 Have a referral code?
                <span className={'transition-transform inline-block ' + (showReferral ? 'rotate-180' : '')}> ▾</span>
              </button>
              {showReferral && (
                <div className="mt-2 animate-fadeInUp">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="Enter referral code"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:border-purple-400 focus:outline-none bg-white"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Will be applied after you sign up</p>
                </div>
              )}
            </div>

            <button onClick={handleFinish} className="w-full py-4 rounded-2xl text-white font-extrabold text-base active:scale-95 transition-transform shadow-lg" style={{ background: 'linear-gradient(135deg,#E11D48,#F43F5E)' }}>
              Start My Journey 🌸
            </button>
          </div>
        )}
      </div>

      {/* Next button (steps 1–5) */}
      {step > 0 && step < 6 && (
        <div className="shrink-0 px-5 pb-6 pt-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => changeStep(step + 1)} disabled={!canNext()}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-base active:scale-95 transition-transform shadow-lg disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#E11D48,#F43F5E)' }}>
            {step === 5 && !dosha ? 'Answer all 3 questions' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  );
}
