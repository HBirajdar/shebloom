// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const sections = [
  { title: 'Personal', items: [
    { i: '\u{1F464}', l: 'Edit Profile', action: 'edit' },
    { i: '\u{1F514}', l: 'Notifications', action: 'notif' },
    { i: '\u{1F504}', l: 'Cycle Settings', action: 'cycle' },
  ]},
  { title: 'Health', items: [
    { i: '\u{1F33F}', l: 'Ayurveda Shop', action: 'ayurveda' },
    { i: '\u{1F469}\u200D\u2695\uFE0F', l: 'My Doctors', action: 'doctors' },
    { i: '\u{1F4CB}', l: 'Health Records', action: 'records' },
    { i: '\u{1F512}', l: 'Privacy', action: 'privacy' },
  ]},
  { title: 'Support', items: [
    { i: '\u2753', l: 'Help Center', action: 'help' },
    { i: '\u2B50', l: 'Rate Us', action: 'rate' },
    { i: '\u{1F91D}', l: 'Share App', action: 'share' },
  ]},
];

export default function ProfilePage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const clear = useAuthStore(s => s.clearAuth);
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [secretTaps, setSecretTaps] = useState(0);
  const [showAdminHint, setShowAdminHint] = useState(false);

  // CRITICAL FIX: Fetch profile from BACKEND on every page load
  // This ensures we always show what the DATABASE has, not stale cache
  useEffect(() => {
    userAPI.me().then(res => {
      const p = res.data.data || res.data;
      if (p && user) {
        // Update auth store with real backend data
        setUser({
          ...user,
          fullName: p.fullName || user.fullName,
          email: p.email || undefined,
        });
      }
    }).catch(() => {});
  }, []);

  // When edit modal opens, load fresh data into form
  useEffect(() => {
    if (showEdit) {
      // Always read from latest user state
      const u = useAuthStore.getState().user;
      setName(u?.fullName || '');
      setEmail(u?.email || '');
      setPhone(u?.phone || '');
      // Also do a fresh API call to be 100% sure
      userAPI.me().then(res => {
        const p = res.data.data || res.data;
        if (p) {
          setName(p.fullName || '');
          setEmail(p.email || '');
          setPhone(p.phone || '');
          if (p.dateOfBirth) setDob(p.dateOfBirth.split('T')[0]);
        }
      }).catch(() => {});
    }
  }, [showEdit]);

  const logout = () => { clear(); nav('/auth'); };

  const handleSecretTap = () => {
    const next = secretTaps + 1;
    setSecretTaps(next);
    if (next >= 5) { setShowAdminHint(true); setSecretTaps(0); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data: any = {};
      if (name.trim()) data.fullName = name.trim();
      if (email.trim()) data.email = email.trim();
      if (dob) data.dateOfBirth = dob;

      if (Object.keys(data).length === 0) {
        toast('No changes to save');
        setShowEdit(false);
        setSaving(false);
        return;
      }

      const res = await userAPI.update(data);
      const updated = res.data.data || res.data.user || res.data;

      if (updated && user) {
        // Update Zustand with EXACTLY what the backend returned
        setUser({
          ...user,
          fullName: updated.fullName || user.fullName,
          email: updated.email || null,
        });
        toast.success('Profile saved!');
      } else {
        toast.success('Saved!');
      }
      setShowEdit(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save';
      // Show specific error for email uniqueness
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('email')) {
        toast.error('This email is already in use by another account');
      } else {
        toast.error(msg);
      }
    }
    setSaving(false);
  };

  const handleItem = (action: string) => {
    switch (action) {
      case 'edit': setShowEdit(true); break;
      case 'notif': toast('Coming soon!'); break;
      case 'cycle': nav('/tracker'); break;
      case 'ayurveda': nav('/ayurveda'); break;
      case 'doctors': nav('/doctors'); break;
      case 'records': toast('Coming soon!'); break;
      case 'privacy': toast('Coming soon!'); break;
      case 'admin': nav('/admin'); break;
      case 'help': toast('Coming soon!'); break;
      case 'rate': toast.success('Thank you!'); break;
      case 'share':
        if (navigator.share) navigator.share({ title: 'SheBloom', text: 'Track your health with SheBloom!', url: window.location.origin });
        else toast('Share: ' + window.location.origin); break;
    }
  };

  // Display values - always show what Zustand has (which we just synced from API)
  const displayName = user?.fullName || 'User';
  const displayEmail = user?.email || '';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 px-5 pt-10 pb-14 text-white text-center relative">
        <button onClick={() => nav('/dashboard')} className="absolute left-4 top-4 text-white/80 text-2xl">{'\u2039'}</button>
        <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/40 mb-3 shadow-lg">
          {displayName.charAt(0)}
        </div>
        <h2 className="text-xl font-bold">{displayName}</h2>
        <p className="text-xs text-white/70 mt-1">{displayEmail || user?.phone || ''}</p>
        <button onClick={() => setShowEdit(true)}
          className="mt-3 px-4 py-1.5 bg-white/20 rounded-full text-xs font-semibold active:scale-95 transition-transform">
          {'\u270F\uFE0F'} Edit Profile
        </button>
      </div>

      <div className="px-5 -mt-6 space-y-4">
        {sections.map(sec => (
          <div key={sec.title} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 px-5 pt-3 uppercase tracking-wider">{sec.title}</p>
            {sec.items.map((item, i) => (
              <button key={item.l} onClick={() => handleItem(item.action)}
                className={'w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-gray-50 transition-colors ' + (i < sec.items.length - 1 ? 'border-b border-gray-50' : '')}>
                <span className="text-lg">{item.i}</span>
                <span className="flex-1 text-sm font-semibold text-gray-700">{item.l}</span>
                <span className="text-gray-300">{'\u203A'}</span>
              </button>
            ))}
          </div>
        ))}

        <button onClick={() => setShowLogout(true)} className="w-full py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform">
          Sign Out
        </button>

        <div className="text-center py-4">
          <button onClick={handleSecretTap} className="text-[10px] text-gray-300 select-none">
            SheBloom v2.1
          </button>
          {secretTaps > 0 && secretTaps < 5 && <p className="text-[8px] text-gray-200 mt-0.5">{5 - secretTaps} more</p>}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowEdit(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Edit Profile</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 text-xl">{'\u2715'}</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
              <input type="text" value={phone} disabled
                className="w-full mt-1 px-4 py-3 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400" />
              <p className="text-[10px] text-gray-400 mt-1">Phone number cannot be changed</p>
            </div>

            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold disabled:opacity-50 active:scale-95 transition-transform">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowLogout(false)}>
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-4xl mb-3">{'\u{1F44B}'}</p>
            <h3 className="text-lg font-bold text-gray-900">Sign Out?</h3>
            <p className="text-sm text-gray-500 mt-1">Are you sure?</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLogout(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={logout} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm active:scale-95">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin access */}
      {showAdminHint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowAdminHint(false)}>
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-4xl mb-3">{'\u{1F6E1}\uFE0F'}</p>
            <h3 className="text-lg font-bold text-gray-900">Admin Access</h3>
            <p className="text-xs text-gray-500 mt-1">Enter admin panel?</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdminHint(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={() => { setShowAdminHint(false); nav('/admin'); }} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm active:scale-95">Enter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
