import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Referral {
  id: string;
  email: string;
  name?: string;
  status: 'pending' | 'signed_up' | 'converted' | 'rewarded';
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  signed_up: { label: 'Signed Up', color: 'bg-blue-100 text-blue-700', icon: '✅' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700', icon: '🎉' },
  rewarded: { label: 'Rewarded', color: 'bg-purple-100 text-purple-700', icon: '🎁' },
};

export default function ReferralPage() {
  const navigate = useNavigate();

  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codeRes, refRes] = await Promise.all([
        api.get('/referrals/my-code'),
        api.get('/referrals/my-referrals'),
      ]);
      setReferralCode(codeRes.data.data?.code || codeRes.data.code || '');
      setReferrals(refRes.data.data?.referrals || refRes.data.referrals || []);
    } catch {
      showToast('Failed to load referral data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const copyLink = async () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join VedaClue with my code: ${referralCode}\n\nTrack your wellness, discover Ayurvedic insights, and more!\n\n${window.location.origin}/auth?ref=${referralCode}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Join me on VedaClue!');
    const body = encodeURIComponent(
      `Hey!\n\nI've been using VedaClue for wellness tracking and Ayurvedic insights. I think you'd love it!\n\nUse my referral code: ${referralCode}\nSign up here: ${window.location.origin}/auth?ref=${referralCode}\n\nSee you there!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || sending) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      showToast('Please enter a valid email', 'error');
      return;
    }
    setSending(true);
    try {
      await api.post('/referrals/invite', { email: inviteEmail.trim() });
      showToast('Invite sent successfully!', 'success');
      setInviteEmail('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to send invite', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white text-xl font-bold">Invite Friends</h1>
        </div>
        <p className="text-white/80 text-sm">
          Share VedaClue with friends and earn rewards together
        </p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Reward Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Invite friends & earn rewards!</p>
            <p className="text-amber-700 text-xs mt-1">
              Both you and your friend get premium benefits when they sign up with your code.
            </p>
          </div>
        </div>

        {/* Referral Code Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
            Your Referral Code
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-rose-50 border-2 border-dashed border-rose-300 rounded-xl px-4 py-3 text-center">
              <span className="text-2xl font-bold tracking-widest text-rose-600">
                {referralCode || '---'}
              </span>
            </div>
            <button
              onClick={copyCode}
              className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
          <p className="text-gray-700 font-semibold text-sm mb-3">Share via</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={shareWhatsApp}
              className="flex flex-col items-center gap-2 py-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors active:scale-95"
            >
              <span className="text-2xl">💬</span>
              <span className="text-xs font-medium text-green-700">WhatsApp</span>
            </button>
            <button
              onClick={shareEmail}
              className="flex flex-col items-center gap-2 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors active:scale-95"
            >
              <span className="text-2xl">📧</span>
              <span className="text-xs font-medium text-blue-700">Email</span>
            </button>
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-2 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors active:scale-95"
            >
              <span className="text-2xl">{linkCopied ? '✅' : '🔗'}</span>
              <span className="text-xs font-medium text-purple-700">
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </span>
            </button>
          </div>
        </div>

        {/* Send Invite */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
          <p className="text-gray-700 font-semibold text-sm mb-3">Send a direct invite</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@email.com"
              className="flex-1 border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
              onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
            />
            <button
              onClick={sendInvite}
              disabled={sending || !inviteEmail.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* My Referrals */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-700 font-semibold text-sm">My Referrals</p>
            <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {referrals.length}
            </span>
          </div>

          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">👥</span>
              <p className="text-gray-400 text-sm">No referrals yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Share your code and start earning rewards!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => {
                const config = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">{config.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {ref.name || ref.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
