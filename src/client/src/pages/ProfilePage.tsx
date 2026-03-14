
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import { userAPI, doshaAPI } from '../services/api';
import { api } from '../services/api';
import { useSubscriptionStore } from '../stores/subscriptionStore';
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

  const { subscription, isPremium, fetchSubscription } = useSubscriptionStore();

  useEffect(() => { fetchSubscription(); }, []);

  const [showEdit, setShowEdit] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showAdminHint, setShowAdminHint] = useState(false);
  const [secretTaps, setSecretTaps] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'settings'>('overview');
  const [showLegal, setShowLegal] = useState(false);

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

  // Email OTP flow (for mobile-auth users adding/changing email)
  const [emailStep, setEmailStep] = useState<'idle' | 'otp-sent'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  // Tooltip state
  const [showMobileTip, setShowMobileTip] = useState(false);
  const [showEmailTip, setShowEmailTip] = useState(false);

  // Cycle settings editing
  const [editingCycleSettings, setEditingCycleSettings] = useState(false);
  const [editCycleLength, setEditCycleLength] = useState(cycleLength);
  const [editPeriodLength, setEditPeriodLength] = useState(periodLength);
  const [savingCycleSettings, setSavingCycleSettings] = useState(false);
  const setCycleData = useCycleStore(s => s.setCycleData);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  if (typeof window !== 'undefined' && !avatarInputRef.current) {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/jpeg,image/png,image/webp';
    avatarInputRef.current = el;
  }

  const [doshaData, setDoshaData] = useState<any>(null);
  useEffect(() => {
    doshaAPI.getProfile().then(r => setDoshaData(r.data.data)).catch(() => {}); // Non-critical — dosha card just hidden
  }, []);
  const dosha = doshaData?.dosha || localStorage.getItem('sb_dosha') || '';
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
  // mobile auth  → mobile LOCKED, email editable (with OTP verify)
  // email auth   → email LOCKED (it's their login), mobile editable (with OTP)
  // google/apple → email LOCKED (from provider), mobile editable (with OTP)
  const mobileLocked = isMobileAuth;
  const emailLocked = isEmailAuth || isGoogleAuth;

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
    }).catch(() => toast.error('Could not load profile. Check your connection.'));
  }, []);

  const openEdit = () => {
    setMobileStep('idle');
    setOtp('');
    setNewPhone('');
    setEmailStep('idle');
    setEmailOtp('');
    setNewEmail('');
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
        setNewEmail(p.email || '');
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
      // email & phone are NOT sent here — they require OTP verification via dedicated endpoints
      if (dob) data.dateOfBirth = dob;
      if (Object.keys(data).length === 0) { toast('No changes'); setShowEdit(false); setSaving(false); return; }
      const res = await userAPI.update(data);
      const updated = res.data.data || res.data;
      if (updated && user) setUser({ ...user, fullName: updated.fullName || user.fullName, email: updated.email || user.email });
      toast.success('Profile saved!');
      setShowEdit(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
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

  // ─── Email OTP flow ─────────────────────────────────
  const sendEmailOtpFn = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast.error('Enter a valid email address'); return; }
    if (newEmail.trim() === email) { toast('Same email — no change needed'); return; }
    setEmailOtpLoading(true);
    try {
      await userAPI.sendEmailOtp(newEmail.trim());
      setEmailStep('otp-sent');
      toast.success('Verification code sent to ' + newEmail.trim());
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send code');
    }
    setEmailOtpLoading(false);
  };

  const confirmEmailOtpFn = async () => {
    if (!emailOtp.trim() || emailOtp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setEmailOtpLoading(true);
    try {
      const res = await userAPI.confirmEmail(newEmail.trim(), emailOtp.trim());
      const updated = res.data.data;
      if (updated && user) setUser({ ...user, email: updated.email });
      setEmail(newEmail.trim());
      setEmailStep('idle');
      setEmailOtp('');
      toast.success('Email verified and saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Invalid code');
    }
    setEmailOtpLoading(false);
  };

  const handleAvatarUpload = async () => {
    if (!avatarInputRef.current) return;
    avatarInputRef.current.onchange = async (ev: any) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
      setAvatarUploading(true);
      try {
        const fd = new FormData();
        fd.append('image', file);
        const uploadRes = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const photoUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url;
        await userAPI.update({ photoUrl });
        if (user) setUser({ ...user, avatarUrl: photoUrl, photoUrl });
        toast.success('Avatar updated!');
      } catch { toast.error('Upload failed'); }
      setAvatarUploading(false);
    };
    avatarInputRef.current.click();
  };

  const handleItem = (action: string) => {
    const routes: Record<string, string> = {
      reports: '/reports', cycle: '/tracker', ayurveda: '/ayurveda', doctors: '/doctors',
      community: '/community', programs: '/programs', 'my-orders': '/my-orders',
      'about-us': '/about-us', 'privacy-policy': '/privacy-policy',
      'terms-conditions': '/terms-conditions', 'shipping-policy': '/shipping-policy',
      'refund-policy': '/refund-policy', help: '/help',
      appointments: '/appointments', referrals: '/referrals',
      notifications: '/notifications', language: '/language',
      'data-privacy': '/data-privacy',
    };
    if (action === 'edit') openEdit();
    else if (action === 'contact') window.location.href = 'mailto:vedaclue@gmail.com';
    else if (routes[action]) nav(routes[action]);
    else if (action === 'share' && navigator.share) navigator.share({ title: 'VedaClue', text: 'Your women\'s wellness companion', url: window.location.origin });
    else if (action === 'dosha') {
      if (dosha) nav('/dosha');
      else nav('/onboarding');
    }
    else toast('Coming soon!');
  };

  const dn = user?.fullName || 'User';
  const initials = dn.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const de = user?.email || user?.phone || '';
  const phaseEmojis: Record<string, string> = { menstrual: '🩸', follicular: '🌱', ovulation: '✨', luteal: '🍂' };

  // Provider badge
  const providerBadge = { email: { label: 'Email Login', icon: '📧', color: '#3B82F6' }, mobile: { label: 'Mobile Login', icon: '📱', color: '#10B981' }, google: { label: 'Google Login', icon: '🌐', color: '#EF4444' }, apple: { label: 'Apple Login', icon: '🍎', color: '#374151' }, unknown: { label: 'Standard Login', icon: '🔑', color: '#6B7280' } }[provider];

  // ─── Menu Item Component ───────────────────────────
  const MenuItem = ({ emoji, label, onClick }: { emoji: string; label: string; badge?: string; onClick: () => void }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-gray-300 text-sm">&rarr;</span>
    </button>
  );

  const MenuItemWithBadge = ({ emoji, label, badge, badgeColor, onClick }: { emoji: string; label: string; badge?: string; badgeColor?: string; onClick: () => void }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor || 'bg-gray-100 text-gray-500'}`}>{badge}</span>
        )}
      </div>
      <span className="text-gray-300 text-sm">&rarr;</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <Helmet>
        <title>My Profile | VedaClue</title>
        <meta name="robots" content="noindex" />
      </Helmet>

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

      <div className="px-5 pt-4 space-y-0">

        {activeTab === 'overview' && (<>

          {/* ─── Section 1: My Account ─── */}
          <div className="mt-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">👤 My Account</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <MenuItem emoji="✏️" label="Edit Profile" onClick={openEdit} />
              <MenuItem emoji="📱" label="Change Phone" onClick={() => openEdit()} />
              <MenuItem emoji="🔔" label="Notifications" onClick={() => handleItem('notifications')} />
            </div>
          </div>

          {/* ─── Section 2: My Health ─── */}
          <div className="mt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">🌿 My Health</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <MenuItem emoji="📅" label="Cycle Settings" onClick={() => handleItem('cycle')} />
              <MenuItemWithBadge
                emoji={doshaInfo?.emoji || '✨'}
                label={dosha ? `My Dosha` : 'Discover Your Dosha'}
                badge={dosha || undefined}
                badgeColor={dosha ? 'bg-purple-50 text-purple-600' : undefined}
                onClick={() => handleItem('dosha')}
              />
              {/* Subscription — compact inline */}
              <button onClick={() => nav('/pricing')} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-base">{isPremium ? '💎' : '🌱'}</span>
                  <span className="text-sm font-medium text-gray-700">My Subscription</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPremium ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                    {isPremium ? 'PRO' : 'Free'}
                  </span>
                </div>
                <span className="text-gray-300 text-sm">&rarr;</span>
              </button>
              <MenuItem emoji="🏆" label="My Badges & Streaks" onClick={() => setActiveTab('achievements')} />
            </div>

            {/* Subscription Status Card — compact */}
            <div className={`rounded-2xl p-4 shadow-sm mt-3 ${isPremium ? 'bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {isPremium ? `${subscription?.plan?.emoji || '💎'} ${subscription?.plan?.name || 'Premium'}` : '🌱 Free Plan'}
                  </p>
                  {isPremium && subscription?.currentPeriodEnd && (
                    <p className="text-[10px] text-gray-500">
                      {subscription.status === 'CANCELLED' ? 'Expires' : 'Renews'} {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button onClick={() => nav('/pricing')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${isPremium ? 'bg-white text-gray-700 border' : 'bg-gradient-to-r from-rose-500 to-amber-500 text-white'}`}>
                  {isPremium ? 'Manage' : 'Upgrade to Premium →'}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Section 3: My Activity ─── */}
          <div className="mt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">🛍️ My Activity</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <MenuItem emoji="📦" label="My Orders" onClick={() => handleItem('my-orders')} />
              <MenuItem emoji="👩‍⚕️" label="Appointments" onClick={() => handleItem('appointments')} />
              <MenuItem emoji="🎯" label="Programs" onClick={() => handleItem('programs')} />
              <MenuItem emoji="🤝" label="Referrals" onClick={() => handleItem('referrals')} />
            </div>
          </div>

          {/* ─── Section 4: App Settings ─── */}
          <div className="mt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">⚙️ App Settings</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <MenuItem emoji="🌐" label="Language Preference" onClick={() => handleItem('language')} />
              <MenuItem emoji="🔒" label="Data & Privacy" onClick={() => handleItem('data-privacy')} />
            </div>
          </div>

          {/* ─── Section 5: Legal & Info — COLLAPSED ─── */}
          <div className="mt-6">
            <button
              onClick={() => setShowLegal(v => !v)}
              className="w-full flex items-center justify-between px-1 mb-2"
            >
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">📋 Legal & Info</p>
              <span className={`text-gray-400 text-xs transition-transform ${showLegal ? 'rotate-90' : ''}`}>›</span>
            </button>
            {showLegal && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                <MenuItem emoji="🌸" label="About VedaClue" onClick={() => handleItem('about-us')} />
                <MenuItem emoji="🔒" label="Privacy Policy" onClick={() => handleItem('privacy-policy')} />
                <MenuItem emoji="📜" label="Terms & Conditions" onClick={() => handleItem('terms-conditions')} />
                <MenuItem emoji="❓" label="Help Center" onClick={() => handleItem('help')} />
                <MenuItem emoji="📧" label="Contact Us" onClick={() => handleItem('contact')} />
              </div>
            )}
          </div>

          {/* ─── Doctor Portal (role-based) ─── */}
          {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
            <div className="mt-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <MenuItem emoji="🩺" label="Doctor Portal" onClick={() => nav('/doctor-dashboard')} />
              </div>
            </div>
          )}

          {/* ─── Sign Out ─── */}
          <div className="mt-8">
            <button onClick={() => setShowLogout(true)} className="w-full py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Sign Out</button>
          </div>

          <div className="text-center py-4">
            <button onClick={() => { const n = secretTaps + 1; setSecretTaps(n); if (n >= 5 && user?.role === 'ADMIN') { setShowAdminHint(true); setSecretTaps(0); } else if (n >= 5) { setSecretTaps(0); }}} className="text-[10px] text-gray-300 select-none">VedaClue v2.1</button>
          </div>
        </>)}

        {activeTab === 'achievements' && (<>
          <div className="bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl p-4 border border-amber-100 mt-2">
            <p className="text-xs font-extrabold text-amber-800">🏆 Your Achievements</p>
            <p className="text-[10px] text-amber-700 mt-0.5">{earnedAchievements.length}/{ACHIEVEMENTS_DEF.length} badges earned</p>
            <div className="w-full bg-amber-100 rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-amber-400 to-rose-400 h-2 rounded-full transition-all" style={{ width: `${(earnedAchievements.length / ACHIEVEMENTS_DEF.length) * 100}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
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
          <div className="bg-white rounded-3xl p-4 shadow-lg mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-gray-800">📅 Cycle Settings</h3>
              {!editingCycleSettings && (
                <button onClick={() => { setEditCycleLength(cycleLength); setEditPeriodLength(periodLength); setEditingCycleSettings(true); }}
                  className="text-[10px] text-rose-500 font-bold active:scale-95">Edit</button>
              )}
            </div>
            {editingCycleSettings ? (
              <div className="space-y-4">
                {/* Cycle Length */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-600">Cycle Length</span>
                    <span className="text-xs font-extrabold text-gray-900">{editCycleLength} days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditCycleLength(v => Math.max(21, v - 1))}
                      className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg active:scale-90 flex items-center justify-center">−</button>
                    <input type="range" min={21} max={45} value={editCycleLength}
                      onChange={e => setEditCycleLength(Number(e.target.value))}
                      className="flex-1 accent-rose-500 h-2" />
                    <button onClick={() => setEditCycleLength(v => Math.min(45, v + 1))}
                      className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg active:scale-90 flex items-center justify-center">+</button>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-gray-400">21 days</span>
                    <span className="text-[9px] text-gray-400">45 days</span>
                  </div>
                </div>
                {/* Period Length */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-600">Period Length</span>
                    <span className="text-xs font-extrabold text-gray-900">{editPeriodLength} days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditPeriodLength(v => Math.max(2, v - 1))}
                      className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg active:scale-90 flex items-center justify-center">−</button>
                    <input type="range" min={2} max={10} value={editPeriodLength}
                      onChange={e => setEditPeriodLength(Number(e.target.value))}
                      className="flex-1 accent-rose-500 h-2" />
                    <button onClick={() => setEditPeriodLength(v => Math.min(10, v + 1))}
                      className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg active:scale-90 flex items-center justify-center">+</button>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-gray-400">2 days</span>
                    <span className="text-[9px] text-gray-400">10 days</span>
                  </div>
                </div>
                {/* Save / Cancel */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingCycleSettings(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold active:scale-95">Cancel</button>
                  <button disabled={savingCycleSettings} onClick={async () => {
                    setSavingCycleSettings(true);
                    try {
                      await userAPI.updateProfile({ cycleLength: editCycleLength, periodLength: editPeriodLength });
                      setCycleData({ cycleLength: editCycleLength, periodLength: editPeriodLength });
                      toast.success('Cycle settings updated!');
                      setEditingCycleSettings(false);
                    } catch { toast.error('Failed to save'); }
                    setSavingCycleSettings(false);
                  }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold active:scale-95 disabled:opacity-50">
                    {savingCycleSettings ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {[
                  { l: 'Cycle Length', v: `${cycleLength} days` },
                  { l: 'Period Length', v: `${periodLength} days` },
                  { l: 'Status', v: hasRealData ? 'Active ✅' : 'No data yet' },
                ].map(s => (
                  <div key={s.l} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-600">{s.l}</span>
                    <span className="text-xs font-extrabold text-gray-900">{s.v}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-lg mt-4">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">🔒 Privacy</h3>
            <button onClick={() => toast('Data export coming soon!')} className="w-full text-left flex items-center justify-between py-2.5 border-b border-gray-50 active:bg-gray-50">
              <span className="text-xs text-gray-600">Export my data</span><span className="text-gray-300 text-lg">›</span>
            </button>
            <button onClick={() => toast.error('Account deletion requires email confirmation.')} className="w-full text-left flex items-center justify-between py-2 active:bg-gray-50">
              <span className="text-xs text-rose-500">Delete account</span><span className="text-gray-300 text-lg">›</span>
            </button>
          </div>

          <button onClick={() => setShowLogout(true)} className="w-full py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform mt-4">Sign Out</button>
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

              {/* Email field — locked or OTP-verified edit */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
                  {emailLocked && (
                    <button onMouseEnter={() => setShowEmailTip(true)} onMouseLeave={() => setShowEmailTip(false)}
                      onClick={() => setShowEmailTip(v => !v)} className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      🔒 {isGoogleAuth ? 'Google email' : 'Login email'}
                    </button>
                  )}
                </div>
                {showEmailTip && emailLocked && (
                  <div className="absolute top-6 right-0 z-10 bg-gray-800 text-white text-[10px] rounded-lg px-3 py-2 w-52 shadow-xl">
                    {isGoogleAuth ? 'Email is linked to your Google account and cannot be changed.' : 'Cannot change login email address. Contact support to update.'}
                  </div>
                )}

                {emailLocked ? (
                  <>
                    <div className="relative">
                      <input type="email" value={email} disabled
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">🔒</span>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <span>🔒</span> {isGoogleAuth ? 'Linked to Google account' : 'Login credential — cannot change'}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Editable email with OTP verification */}
                    {emailStep === 'idle' ? (
                      <div className="flex gap-2">
                        <input type="email" value={newEmail || email} onChange={e => setNewEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
                        {(newEmail || '') !== email && newEmail.trim().length > 3 && newEmail.includes('@') && (
                          <button onClick={sendEmailOtpFn} disabled={emailOtpLoading}
                            className="px-3 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-bold whitespace-nowrap disabled:opacity-50 active:scale-95">
                            {emailOtpLoading ? '...' : 'Verify'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold">
                          <span>📧</span> Code sent to {newEmail}
                          <button onClick={() => setEmailStep('idle')} className="ml-auto text-gray-400 underline">Change</button>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit code" maxLength={6}
                            className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none text-center tracking-widest font-bold" />
                          <button onClick={confirmEmailOtpFn} disabled={emailOtpLoading}
                            className="px-3 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-bold whitespace-nowrap disabled:opacity-50 active:scale-95">
                            {emailOtpLoading ? '...' : 'Confirm'}
                          </button>
                        </div>
                        <button onClick={sendEmailOtpFn} disabled={emailOtpLoading}
                          className="text-[10px] text-rose-500 font-bold w-full text-center active:scale-95">
                          Resend Code
                        </button>
                      </div>
                    )}
                    {!email && emailStep === 'idle' && (
                      <p className="text-[10px] text-gray-400 mt-1">Add an email to receive updates and reminders</p>
                    )}
                  </>
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
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
