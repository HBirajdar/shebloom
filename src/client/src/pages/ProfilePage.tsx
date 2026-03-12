// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import { userAPI } from '../services/api';
import { api } from '../services/api';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   VEDACLUE PROFILE — Smart Auth Provider Field Locking
   ═══════════════════════════════════════════════════════ */

const DOSHA_INFO: Record<string, { emoji: string; color: string; bg: string; desc: string; tips: string[] }> = {
  Vata: {
    emoji: '🌬️', color: '#7C3AED', bg: '#F5F3FF',
    desc: 'Creative, energetic, quick-thinking. You thrive with routine, warmth, and grounding.',
    tips: ['Eat warm, cooked foods', 'Establish a daily routine', 'Oil massage daily (Abhyanga)', 'Avoid cold drinks and raw salads'],
  },
  Pitta: {
    emoji: '🔥', color: '#D97706', bg: '#FFFBEB',
    desc: 'Sharp, ambitious, focused. Balanced by cooling foods, calm environments, and moderation.',
    tips: ['Eat cooling foods (cucumber, coconut)', 'Avoid excessive heat and spice', 'Practice cooling pranayama', 'Take breaks from intense work'],
  },
  Kapha: {
    emoji: '🌿', color: '#059669', bg: '#ECFDF5',
    desc: 'Stable, nurturing, patient. Activated by movement, stimulation, and warm, light food.',
    tips: ['Start mornings with brisk exercise', 'Eat light, spicy, warm foods', 'Avoid heavy, sweet, oily foods', 'Try dry brushing before shower'],
  },
};

const ACHIEVEMENTS_DEF = [
  { id: 'first_period', emoji: '🌸', title: 'First Period Logged', desc: 'Logged your very first period', key: 'sb_first_period' },
  { id: 'streak_7', emoji: '🔥', title: '7-Day Streak', desc: 'Completed daily routine 7 days', key: 'sb_streak', threshold: 7 },
  { id: 'cycles_3', emoji: '📊', title: '3 Cycles Tracked', desc: 'Tracked 3 full cycles', key: 'sb_cycles_count', threshold: 3 },
  { id: 'community', emoji: '💬', title: 'Community Member', desc: 'Joined the VedaClue community', key: 'sb_community_joined' },
  { id: 'water', emoji: '💧', title: 'Hydration Hero', desc: 'Hit 8 glasses in a day', key: 'sb_water_goal' },
];

const sections = [
  { title: 'Health', items: [
    { i: '📊', l: 'My Health Reports', action: 'reports' },
    { i: '📅', l: 'Cycle Settings', action: 'cycle' },
    { i: '🌿', l: 'Ayurveda Shop', action: 'ayurveda' },
    { i: '\u{1F4E6}', l: 'My Orders', action: 'my-orders' },
    { i: '👩‍⚕️', l: 'My Doctors', action: 'doctors' },
    { i: '💬', l: 'Community', action: 'community' },
    { i: '🎯', l: 'Wellness Programs', action: 'programs' },
  ]},
  { title: 'Support', items: [
    { i: '❓', l: 'Help Center', action: 'help' },
    { i: '⭐', l: 'Rate VedaClue', action: 'rate' },
    { i: '🤝', l: 'Share App', action: 'share' },
  ]},
];

// ─── Auth Provider helpers ───────────────────────────
function normalizeProvider(p?: string): 'email' | 'mobile' | 'google' | 'apple' | 'unknown' {
  if (!p) return 'unknown';
  const v = p.toLowerCase();
  if (v === 'phone' || v === 'mobile') return 'mobile';
  if (v === 'google') return 'google';
  if (v === 'apple') return 'apple';
  if (v === 'email') return 'email';
  return 'unknown';
}

export default function ProfilePage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const clear = useAuthStore(s => s.clearAuth);
  const { cycleDay, phase, cycleLength, periodLength, hasRealData } = useCycleStore();

  const [showEdit, setShowEdit] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showAdminHint, setShowAdminHint] = useState(false);
  const [secretTaps, setSecretTaps] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'settings'>('overview');

  // Edit form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Mobile OTP flow
  const [mobileStep, setMobileStep] = useState<'idle' | 'otp-sent'>('idle');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Tooltip state
  const [showMobileTip, setShowMobileTip] = useState(false);
  const [showEmailTip, setShowEmailTip] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = (typeof window !== 'undefined') ? document.createElement('input') : null;
  if (avatarInputRef) { avatarInputRef.type = 'file'; avatarInputRef.accept = 'image/jpeg,image/png,image/webp'; }

  const dosha = localStorage.getItem('sb_dosha') || '';
  const doshaInfo = DOSHA_INFO[dosha];
  const streakDays = Number(localStorage.getItem('sb_streak') || '0');
  const cyclesTracked = Number(localStorage.getItem('sb_cycles_count') || (hasRealData ? 1 : 0));

  const earnedAchievements = ACHIEVEMENTS_DEF.filter(a => {
    const val = localStorage.getItem(a.key);
    if (a.threshold) return Number(val || '0') >= a.threshold;
    return !!val;
  });

  // Derive auth provider from user store
  const provider = normalizeProvider(user?.authProvider);
  const isMobileAuth = provider === 'mobile';
  const isEmailAuth = provider === 'email';
  const isGoogleAuth = provider === 'google' || provider === 'apple';

  // Field lock rules:
  // mobile auth  → mobile LOCKED, email editable
  // email auth   → email LOCKED (it's their login), mobile editable (with OTP)
  // google/apple → both email and mobile editable
  const mobileLocked = isMobileAuth;
  const emailLocked = isEmailAuth;

  useEffect(() => {
    if (!user) return;
    userAPI.me().then(res => {
      const p = res.data.data || res.data;
      if (p) {
        setUser({
          ...user,
          fullName: p.fullName || user.fullName,
          email: p.email || undefined,
          phone: p.phone || user.phone,
          authProvider: p.authProvider || user.authProvider,
        });
      }
    }).catch(() => {});
  }, []);

  const openEdit = () => {
    setMobileStep('idle');
    setOtp('');
    setNewPhone('');
    setLoadingProfile(true);
    setShowEdit(true);
    userAPI.me().then(res => {
      const p = res.data.data || res.data;
      if (p) {
        setName(p.fullName || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setDob(p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '');
        setNewPhone(p.phone || '');
      }
    }).catch(() => {
      setName(user?.fullName || '');
      setEmail(user?.email || '');
      setPhone(user?.phone || '');
      setNewPhone(user?.phone || '');
    }).finally(() => setLoadingProfile(false));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data: any = {};
      if (name.trim()) data.fullName = name.trim();
      // Only send email if not locked
      if (!emailLocked && email.trim()) data.email = email.trim();
      if (dob) data.dateOfBirth = dob;
      if (Object.keys(data).length === 0) { toast('No changes'); setShowEdit(false); setSaving(false); return; }
      const res = await userAPI.update(data);
      const updated = res.data.data || res.data;
      if (updated && user) setUser({ ...user, fullName: updated.fullName || user.fullName, email: updated.email || user.email });
      toast.success('Profile saved!');
      setShowEdit(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save';
      if (msg.includes('Unique') || msg.includes('unique')) toast.error('Email already in use by another account');
      else toast.error(msg);
    }
    setSaving(false);
  };

  const sendMobileOtp = async () => {
    if (!newPhone.trim() || newPhone.trim().length < 10) { toast.error('Enter a valid mobile number'); return; }
    if (newPhone.trim() === phone) { toast('Same number — no change needed'); return; }
    setOtpLoading(true);
    try {
      await userAPI.sendMobileOtp(newPhone.trim());
      setMobileStep('otp-sent');
      toast.success('OTP sent to ' + newPhone.trim());
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    }
    setOtpLoading(false);
  };

  const confirmMobileOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setOtpLoading(true);
    try {
      const res = await userAPI.confirmMobile(newPhone.trim(), otp.trim());
      const updated = res.data.data;
      if (updated && user) setUser({ ...user, phone: updated.phone });
      setPhone(newPhone.trim());
      setMobileStep('idle');
      setOtp('');
      toast.success('Mobile number verified and saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    }
    setOtpLoading(false);
  };

  const handleAvatarUpload = async () => {
    if (!avatarInputRef) return;
    avatarInputRef.onchange = async (ev: any) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
      setAvatarUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const photoUrl = uploadRes.data.data.url;
        await userAPI.update({ photoUrl });
        if (user) setUser({ ...user, avatarUrl: photoUrl, photoUrl });
        toast.success('Avatar updated!');
      } catch { toast.error('Upload failed'); }
      setAvatarUploading(false);
    };
    avatarInputRef.click();
  };

  const handleItem = (action: string) => {
    const routes: Record<string, string> = { reports: '/reports', cycle: '/tracker', ayurveda: '/ayurveda', doctors: '/doctors', community: '/community', programs: '/programs', 'my-orders': '/my-orders' };
    if (action === 'edit') openEdit();
    else if (routes[action]) nav(routes[action]);
    else if (action === 'share' && navigator.share) navigator.share({ title: 'VedaClue', text: 'Your women\'s wellness companion', url: window.location.origin });
    else toast('Coming soon!');
  };

  const dn = user?.fullName || 'User';
  const initials = dn.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const de = user?.email || user?.phone || '';
  const phaseEmojis: Record<string, string> = { menstrual: '🩸', follicular: '🌱', ovulation: '✨', luteal: '🍂' };

  // Provider badge
  const providerBadge = { email: { label: 'Email Login', icon: '📧', color: '#3B82F6' }, mobile: { label: 'Mobile Login', icon: '📱', color: '#10B981' }, google: { label: 'Google Login', icon: '🌐', color: '#EF4444' }, apple: { label: 'Apple Login', icon: '🍎', color: '#374151' }, unknown: { label: 'Standard Login', icon: '🔑', color: '#6B7280' } }[provider];

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">

      {/* ─── Profile Header ─── */}
      <div className="relative overflow-hidden">
        <div className="px-5 pt-12 pb-6 text-white" style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899,#8B5CF6)' }}>
          <button onClick={() => nav('/dashboard')} className="absolute left-4 top-4 text-white/70 text-2xl active:scale-90 transition-transform">‹</button>
          <div className="flex items-end gap-4 mb-3">
            <div className="relative">
              <button onClick={handleAvatarUpload} disabled={avatarUploading} className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-extrabold border-2 border-white/30 overflow-hidden active:scale-95 transition-transform">
                {avatarUploading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : (user?.photoUrl || user?.avatarUrl) ? (
                  <img src={user.photoUrl || user.avatarUrl} alt={dn} className="w-full h-full object-cover" />
                ) : initials}
              </button>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center"><span className="text-[8px]">📷</span></div>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-extrabold">{dn}</h2>
              <p className="text-xs text-white/70 mt-0.5">{de}</p>
              {/* Provider badge */}
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <span>{providerBadge.icon}</span>{providerBadge.label}
              </span>
              <button onClick={openEdit} className="block mt-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold active:scale-95 transition-transform">✏️ Edit Profile</button>
            </div>
          </div>
          {hasRealData && (
            <div className="flex gap-2 mt-3">
              {[
                { l: 'Cycle Day', v: `${cycleDay}/${cycleLength}` },
                { l: 'Phase', v: `${phaseEmojis[phase] || '✨'} ${phase?.charAt(0).toUpperCase() + phase?.slice(1)}` },
                { l: 'Streak', v: `🔥 ${streakDays}d` },
              ].map(s => (
                <div key={s.l} className="flex-1 bg-white/15 rounded-xl p-2 text-center">
                  <p className="text-xs font-extrabold">{s.v}</p>
                  <p className="text-[8px] text-white/60 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 bg-white border-b border-gray-100 flex gap-0">
          {[{ id: 'overview', label: 'Overview' }, { id: 'achievements', label: 'Badges' }, { id: 'settings', label: 'Settings' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={'flex-1 py-3 text-[11px] font-bold border-b-2 transition-all ' + (activeTab === t.id ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-400')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {activeTab === 'overview' && (<>
          {doshaInfo ? (
            <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: doshaInfo.bg }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{doshaInfo.emoji}</span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: doshaInfo.color }}>Your Dosha</p>
                  <p className="text-lg font-extrabold text-gray-900">{dosha} Prakriti</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{doshaInfo.desc}</p>
              <div className="space-y-1">
                {doshaInfo.tips.map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: doshaInfo.color }}>✓</span>
                    <p className="text-[10px] text-gray-600">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-4 shadow-lg border border-purple-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✨</span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-gray-800">Discover Your Dosha</p>
                  <p className="text-xs text-gray-500 mt-0.5">Take the Ayurvedic quiz in onboarding</p>
                </div>
                <button onClick={() => nav('/onboarding')} className="px-3 py-1.5 rounded-xl text-white text-[10px] font-bold active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                  Take Quiz
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">📈 Stats</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { e: '🔥', v: streakDays, l: 'Day Streak', c: '#F97316' },
                { e: '💧', v: Number(localStorage.getItem('sb_water') || '0'), l: 'Glasses Today', c: '#3B82F6' },
                { e: '😴', v: Number(localStorage.getItem('sb_sleep') || '0'), l: 'Hours Sleep', c: '#7C3AED' },
              ].map(s => (
                <div key={s.l} className="text-center bg-gray-50 rounded-xl p-3">
                  <span className="text-xl block">{s.e}</span>
                  <p className="text-lg font-extrabold mt-1" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-[8px] text-gray-400 font-bold">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {sections.map(sec => (
            <div key={sec.title} className="bg-white rounded-3xl overflow-hidden shadow-lg">
              <p className="text-[10px] font-extrabold text-gray-400 px-5 pt-3 uppercase tracking-wider">{sec.title}</p>
              {sec.items.map((item, i) => (
                <button key={item.l} onClick={() => handleItem(item.action)}
                  className={'w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-gray-50 transition-colors ' + (i < sec.items.length - 1 ? 'border-b border-gray-50' : '')}>
                  <span className="text-lg">{item.i}</span>
                  <span className="flex-1 text-sm font-semibold text-gray-700">{item.l}</span>
                  <span className="text-gray-300">›</span>
                </button>
              ))}
            </div>
          ))}

          {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
            <button onClick={() => nav('/doctor-dashboard')} className="w-full flex items-center gap-3 px-5 py-3.5 bg-white rounded-3xl shadow-lg text-left active:bg-gray-50 transition-colors">
              <span className="text-lg">{'\u{1FA7A}'}</span>
              <span className="flex-1 text-sm font-semibold text-gray-700">Doctor Portal</span>
              <span className="text-gray-300">{'\u{203A}'}</span>
            </button>
          )}
          <button onClick={() => setShowLogout(true)} className="w-full py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Sign Out</button>
          <div className="text-center py-4">
            <button onClick={() => { const n = secretTaps + 1; setSecretTaps(n); if (n >= 5) { setShowAdminHint(true); setSecretTaps(0); }}} className="text-[10px] text-gray-300 select-none">VedaClue v2.1</button>
          </div>
        </>)}

        {activeTab === 'achievements' && (<>
          <div className="bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-xs font-extrabold text-amber-800">🏆 Your Achievements</p>
            <p className="text-[10px] text-amber-700 mt-0.5">{earnedAchievements.length}/{ACHIEVEMENTS_DEF.length} badges earned</p>
            <div className="w-full bg-amber-100 rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-amber-400 to-rose-400 h-2 rounded-full transition-all" style={{ width: `${(earnedAchievements.length / ACHIEVEMENTS_DEF.length) * 100}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS_DEF.map(a => {
              const earned = earnedAchievements.some(e => e.id === a.id);
              return (
                <div key={a.id} className={`bg-white rounded-3xl p-4 shadow-lg text-center border-2 transition-all ${earned ? 'border-amber-200' : 'border-gray-100 opacity-50'}`}>
                  <span className={`text-3xl block mb-2 ${!earned ? 'grayscale' : ''}`}>{a.emoji}</span>
                  <p className="text-xs font-extrabold text-gray-800">{a.title}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">{a.desc}</p>
                  <span className={`inline-block mt-2 text-[8px] font-bold px-2 py-0.5 rounded-full ${earned ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50'}`}>
                    {earned ? 'Earned ✓' : 'Locked 🔒'}
                  </span>
                </div>
              );
            })}
          </div>
        </>)}

        {activeTab === 'settings' && (<>
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">📅 Cycle Settings</h3>
            {[
              { l: 'Cycle Length', v: `${cycleLength} days` },
              { l: 'Period Length', v: `${periodLength} days` },
              { l: 'Status', v: hasRealData ? 'Active ✅' : 'No data yet' },
            ].map(s => (
              <div key={s.l} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-600">{s.l}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-gray-900">{s.v}</span>
                  <button onClick={() => nav('/tracker')} className="text-[9px] text-rose-500 font-bold active:scale-95">Edit</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">🔒 Privacy</h3>
            <button onClick={() => toast('Data export coming soon!')} className="w-full text-left flex items-center justify-between py-2.5 border-b border-gray-50 active:bg-gray-50">
              <span className="text-xs text-gray-600">Export my data</span><span className="text-gray-300 text-lg">›</span>
            </button>
            <button onClick={() => toast.error('Account deletion requires email confirmation.')} className="w-full text-left flex items-center justify-between py-2 active:bg-gray-50">
              <span className="text-xs text-rose-500">Delete account</span><span className="text-gray-300 text-lg">›</span>
            </button>
          </div>

          <button onClick={() => setShowLogout(true)} className="w-full py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Sign Out</button>
        </>)}
      </div>

      {/* ─── Edit Profile Modal ───────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowEdit(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-2" />
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold">Edit Profile</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 text-xl active:scale-90">✕</button>
            </div>

            {loadingProfile ? (
              <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>
            ) : (<>

              {/* Full Name — always editable */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Sugandhika"
                  className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
              </div>

              {/* Email field */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
                  {emailLocked && (
                    <button onMouseEnter={() => setShowEmailTip(true)} onMouseLeave={() => setShowEmailTip(false)}
                      onClick={() => setShowEmailTip(v => !v)} className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      🔒 Login email
                    </button>
                  )}
                </div>
                {showEmailTip && emailLocked && (
                  <div className="absolute top-6 right-0 z-10 bg-gray-800 text-white text-[10px] rounded-lg px-3 py-2 w-52 shadow-xl">
                    Cannot change login email address. Contact support to update.
                  </div>
                )}
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  disabled={emailLocked} placeholder="your@email.com"
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
                    emailLocked
                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 focus:border-rose-400'
                  }`} />
                {emailLocked && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <span>🔒</span> Cannot change login email address
                  </p>
                )}
              </div>

              {/* Date of Birth — always editable */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Date of Birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                  className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
              </div>

              {/* Mobile field — smart locking + OTP */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number</label>
                  {mobileLocked && (
                    <button onMouseEnter={() => setShowMobileTip(true)} onMouseLeave={() => setShowMobileTip(false)}
                      onClick={() => setShowMobileTip(v => !v)} className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      🔒 Login mobile
                    </button>
                  )}
                </div>
                {showMobileTip && mobileLocked && (
                  <div className="absolute top-6 right-0 z-10 bg-gray-800 text-white text-[10px] rounded-lg px-3 py-2 w-52 shadow-xl">
                    Cannot change login mobile number. This is your primary login method.
                  </div>
                )}

                {mobileLocked ? (
                  <>
                    <div className="relative">
                      <input type="tel" value={phone} disabled
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">🔒</span>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <span>🔒</span> Cannot change login mobile number
                    </p>
                  </>
                ) : (
                  <>
                    {/* Editable mobile with OTP verification */}
                    {mobileStep === 'idle' ? (
                      <div className="flex gap-2">
                        <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                          placeholder="+91 9405424185"
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
                        {newPhone !== phone && newPhone.trim().length >= 10 && (
                          <button onClick={sendMobileOtp} disabled={otpLoading}
                            className="px-3 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-bold whitespace-nowrap disabled:opacity-50 active:scale-95">
                            {otpLoading ? '...' : 'Send OTP'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold">
                          <span>✅</span> OTP sent to {newPhone}
                          <button onClick={() => setMobileStep('idle')} className="ml-auto text-gray-400 underline">Change</button>
                        </div>
                        <div className="flex gap-2">
                          <input type="number" value={otp} onChange={e => setOtp(e.target.value)}
                            placeholder="Enter 6-digit OTP" maxLength={6}
                            className="flex-1 px-4 py-3 border-2 border-emerald-300 rounded-xl text-sm focus:border-emerald-500 focus:outline-none text-center tracking-widest font-bold" />
                          <button onClick={confirmMobileOtp} disabled={otpLoading}
                            className="px-3 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-bold whitespace-nowrap disabled:opacity-50 active:scale-95">
                            {otpLoading ? '...' : 'Verify'}
                          </button>
                        </div>
                        <button onClick={sendMobileOtp} disabled={otpLoading}
                          className="text-[10px] text-rose-500 font-bold w-full text-center active:scale-95">
                          Resend OTP
                        </button>
                      </div>
                    )}
                    {!phone && mobileStep === 'idle' && (
                      <p className="text-[10px] text-gray-400 mt-1">Add a mobile number to enable phone login</p>
                    )}
                  </>
                )}
              </div>

              <button onClick={saveProfile} disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>)}
          </div>
        </div>
      )}

      {/* ─── Logout Modal ─────────────────────────────── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowLogout(false)}>
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-4xl mb-3">👋</p><h3 className="text-lg font-extrabold">Sign Out?</h3>
            <p className="text-xs text-gray-400 mt-1">Your data will be here when you return.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLogout(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold text-sm active:scale-95">Cancel</button>
              <button onClick={() => { clear(); nav('/auth'); }} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Admin Hint Modal ─────────────────────────── */}
      {showAdminHint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowAdminHint(false)}>
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-4xl mb-3">🛡️</p><h3 className="text-lg font-extrabold">Admin Access</h3>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdminHint(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold text-sm active:scale-95">Cancel</button>
              <button onClick={() => { setShowAdminHint(false); nav('/admin'); }} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform">Enter</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
