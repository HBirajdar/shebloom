import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userAPI } from '../services/api';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

export default function DataPrivacyPage() {
  const nav = useNavigate();
  const clear = useAuthStore(s => s.clearAuth);
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await userAPI.exportData();
      const data = res.data?.data || res.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vedaclue-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
    setExporting(false);
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await userAPI.deleteAccount();
      toast.success('Account deleted');
      clear();
      nav('/auth');
    } catch {
      toast.error('Failed to delete account');
    }
    setDeleting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-extrabold text-gray-900">Data & Privacy</h1>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4 pb-32">
        {/* Info Card */}
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Your data is safe</h3>
              <p className="text-xs text-gray-500 mt-1">
                We use industry-standard encryption to protect your health data. Your information is never sold to third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📦</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800">Export Your Data</h3>
              <p className="text-xs text-gray-400 mt-1">
                Download all your data including cycle history, wellness logs, and profile info as a JSON file.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="mt-3 bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                {exporting ? 'Exporting…' : 'Download My Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Data We Collect */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800">Data We Collect</h3>
              <ul className="mt-2 space-y-1.5">
                {[
                  { label: 'Profile Information', desc: 'Name, email, phone, date of birth' },
                  { label: 'Cycle & Health Data', desc: 'Period dates, symptoms, mood, wellness logs' },
                  { label: 'Dosha Assessment', desc: 'Quiz responses and Ayurvedic constitution' },
                  { label: 'App Usage', desc: 'Feature usage for improving your experience' },
                ].map(item => (
                  <li key={item.label} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                      <span className="text-xs text-gray-400 ml-1">— {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy Links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[
            { label: 'Privacy Policy', path: '/privacy-policy' },
            { label: 'Terms & Conditions', path: '/terms-conditions' },
          ].map((item, i) => (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50 ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <span className="text-sm font-semibold text-gray-700">{item.label}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>

        {/* Delete Account */}
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-700">Delete Account</h3>
              <p className="text-xs text-red-400 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDelete(true)}
                className="mt-3 bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => { setShowDelete(false); setConfirmText(''); }}>
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-6" onClick={e => e.stopPropagation()}>
            <p className="text-4xl text-center mb-3">⚠️</p>
            <h3 className="text-lg font-extrabold text-center text-gray-900">Delete Account?</h3>
            <p className="text-xs text-gray-400 text-center mt-2">
              This will permanently delete all your data including cycle history, wellness logs, and dosha profile. This cannot be undone.
            </p>
            <p className="text-xs font-bold text-gray-600 mt-4 mb-2">
              Type <span className="text-red-500">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowDelete(false); setConfirmText(''); }} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold text-sm active:scale-95">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
