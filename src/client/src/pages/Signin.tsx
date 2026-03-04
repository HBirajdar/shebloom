import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';

export default function AuthPage() {
  const nav = useNavigate();
  const sa = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState('login');
  const [via, setVia] = useState('phone');
  const [ph, setPh] = useState('');
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [nm, setNm] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [ld, setLd] = useState(false);
  const [err, setErr] = useState('');

  const go = async (p: Promise<any>, to: string) => {
    setLd(true); setErr('');
    try { const r = await p; sa(r.data.data.user, r.data.data.accessToken, r.data.data.refreshToken); nav(to); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.message || 'Something went wrong. Please try again.'); }
    setLd(false);
  };

  const ac = (v: boolean) => v ? 'bg-white text-rose-600 shadow-md' : 'text-gray-400';
  const bc = (v: boolean) => v ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 p-6">
      <div className="text-center pt-10 pb-6">
        <p className="text-5xl">&#127800;</p>
        <h1 className="text-3xl font-bold mt-2 text-gray-900">SheBloom</h1>
        <p className="text-gray-400 text-sm mt-1">Your wellness companion</p>
      </div>

      <div className="flex bg-white/50 rounded-2xl p-1 mb-5">
        <button onClick={() => setTab('login')} className={'flex-1 py-3 rounded-xl text-sm font-bold ' + ac(tab === 'login')}>Sign In</button>
        <button onClick={() => setTab('signup')} className={'flex-1 py-3 rounded-xl text-sm font-bold ' + ac(tab === 'signup')}>Sign Up</button>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex gap-2">
          <button onClick={() => { setVia('phone'); setSent(false); }} className={'flex-1 py-2 rounded-xl text-xs font-semibold border-2 ' + bc(via === 'phone')}>Phone</button>
          <button onClick={() => setVia('email')} className={'flex-1 py-2 rounded-xl text-xs font-semibold border-2 ' + bc(via === 'email')}>Email</button>
        </div>

        {via === 'phone' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="px-3 py-3 bg-gray-50 rounded-xl text-gray-500 text-sm font-semibold">+91</span>
              <input value={ph} onChange={e => setPh(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Phone number" className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 text-sm outline-none" />
            </div>
            {sent && <input value={otp} onChange={e => setOtp(e.target.value.slice(0, 4))} placeholder="Enter OTP" maxLength={4} className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm text-center tracking-widest outline-none" />}
            <button disabled={ld} onClick={async () => {
              setErr('');
              if (!sent) { setLd(true); try { await authAPI.sendOtp(ph); setSent(true); } catch (e: any) { setErr(e?.response?.data?.error || 'Failed to send OTP'); } setLd(false); }
              else go(authAPI.verifyOtp(ph, otp), '/dashboard');
            }} className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold disabled:opacity-50">
              {ld ? 'Wait...' : sent ? 'Verify OTP' : 'Send OTP'}
            </button>
            {err && <p className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg">{err}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {tab === 'signup' && <input value={nm} onChange={e => setNm(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm outline-none" />}
            <input value={em} onChange={e => setEm(e.target.value)} placeholder="Email" type="email" className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm outline-none" />
            <input value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" type="password" className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-sm outline-none" />
            <button disabled={ld} onClick={() => {
              setErr('');
              if (tab === 'signup') go(authAPI.register({ fullName: nm, email: em, password: pw }), '/setup');
              else go(authAPI.login({ email: em, password: pw }), '/dashboard');
            }} className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold disabled:opacity-50">
              {ld ? 'Wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            {err && <p className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg">{err}</p>}
          </div>
        )}

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => alert('Google Sign-In: To enable, set up Google OAuth in Google Cloud Console and add GOOGLE_CLIENT_ID to your environment.')} className="flex-1 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer">Google</button>
          <button onClick={() => alert('Apple Sign-In coming soon!')} className="flex-1 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer">Apple</button>
        </div>
      </div>
      <p className="text-center text-[11px] text-gray-400 mt-6">By continuing, you agree to our Terms and Privacy Policy</p>
    </div>
  );
}
