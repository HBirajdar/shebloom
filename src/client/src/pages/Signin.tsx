// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';

export default function AuthPage() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [via, setVia] = useState<'email' | 'phone'>('phone');

  // Email fields
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [nm, setNm] = useState('');

  // Phone / OTP fields
  const [ph, setPh] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState(''); // shown on screen when SMS unavailable
  const [smsSent, setSmsSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const parseErr = (e: any): string => {
    if (!e?.response) return 'Cannot reach server. Check your internet or try again in a moment.';
    const status = e.response.status;
    const body = e.response.data;
    if (status === 429) return 'Too many attempts. Please wait 15 minutes and try again.';
    if (status >= 500) return 'Server is temporarily unavailable. Please try again in a minute.';
    if (status === 400 && body?.details) {
      const fields = Object.entries(body.details || {}).map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('; ');
      return fields || body?.error || 'Invalid input';
    }
    return body?.error || body?.message || `Error ${status}. Please try again.`;
  };

  const go = async (promise: Promise<any>, defaultTo: string) => {
    setLoading(true); setErr('');
    try {
      const r = await promise;
      const d = r.data.data;
      setAuth(d.user, d.accessToken, d.refreshToken);
      // Role-based redirect
      const role = d.user?.role;
      if (role === 'ADMIN') {
        nav('/admin');
      } else if (role === 'DOCTOR') {
        nav('/doctor-dashboard');
      } else {
        nav(defaultTo);
      }
    } catch (e: any) {
      setErr(parseErr(e));
    }
    setLoading(false);
  };

  const startResendCountdown = () => {
    setResendCountdown(60);
    const timer = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (ph.length !== 10) { setErr('Enter a valid 10-digit phone number'); return; }
    // Basic Indian mobile check (must start with 6-9)
    if (!/^[6-9]/.test(ph)) { setErr('Phone number must start with 6, 7, 8 or 9 (Indian mobile)'); return; }
    setLoading(true); setErr(''); setDebugOtp(''); setSmsSent(false);
    try {
      const r = await authAPI.sendOtp(ph);
      setOtpSent(true);
      setSmsSent(r.data.smsSent);
      if (r.data.debugOtp) setDebugOtp(r.data.debugOtp);
      startResendCountdown();
    } catch (e: any) {
      setErr(parseErr(e));
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setLoading(true); setErr(''); setDebugOtp(''); setSmsSent(false);
    try {
      const r = await authAPI.sendOtp(ph);
      setSmsSent(r.data.smsSent);
      if (r.data.debugOtp) setDebugOtp(r.data.debugOtp);
      startResendCountdown();
    } catch (e: any) {
      setErr(parseErr(e));
    }
    setLoading(false);
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) { setErr('Enter the 6-digit OTP'); return; }
    go(authAPI.verifyOtp(ph, otp), '/dashboard');
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setErr('Enter your email address'); return; }
    setForgotLoading(true); setErr('');
    try {
      await authAPI.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (e: any) {
      setErr(parseErr(e));
    }
    setForgotLoading(false);
  };

  const handleEmailAuth = () => {
    setErr('');
    if (!em.trim()) { setErr('Enter your email'); return; }
    if (!pw) { setErr('Enter your password'); return; }
    if (tab === 'signup') {
      if (!nm.trim()) { setErr('Enter your full name'); return; }
      if (pw.length < 8) { setErr('Password must be at least 8 characters'); return; }
      go(authAPI.register({ fullName: nm.trim(), email: em.trim(), password: pw }), '/setup');
    } else {
      go(authAPI.login({ email: em.trim(), password: pw }), '/dashboard');
    }
  };

  const inputCls = 'w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 text-sm outline-none focus:border-rose-400 transition-colors bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex flex-col px-5 py-8">

      {/* Header */}
      <div className="text-center pt-8 pb-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-rose-500 to-pink-400 flex items-center justify-center shadow-lg shadow-rose-200 mb-4">
          <span className="text-4xl">🌸</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">VedaClue</h1>
        <p className="text-gray-400 text-sm mt-1">Your personal wellness companion</p>
      </div>

      {/* Sign In / Sign Up tabs */}
      <div className="flex bg-white rounded-2xl p-1.5 mb-5 shadow-sm">
        {(['login', 'signup'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setErr(''); }}
            className={'flex-1 py-3 rounded-xl text-sm font-bold transition-all ' + (tab === t ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md' : 'text-gray-400')}>
            {t === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl p-5 shadow-lg space-y-4 flex-1">

        {/* Email / Phone toggle */}
        <div className="flex gap-2">
          {(['phone', 'email'] as const).map(v => (
            <button key={v} onClick={() => { setVia(v); setErr(''); setOtpSent(false); setDebugOtp(''); }}
              className={'flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ' + (via === v ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-100 text-gray-400 bg-gray-50')}>
              {v === 'email' ? '✉️ Email' : '📱 Phone'}
            </button>
          ))}
        </div>

        {via === 'email' ? (
          <div className="space-y-3">
            {tab === 'signup' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Full Name</label>
                <input value={nm} onChange={e => setNm(e.target.value)} placeholder="Sugandhika"
                  className={inputCls + ' mt-1'} autoComplete="name" />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Email</label>
              <input value={em} onChange={e => setEm(e.target.value)} placeholder="you@example.com"
                type="email" inputMode="email" className={inputCls + ' mt-1'} autoComplete="email" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Password</label>
              <div className="relative mt-1">
                <input value={pw} onChange={e => setPw(e.target.value)}
                  placeholder={tab === 'signup' ? 'Minimum 8 characters' : 'Your password'}
                  type={showPw ? 'text' : 'password'} className={inputCls + ' pr-12'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg active:scale-90 transition-transform">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button disabled={loading} onClick={handleEmailAuth}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm disabled:opacity-60 active:scale-95 transition-all shadow-md shadow-rose-200">
              {loading ? '⏳ Please wait...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
            {tab === 'login' && (
              <p className="text-center text-xs text-gray-400">
                Don't have an account?{' '}
                <button onClick={() => setTab('signup')} className="text-rose-500 font-bold">Sign up free</button>
              </p>
            )}
            {tab === 'login' && !showForgot && (
              <button onClick={() => { setShowForgot(true); setForgotEmail(em); setErr(''); }}
                className="w-full text-center text-xs text-gray-400 active:scale-95 transition-transform">
                Forgot password? <span className="text-rose-500 font-bold">Reset it</span>
              </button>
            )}
            {tab === 'login' && showForgot && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-3">
                {forgotSent ? (
                  <div className="text-center py-2">
                    <span className="text-3xl block mb-2">📬</span>
                    <p className="text-xs font-bold text-gray-700">Check your email</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">If this email is registered, you'll receive a password reset link shortly.</p>
                    <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="mt-3 text-xs text-rose-500 font-bold">← Back to Sign In</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-gray-700">Reset your password</p>
                    <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Enter your email" type="email" inputMode="email"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 text-sm outline-none focus:border-rose-400 bg-white transition-colors" />
                    <button disabled={forgotLoading} onClick={handleForgotPassword}
                      className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm disabled:opacity-60 active:scale-95 transition-all">
                      {forgotLoading ? '⏳ Sending...' : 'Send Reset Link →'}
                    </button>
                    <button onClick={() => { setShowForgot(false); setErr(''); }} className="w-full text-center text-xs text-gray-400 active:scale-95">← Back to Sign In</button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Phone input */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Phone Number</label>
              <div className="flex gap-2 mt-1">
                <div className="px-3 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-600 text-sm font-semibold">🇮🇳 +91</div>
                <input value={ph} onChange={e => setPh(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9405424185" inputMode="numeric" maxLength={10}
                  className="flex-1 px-4 py-3.5 rounded-2xl border-2 border-gray-100 text-sm outline-none focus:border-rose-400 bg-gray-50 focus:bg-white transition-colors" />
              </div>
            </div>

            {/* OTP sent state */}
            {otpSent && (
              <div className="space-y-3">
                {/* Show OTP on screen when SMS is unavailable */}
                {debugOtp && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">📋 Your OTP (SMS unavailable)</p>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-extrabold text-amber-800 tracking-widest">{debugOtp}</p>
                      <button onClick={() => setOtp(debugOtp)}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform">
                        Auto-fill
                      </button>
                    </div>
                    <p className="text-[9px] text-amber-600 mt-1">Valid for 5 minutes · Tap Auto-fill to use it</p>
                  </div>
                )}
                {smsSent && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <p className="text-xs text-emerald-700 font-medium">✅ OTP sent to +91{ph} via SMS</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Enter OTP</label>
                  <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="_ _ _ _ _ _" inputMode="numeric" maxLength={6}
                    className="w-full mt-1 px-4 py-4 rounded-2xl border-2 border-gray-100 text-2xl text-center tracking-[0.3em] font-extrabold outline-none focus:border-rose-400 bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <button disabled={loading} onClick={handleVerifyOtp}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm disabled:opacity-60 active:scale-95 transition-all shadow-md shadow-rose-200">
                  {loading ? '⏳ Verifying...' : 'Verify OTP →'}
                </button>
                <div className="flex items-center justify-between">
                  <button onClick={() => { setOtpSent(false); setOtp(''); setDebugOtp(''); setErr(''); setResendCountdown(0); }}
                    className="py-2.5 text-gray-400 text-xs font-medium active:scale-95 transition-transform">
                    ← Change number
                  </button>
                  <button disabled={resendCountdown > 0 || loading} onClick={handleResendOtp}
                    className="py-2.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{ color: resendCountdown > 0 ? '#9CA3AF' : '#F43F5E' }}>
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {!otpSent && (
              <button disabled={loading || ph.length !== 10} onClick={handleSendOtp}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm disabled:opacity-60 active:scale-95 transition-all shadow-md shadow-rose-200">
                {loading ? '⏳ Sending...' : 'Send OTP →'}
              </button>
            )}
          </div>
        )}

        {/* Error message */}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <p className="text-red-600 text-xs leading-relaxed">{err}</p>
          </div>
        )}

        {/* Divider + Social */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] text-gray-400 font-medium">or continue with</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => alert('Google Sign-In coming soon!')}
            className="flex-1 py-3 border-2 border-gray-100 rounded-2xl text-sm font-semibold text-gray-600 active:scale-95 transition-all flex items-center justify-center gap-2 bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Google
          </button>
          <button onClick={() => alert('Apple Sign-In coming soon!')}
            className="flex-1 py-3 border-2 border-gray-100 rounded-2xl text-sm font-semibold text-gray-600 active:scale-95 transition-all flex items-center justify-center gap-2 bg-gray-50">
            <span></span> Apple
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-400 mt-4 mb-2">By continuing, you agree to our Terms &amp; Privacy Policy</p>
    </div>
  );
}
