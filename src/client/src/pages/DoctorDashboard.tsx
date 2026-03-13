// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { doctorDashAPI, prescriptionAPI, doshaAPI, communityAPI } from '../services/api';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'appointments' | 'availability' | 'prescriptions' | 'articles' | 'profile' | 'reviews' | 'ayurveda' | 'earnings' | 'community';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  CONFIRMED:   'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  REJECTED:    'bg-orange-100 text-orange-700',
  CANCELLED:   'bg-red-100 text-red-600',
  NO_SHOW:     'bg-gray-100 text-gray-600',
};

// ─── Doctor Community Moderation Tab ──────────────────
function DoctorCommunityTab() {
  const user = useAuthStore(s => s.user);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const PAGE_SIZE = 15;

  const CATS = ['', 'periods', 'pcod', 'fertility', 'pregnancy', 'menopause', 'mental_health', 'ayurveda', 'hair_skin', 'ask_doctor'];

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (filterCat) params.category = filterCat;
      const res = await communityAPI.listPosts(params);
      const d = res.data?.data;
      setPosts(d?.posts || []);
      setTotal(d?.total || 0);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, filterCat]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const fetchDetail = async (id: string) => {
    try {
      const res = await communityAPI.getPost(id);
      setPostDetail(res.data?.data || null);
    } catch { /* silent */ }
  };

  const handleExpand = (id: string) => {
    if (expandedPost === id) { setExpandedPost(null); setPostDetail(null); return; }
    setExpandedPost(id);
    fetchDetail(id);
  };

  const handleHidePost = async (id: string, hidden: boolean) => {
    try {
      await communityAPI.hidePost(id, { hidden: !hidden });
      toast.success(hidden ? 'Post unhidden' : 'Post hidden');
      fetchPosts();
      if (expandedPost === id) fetchDetail(id);
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  const handleHideReply = async (id: string, hidden: boolean) => {
    try {
      await communityAPI.hideReply(id, { hidden: !hidden });
      toast.success(hidden ? 'Reply unhidden' : 'Reply hidden');
      if (expandedPost) fetchDetail(expandedPost);
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  const handleReply = async (postId: string) => {
    if (!replyText.trim()) return;
    try {
      await communityAPI.reply(postId, { content: replyText.trim(), isAnonymous: false });
      toast.success('Reply posted as Doctor!');
      setReplyText('');
      fetchDetail(postId);
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed to reply'); }
  };

  const handlePinPost = async (id: string) => {
    try {
      const res = await communityAPI.pinPost(id);
      toast.success(res.data?.message || 'Pin toggled');
      fetchPosts();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4AC}'} Community Moderation</h3>
        <button onClick={fetchPosts} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full active:scale-95">{'\u{1F504}'} Refresh</button>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
        <p className="text-[10px] text-indigo-700 leading-relaxed">
          <strong>As a Doctor you can:</strong> Reply to posts, Hide/Unhide inappropriate content, and Pin important discussions. Only Admin can permanently delete posts.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CATS.map(c => (
          <button key={c || 'all'} onClick={() => { setFilterCat(c); setPage(1); }}
            className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap flex-shrink-0 ' + (filterCat === c ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500')}>
            {c || 'All'}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 font-bold">{total} posts</p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" /></div>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No posts found</p>
      ) : posts.map(post => (
        <div key={post.id} className={'bg-white rounded-2xl shadow-sm overflow-hidden ' + (post.isHidden ? 'opacity-50 border border-red-200' : '') + (post.isPinned ? ' ring-1 ring-amber-300' : '')}>
          <div className="p-4">
            {/* Badges row */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {post.isPinned && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{'\u{1F4CC}'} Pinned</span>}
              {post.isHidden && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{'\u{1F6AB}'} Hidden</span>}
              <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">{post.category}</span>
              {post.reportCount > 0 && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{'\u{1F6A9}'} {post.reportCount} reports</span>}
              <span className="text-[9px] text-gray-400 ml-auto">{timeAgo(post.createdAt)}</span>
            </div>

            {/* Author */}
            <p className="text-[10px] font-bold text-gray-500 mb-1">
              {post.user?.fullName || 'Anonymous'}
              {post.isAnonymous && <span className="text-purple-500 ml-1">(posted anonymously)</span>}
            </p>

            <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
              <span className="text-[10px] text-gray-400">{'\u2764\uFE0F'} {post.likeCount || 0}</span>
              <button onClick={() => handleExpand(post.id)} className="text-[10px] text-indigo-500 font-bold active:scale-95">
                {'\u{1F4AC}'} {post.replyCount || 0} replies {expandedPost === post.id ? '▲' : '▼'}
              </button>

              <div className="ml-auto flex gap-2">
                <button onClick={() => handlePinPost(post.id)} className={'text-[9px] font-bold px-2 py-1 rounded-lg active:scale-95 ' + (post.isPinned ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                  {post.isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button onClick={() => handleHidePost(post.id, post.isHidden)} className={'text-[9px] font-bold px-2 py-1 rounded-lg active:scale-95 ' + (post.isHidden ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700')}>
                  {post.isHidden ? 'Unhide' : 'Hide'}
                </button>
              </div>
            </div>

            {/* Expanded replies + reply input */}
            {expandedPost === post.id && postDetail && (
              <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
                {(postDetail.replies || []).length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-3">No replies yet — be the first to respond!</p>
                ) : (postDetail.replies || []).map((reply: any) => (
                  <div key={reply.id} className={'rounded-xl p-3 ' + (reply.isHidden ? 'bg-red-50 border border-red-200 opacity-50' : reply.isDoctor ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50')}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={'text-[10px] font-bold ' + (reply.isDoctor ? 'text-emerald-700' : 'text-gray-600')}>
                          {reply.user?.fullName || 'Anonymous'}
                        </span>
                        {reply.isDoctor && <span className="text-[7px] font-bold bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded">{'\u2713'} Doctor</span>}
                        {reply.isHidden && <span className="text-[7px] font-bold bg-red-200 text-red-700 px-1 py-0.5 rounded">Hidden</span>}
                        <span className="text-[9px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                      </div>
                      <button onClick={() => handleHideReply(reply.id, reply.isHidden)}
                        className={'text-[8px] font-bold px-1.5 py-0.5 rounded active:scale-95 ' + (reply.isHidden ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700')}>
                        {reply.isHidden ? 'Unhide' : 'Hide'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{reply.content}</p>
                    {reply.reportCount > 0 && <span className="text-[9px] text-red-500 font-bold mt-1 inline-block">{'\u{1F6A9}'} {reply.reportCount} reports</span>}
                  </div>
                ))}

                {/* Doctor reply input */}
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="text-[9px] font-bold text-indigo-600 mb-1.5">{'\u{1F469}\u200D\u2695\uFE0F'} Reply as {user?.fullName || 'Doctor'}</p>
                  <div className="flex gap-2">
                    <input value={replyText} onChange={e => setReplyText(e.target.value)}
                      placeholder="Write your expert reply..."
                      onKeyDown={e => { if (e.key === 'Enter') handleReply(post.id); }}
                      className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 text-xs focus:border-indigo-400 focus:outline-none bg-white" />
                    <button onClick={() => handleReply(post.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold active:scale-95 shadow-sm">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 disabled:opacity-30">{'\u2190'} Prev</button>
          <span className="text-xs text-gray-500 font-bold">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 disabled:opacity-30">Next {'\u2192'}</button>
        </div>
      )}
    </div>
  );
}

// ─── Doctor Ayurveda Sub-Tab ──────────────────────────
function DoctorAyurvedaTab() {
  const [stats, setStats] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientDosha, setPatientDosha] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clinicalForm, setClinicalForm] = useState({ primaryDosha: '', vataScore: 33, pittaScore: 34, kaphaScore: 33, notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    doctorDashAPI.getPatientDoshaStats().then(r => {
      setStats(r.data?.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadPatientDosha = async (userId: string) => {
    setSelectedPatient(userId);
    try {
      const r = await doctorDashAPI.getPatientDosha(userId);
      setPatientDosha(r.data?.data || null);
    } catch { setPatientDosha(null); }
  };

  const submitClinical = async () => {
    if (!selectedPatient || !clinicalForm.primaryDosha) return;
    setSubmitting(true);
    try {
      await doctorDashAPI.submitClinicalDosha(selectedPatient, clinicalForm);
      toast.success('Clinical dosha assessment saved!');
      loadPatientDosha(selectedPatient);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save');
    }
    setSubmitting(false);
  };

  const doshaEmoji = (d: string) => d?.includes('Vata') ? '🌬️' : d?.includes('Pitta') ? '🔥' : d?.includes('Kapha') ? '🌿' : '☯️';

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-purple-400 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-extrabold text-gray-900">☯️ Patient Dosha Management</h3>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Patients', value: stats.totalPatients, emoji: '👥' },
            { label: 'Assessed', value: stats.assessedPatients, emoji: '☯️' },
            { label: 'Verified', value: stats.verifiedPatients, emoji: '✅' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <span className="text-lg">{s.emoji}</span>
              <p className="text-lg font-extrabold text-gray-800">{s.value}</p>
              <p className="text-[8px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Distribution */}
      {stats?.distribution && Object.keys(stats.distribution).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-2">Dosha Distribution</p>
          {Object.entries(stats.distribution).map(([dosha, count]: any) => (
            <div key={dosha} className="flex items-center gap-2 mb-1.5">
              <span>{doshaEmoji(dosha)}</span>
              <span className="text-[11px] text-gray-700 w-20">{dosha}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${(count / stats.totalPatients) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Patient dosha detail (when selected from appointments) */}
      {selectedPatient && patientDosha && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">{patientDosha.patient?.fullName}</p>
              <p className="text-[10px] text-gray-500">{patientDosha.patient?.email || patientDosha.patient?.phone}</p>
            </div>
            <button onClick={() => setSelectedPatient(null)} className="text-gray-400 text-xs">✕</button>
          </div>

          {patientDosha.doshaProfile?.dosha ? (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{doshaEmoji(patientDosha.doshaProfile.dosha)}</span>
                <div>
                  <p className="text-sm font-bold">{patientDosha.doshaProfile.dosha}</p>
                  <p className="text-[9px] text-gray-500">
                    Confidence: {patientDosha.doshaProfile.confidence}% •
                    {patientDosha.doshaProfile.verified ? ' ✅ Verified' : ' ⚠️ Self-assessed'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No dosha assessment yet</p>
          )}

          {/* Clinical assessment form */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-bold text-purple-700 mb-2">🩺 Clinical Prakriti Assessment</p>
            <select value={clinicalForm.primaryDosha} onChange={e => setClinicalForm({ ...clinicalForm, primaryDosha: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 mb-2">
              <option value="">Select Primary Dosha</option>
              <option value="VATA">Vata</option><option value="PITTA">Pitta</option><option value="KAPHA">Kapha</option>
              <option value="VATA_PITTA">Vata-Pitta</option><option value="PITTA_KAPHA">Pitta-Kapha</option><option value="VATA_KAPHA">Vata-Kapha</option>
              <option value="TRIDOSHIC">Tridoshic</option>
            </select>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {['vataScore', 'pittaScore', 'kaphaScore'].map(field => (
                <div key={field}>
                  <label className="text-[9px] text-gray-500 block">{field.replace('Score', '')} %</label>
                  <input type="number" min={0} max={100} value={clinicalForm[field]}
                    onChange={e => setClinicalForm({ ...clinicalForm, [field]: Number(e.target.value) })}
                    className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200" />
                </div>
              ))}
            </div>
            <textarea value={clinicalForm.notes} onChange={e => setClinicalForm({ ...clinicalForm, notes: e.target.value })}
              placeholder="Clinical notes..." className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 mb-2 h-16 resize-none" />
            <button onClick={submitClinical} disabled={!clinicalForm.primaryDosha || submitting}
              className="w-full py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform">
              {submitting ? 'Saving...' : 'Save Clinical Assessment'}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">Select a patient from your Appointments tab, then come here to view/update their dosha profile.</p>
    </div>
  );
}

export default function DoctorDashboard() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState<Tab>('overview');
  const [isOnline, setIsOnline] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);

  // Overview state
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Appointments state
  const [appts, setAppts] = useState<any[]>([]);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [rxLoading, setRxLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Articles state
  const [articles, setArticles] = useState<any[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '', references: '', sources: '', disclaimer: '', evidenceLevel: '' });

  // Earnings state
  const [earnings, setEarnings] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

  // Availability & Slots state
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  const [availabilityToggling, setAvailabilityToggling] = useState(false);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null });
  const [rejectReason, setRejectReason] = useState('');

  // Write prescription modal
  const [rxModal, setRxModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null });
  const [rxForm, setRxForm] = useState({ diagnosis: '', medicines: [{ name: '', dosage: '', frequency: '', duration: '' }], instructions: '', followUpDate: '' });

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await doctorDashAPI.getDashboard();
      setStats(res.data.data);
    } catch (e: any) {
      // Don't show error toast for 404 (profile being set up)
      if (e.response?.status !== 404) toast.error('Failed to load stats');
    }
    finally { setStatsLoading(false); }
  }, []);

  const fetchAppts = useCallback(async () => {
    setApptsLoading(true);
    try {
      const res = await doctorDashAPI.getAppointments(statusFilter ? { status: statusFilter } : {});
      setAppts(res.data.data || []);
    } catch (e: any) {
      if (e.response?.status !== 404) toast.error('Failed to load appointments');
    }
    finally { setApptsLoading(false); }
  }, [statusFilter]);

  const fetchPrescriptions = useCallback(async () => {
    setRxLoading(true);
    try {
      const res = await doctorDashAPI.getPrescriptions();
      setPrescriptions(res.data.data || []);
    } catch {}
    finally { setRxLoading(false); }
  }, []);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await doctorDashAPI.getProfile();
      setProfile(res.data.data);
      setProfileForm(res.data.data);
    } catch {}
    finally { setProfileLoading(false); }
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await doctorDashAPI.getReviews();
      setReviews(res.data.data || []);
    } catch {}
    finally { setReviewsLoading(false); }
  }, []);

  const fetchArticles = useCallback(async () => {
    setArticlesLoading(true);
    try {
      const res = await doctorDashAPI.getArticles();
      setArticles(res.data.data || []);
    } catch {}
    finally { setArticlesLoading(false); }
  }, []);

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await doctorDashAPI.getSlots();
      setSlots(res.data.data || []);
    } catch {}
    finally { setSlotsLoading(false); }
  }, []);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await doctorDashAPI.getEarnings();
      setEarnings(res.data.data || null);
    } catch {}
    finally { setEarningsLoading(false); }
  }, []);

  // Sync isOnline from profile
  useEffect(() => {
    if (profile) setIsOnline(profile.isAvailable ?? true);
  }, [profile]);

  useEffect(() => {
    if (tab === 'overview') { fetchStats(); fetchProfile(); fetchArticles(); }
    if (tab === 'appointments') fetchAppts();
    if (tab === 'availability') { fetchSlots(); fetchProfile(); }
    if (tab === 'prescriptions') fetchPrescriptions();
    if (tab === 'articles') fetchArticles();
    if (tab === 'profile') fetchProfile();
    if (tab === 'reviews') fetchReviews();
    if (tab === 'earnings') fetchEarnings();
  }, [tab]);

  useEffect(() => {
    if (tab === 'appointments') fetchAppts();
  }, [statusFilter]);

  const handleAccept = async (id: string) => {
    setActionLoading(id + '_accept');
    try {
      await doctorDashAPI.acceptAppointment(id);
      toast.success('Appointment confirmed');
      fetchAppts();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setRejectModal({ open: true, appointmentId: id });
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectModal.appointmentId) return;
    setActionLoading(rejectModal.appointmentId + '_reject');
    try {
      await doctorDashAPI.rejectAppointment(rejectModal.appointmentId, rejectReason || 'No reason provided');
      toast.success('Appointment rejected');
      setRejectModal({ open: false, appointmentId: null });
      setRejectReason('');
      fetchAppts();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleToggleAvailability = async () => {
    setAvailabilityToggling(true);
    try {
      const newVal = !isOnline;
      await doctorDashAPI.toggleAvailability(newVal);
      setIsOnline(newVal);
      toast.success(newVal ? 'You are now available for bookings' : 'You are now unavailable for bookings');
    } catch (e: any) { toast.error(e.message || 'Failed to toggle availability'); }
    finally { setAvailabilityToggling(false); }
  };

  const handleCreateSlot = async () => {
    try {
      await doctorDashAPI.createSlot(slotForm);
      toast.success('Slot created');
      setShowSlotForm(false);
      setSlotForm({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
      fetchSlots();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to create slot'); }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await doctorDashAPI.deleteSlot(id);
      toast.success('Slot removed');
      fetchSlots();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleToggleSlot = async (slot: any) => {
    try {
      await doctorDashAPI.updateSlot(slot.id, { isActive: !slot.isActive });
      toast.success(slot.isActive ? 'Slot disabled' : 'Slot enabled');
      fetchSlots();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id + '_complete');
    try {
      await doctorDashAPI.completeAppointment(id);
      toast.success('Marked as completed');
      fetchAppts();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleSaveProfile = async () => {
    try {
      // Send only editable fields, not the entire profile object
      const { fullName, specialization, experienceYears, consultationFee, hospitalName, location, bio, languages } = profileForm;
      await doctorDashAPI.updateProfile({ fullName, specialization, experienceYears, consultationFee, hospitalName, location, bio, languages });
      toast.success('Profile updated');
      setEditing(false);
      fetchProfile();
    } catch (e: any) { toast.error(e?.response?.data?.error || e.message || 'Failed to update'); }
  };

  const handleWritePrescription = async () => {
    if (!rxModal.appointmentId || !rxForm.diagnosis) { toast.error('Diagnosis required'); return; }
    try {
      await prescriptionAPI.create({
        appointmentId: rxModal.appointmentId,
        ...rxForm,
        medicines: rxForm.medicines.filter(m => m.name),
      });
      toast.success('Prescription saved');
      setRxModal({ open: false, appointmentId: null });
      setRxForm({ diagnosis: '', medicines: [{ name: '', dosage: '', frequency: '', duration: '' }], instructions: '', followUpDate: '' });
    } catch (e: any) { toast.error(e.message || 'Failed to save'); }
  };

  const handleSubmitArticle = async () => {
    if (!articleForm.title || !articleForm.content || !articleForm.category) {
      toast.error('Title, content and category are required'); return;
    }
    try {
      if (editingArticle) {
        await doctorDashAPI.updateArticle(editingArticle.id, articleForm);
        toast.success('Article updated & re-submitted for review');
      } else {
        await doctorDashAPI.createArticle(articleForm);
        toast.success('Article submitted for admin review!');
      }
      setShowArticleForm(false);
      setEditingArticle(null);
      setArticleForm({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '', references: '', sources: '', disclaimer: '', evidenceLevel: '' });
      fetchArticles();
    } catch (e: any) { toast.error(e.message || 'Failed to submit'); }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Request admin to delete this article?')) return;
    try {
      await doctorDashAPI.deleteArticle(id);
      toast.success('Delete request sent to admin');
      fetchArticles();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const ARTICLE_CATS = [
    { k: 'periods', l: 'Periods', e: '🩸' }, { k: 'pregnancy', l: 'Pregnancy', e: '🤰' }, { k: 'pcod', l: 'PCOD', e: '🔬' },
    { k: 'wellness', l: 'Wellness', e: '🧘' }, { k: 'nutrition', l: 'Nutrition', e: '🥗' }, { k: 'mental_health', l: 'Mental Health', e: '🧠' },
    { k: 'fitness', l: 'Fitness', e: '💪' }, { k: 'fertility', l: 'Fertility', e: '💜' },
  ];

  const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    REVIEW: 'bg-amber-100 text-amber-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    ARCHIVED: 'bg-red-100 text-red-600',
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date();
  const todayStr = today.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const PRO_TIPS = [
    'Keep your profile updated with your latest specialization and availability. Complete profiles get 3x more bookings.',
    'Publish articles regularly to build trust with patients. Doctors with 5+ articles see 40% more appointment requests.',
    'Respond to pending appointment requests within 2 hours for the best patient experience.',
    'Add a professional bio and hospital name — patients prefer doctors with detailed backgrounds.',
    'Write about trending health topics like PCOD, nutrition, and mental wellness to reach more readers.',
    'Review your prescriptions regularly to maintain accurate patient records.',
  ];

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % PRO_TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Profile completeness calculation
  const getProfileCompleteness = () => {
    if (!profile) return 0;
    const fields = ['fullName', 'specialization', 'experienceYears', 'consultationFee', 'hospitalName', 'location', 'bio', 'avatarUrl'];
    const filled = fields.filter(f => profile[f] && String(profile[f]).trim()).length;
    return Math.round((filled / fields.length) * 100);
  };

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'overview', label: 'Home', emoji: '🏠' },
    { id: 'appointments', label: 'Appts', emoji: '📅' },
    { id: 'availability', label: 'Slots', emoji: '🕐' },
    { id: 'prescriptions', label: 'Rx', emoji: '💊' },
    { id: 'articles', label: 'Articles', emoji: '📝' },
    { id: 'profile', label: 'Profile', emoji: '👤' },
    { id: 'reviews', label: 'Reviews', emoji: '⭐' },
    { id: 'ayurveda', label: 'Dosha', emoji: '☯️' },
    { id: 'earnings', label: 'Earnings', emoji: '💰' },
    { id: 'community', label: 'Community', emoji: '💬' },
  ];

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* ─── Premium Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-indigo-100/50" style={{ backgroundColor: 'rgba(238,242,255,0.92)' }}>
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-indigo-200">
              {user?.fullName?.charAt(0) || 'D'}
            </div>
            {/* Online status dot */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-medium">{greeting}, Doctor</p>
            <p className="text-sm font-extrabold text-gray-900">{user?.fullName || 'Doctor'}</p>
          </div>
          {/* Role Switch — toggle between Doctor & User view */}
          <button onClick={() => nav('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 active:scale-95 transition-transform shadow-sm">
            <span className="text-sm">👤</span>
            <span className="text-[10px] font-bold text-rose-600">User View</span>
          </button>
        </div>
      </div>

      {/* ─── Tab Navigation (Bottom-style, fixed) ─── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40">
        <div className="bg-white rounded-t-3xl border-t border-indigo-100 px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))', height: 72 }}>
          <div className="flex items-center justify-around h-full">
            {tabs.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 active:scale-95 transition-all">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all ${active ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md shadow-indigo-200' : 'bg-gray-50'}`}>
                    <span className={active ? 'brightness-0 invert' : 'opacity-70'} style={{ fontSize: 18 }}>{t.emoji}</span>
                  </div>
                  <span className={`font-bold transition-colors ${active ? 'text-indigo-600' : 'text-gray-500'}`} style={{ fontSize: 9 }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ══════════════ OVERVIEW TAB ══════════════ */}
        {tab === 'overview' && (
          statsLoading ? (
            <div className="space-y-3">
              <div className="bg-white rounded-3xl p-6 animate-pulse h-36" />
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-28" />)}
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Welcome Card with Date & Status */}
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/50 text-[9px] uppercase tracking-widest font-bold">{todayStr}</p>
                    {/* Availability Toggle — synced to backend */}
                    <button onClick={handleToggleAvailability} disabled={availabilityToggling}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 active:scale-95 transition-all disabled:opacity-50">
                      <div className={`w-2 h-2 rounded-full transition-colors ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-gray-400'}`} />
                      <span className="text-[9px] font-bold text-white/80">{availabilityToggling ? '...' : isOnline ? 'Available' : 'Unavailable'}</span>
                    </button>
                  </div>
                  <p className="text-xl font-extrabold mt-1">Welcome, Dr. {user?.fullName?.split(' ').pop() || ''}</p>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">
                    {stats.todayAppointments > 0
                      ? `${stats.todayAppointments} appointment${stats.todayAppointments > 1 ? 's' : ''} today${stats.pendingCount > 0 ? ` · ${stats.pendingCount} pending` : ''}`
                      : 'No appointments today — write an article or update your profile!'}
                  </p>

                  {/* Mini Stats Row inside hero */}
                  <div className="flex gap-2 mt-4">
                    {[
                      { v: stats.todayAppointments ?? 0, l: 'Today' },
                      { v: stats.pendingCount ?? 0, l: 'Pending' },
                      { v: stats.totalPatients ?? 0, l: 'Patients' },
                      { v: stats.averageRating ? Number(stats.averageRating).toFixed(1) : '—', l: 'Rating' },
                    ].map(s => (
                      <div key={s.l} className="flex-1 bg-white/10 rounded-xl px-2 py-2 text-center">
                        <p className="text-lg font-extrabold">{s.v}</p>
                        <p className="text-[8px] text-white/50 font-bold uppercase">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile Completeness + Article Performance */}
              <div className="grid grid-cols-2 gap-3">
                {/* Profile Completeness */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">👤</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Profile</p>
                  </div>
                  {(() => {
                    const pct = getProfileCompleteness();
                    const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
                    return (
                      <>
                        <div className="relative w-16 h-16 mx-auto my-1">
                          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="#F1F5F9" strokeWidth="5" />
                            <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="5"
                              strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 * (1 - pct / 100)} strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-extrabold" style={{ color }}>{pct}%</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-1 font-medium">
                          {pct >= 80 ? 'Looking great!' : pct >= 50 ? 'Almost there' : 'Complete profile'}
                        </p>
                        {pct < 100 && (
                          <button onClick={() => setTab('profile')} className="w-full mt-2 py-1.5 rounded-lg text-[9px] font-bold text-indigo-600 bg-indigo-50 active:scale-95">
                            Complete Profile
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Article Performance */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">📊</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Articles</p>
                  </div>
                  {(() => {
                    const totalArticles = articles.length;
                    const published = articles.filter(a => a.status === 'PUBLISHED').length;
                    const totalViews = articles.reduce((s, a) => s + (a.viewCount || 0), 0);
                    const totalLikes = articles.reduce((s, a) => s + (a.likeCount || 0), 0);
                    return (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Total</span>
                          <span className="text-sm font-extrabold text-gray-900">{totalArticles}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Published</span>
                          <span className="text-sm font-extrabold text-emerald-600">{published}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Views</span>
                          <span className="text-sm font-extrabold text-blue-600">{totalViews}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Likes</span>
                          <span className="text-sm font-extrabold text-rose-600">{totalLikes}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                <p className="text-xs font-extrabold text-gray-800 mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTab('appointments')}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 active:scale-[0.97] transition-transform">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm shadow-sm">📅</div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-gray-800">Appointments</p>
                      <p className="text-[9px] text-gray-400">View schedule</p>
                    </div>
                  </button>
                  <button onClick={() => { setStatusFilter('PENDING'); setTab('appointments'); }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/50 active:scale-[0.97] transition-transform">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm shadow-sm">⏳</div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-gray-800">Pending ({stats.pendingCount ?? 0})</p>
                      <p className="text-[9px] text-gray-400">Review requests</p>
                    </div>
                  </button>
                  <button onClick={() => { setShowArticleForm(true); setEditingArticle(null); setArticleForm({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '', references: '', sources: '', disclaimer: '', evidenceLevel: '' }); setTab('articles'); }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100/50 active:scale-[0.97] transition-transform">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm shadow-sm">✍️</div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-gray-800">Write Article</p>
                      <p className="text-[9px] text-gray-400">Share expertise</p>
                    </div>
                  </button>
                  <button onClick={() => setTab('prescriptions')}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100/50 active:scale-[0.97] transition-transform">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm shadow-sm">💊</div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-gray-800">Prescriptions</p>
                      <p className="text-[9px] text-gray-400">View history</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* More Quick Actions - Row 2 */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setTab('reviews')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-gray-100/50 shadow-sm active:scale-[0.97] transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-sm shadow-sm">⭐</div>
                  <p className="text-[10px] font-bold text-gray-700">Reviews</p>
                </button>
                <button onClick={() => setTab('profile')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-gray-100/50 shadow-sm active:scale-[0.97] transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm shadow-sm">👤</div>
                  <p className="text-[10px] font-bold text-gray-700">My Profile</p>
                </button>
                <button onClick={() => nav('/dashboard')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-gray-100/50 shadow-sm active:scale-[0.97] transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white text-sm shadow-sm">🔄</div>
                  <p className="text-[10px] font-bold text-gray-700">User Mode</p>
                </button>
              </div>

              {/* Recent Appointments Preview */}
              {stats.recentAppointments?.length > 0 && (
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-extrabold text-gray-800">Upcoming Appointments</p>
                    <button onClick={() => setTab('appointments')} className="text-[10px] font-bold text-indigo-500 active:scale-95">View All</button>
                  </div>
                  <div className="space-y-2">
                    {(stats.recentAppointments || []).slice(0, 3).map((appt: any) => (
                      <div key={appt.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50/80">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {(appt.user?.name || 'P').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-gray-800 truncate">{appt.user?.name || 'Patient'}</p>
                          <p className="text-[9px] text-gray-400">
                            {new Date(appt.scheduledAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })} at {new Date(appt.scheduledAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={'text-[8px] font-bold px-2 py-1 rounded-full ' + (STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-600')}>
                          {appt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rotating Pro Tips */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-4 border border-indigo-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm shadow-sm">💡</div>
                  <p className="text-xs font-extrabold text-indigo-800">Pro Tip</p>
                  <div className="flex-1" />
                  <div className="flex gap-1">
                    {PRO_TIPS.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === tipIdx ? 'bg-indigo-500 w-4' : 'bg-indigo-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-indigo-600/80 leading-relaxed min-h-[32px] transition-all">
                  {PRO_TIPS[tipIdx]}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-4xl mb-4">🩺</div>
              <p className="text-sm font-bold text-gray-500">Welcome to Doctor Portal</p>
              <p className="text-xs text-gray-400 mt-2 max-w-[250px] mx-auto leading-relaxed">Your doctor profile is being set up. Contact admin if you need help getting started.</p>
              <button onClick={() => setTab('profile')} className="mt-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold active:scale-95 shadow-md shadow-indigo-200">
                View My Profile
              </button>
            </div>
          )
        )}

        {/* ══════════════ APPOINTMENTS TAB ══════════════ */}
        {tab === 'appointments' && (
          <>
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={'flex-shrink-0 px-3.5 py-2 rounded-2xl text-[11px] font-bold transition-all active:scale-95 ' + (statusFilter === s ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200' : 'bg-white text-gray-500 border border-gray-100')}>
                  {s || 'All'}
                </button>
              ))}
            </div>

            {apptsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-3xl p-4 animate-pulse h-32" />)}</div>
            ) : appts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl mb-3">📅</div>
                <p className="text-sm font-bold text-gray-400">No appointments found</p>
                <p className="text-xs text-gray-300 mt-1">{statusFilter ? `No ${statusFilter.toLowerCase()} appointments` : 'Your appointments will appear here'}</p>
              </div>
            ) : (
              appts.map(appt => (
                <div key={appt.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {(appt.user?.name || 'P').charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{appt.user?.name || 'Patient'}</p>
                        <p className="text-[10px] text-gray-400">{appt.user?.phone || appt.user?.email || ''}</p>
                      </div>
                    </div>
                    <span className={'text-[9px] font-bold px-2.5 py-1 rounded-full ' + (STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-600')}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-gray-500 mb-3 bg-gray-50 rounded-xl px-3 py-2">
                    <span>📅 {new Date(appt.scheduledAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>🕐 {new Date(appt.scheduledAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                    {appt.notes && <span className="truncate">📝 {appt.notes.split(' | ')[0]}</span>}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {appt.status === 'PENDING' && (<>
                      <button onClick={() => handleAccept(appt.id)} disabled={!!actionLoading}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold active:scale-95 disabled:opacity-50 border border-emerald-100">
                        {actionLoading === appt.id + '_accept' ? '...' : '✓ Accept'}
                      </button>
                      <button onClick={() => handleReject(appt.id)} disabled={!!actionLoading}
                        className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold active:scale-95 disabled:opacity-50 border border-red-100">
                        {actionLoading === appt.id + '_reject' ? '...' : '✗ Reject'}
                      </button>
                    </>)}
                    {['CONFIRMED', 'IN_PROGRESS'].includes(appt.status) && (
                      <button onClick={() => handleComplete(appt.id)} disabled={!!actionLoading}
                        className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold active:scale-95 disabled:opacity-50 border border-blue-100">
                        {actionLoading === appt.id + '_complete' ? '...' : '✓ Mark Complete'}
                      </button>
                    )}
                    {appt.status === 'COMPLETED' && (
                      <button onClick={() => setRxModal({ open: true, appointmentId: appt.id })}
                        className="flex-1 py-2.5 rounded-xl bg-purple-50 text-purple-700 text-[11px] font-bold active:scale-95 border border-purple-100">
                        💊 Write Prescription
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ══════════════ AVAILABILITY TAB ══════════════ */}
        {tab === 'availability' && (
          <>
            {/* Availability Toggle Card */}
            <div className={`rounded-3xl p-5 shadow-sm border transition-all ${isOnline ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${isOnline ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {isOnline ? '🟢' : '🔴'}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">{isOnline ? 'Accepting Bookings' : 'Not Accepting Bookings'}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Patients {isOnline ? 'can' : 'cannot'} book appointments with you</p>
                  </div>
                </div>
                <button onClick={handleToggleAvailability} disabled={availabilityToggling}
                  className={`relative w-14 h-7 rounded-full transition-all ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'} ${availabilityToggling ? 'opacity-50' : ''}`}>
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all ${isOnline ? 'left-7' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Time Slots Management */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Your Time Slots</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Set when patients can book appointments</p>
                </div>
                <button onClick={() => setShowSlotForm(!showSlotForm)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold active:scale-95 shadow-sm">
                  {showSlotForm ? 'Cancel' : '+ Add Slot'}
                </button>
              </div>

              {/* Add Slot Form */}
              {showSlotForm && (
                <div className="bg-indigo-50 rounded-2xl p-4 mb-4 space-y-3 border border-indigo-100">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Day of Week</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {DAY_SHORT.map((d, i) => (
                        <button key={i} onClick={() => setSlotForm(p => ({ ...p, dayOfWeek: i }))}
                          className={'px-3 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 border ' + (slotForm.dayOfWeek === i ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 border-gray-200')}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Time</label>
                      <input type="time" value={slotForm.startTime} onChange={e => setSlotForm(p => ({ ...p, startTime: e.target.value }))}
                        className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Time</label>
                      <input type="time" value={slotForm.endTime} onChange={e => setSlotForm(p => ({ ...p, endTime: e.target.value }))}
                        className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none" />
                    </div>
                  </div>
                  <button onClick={handleCreateSlot}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 active:scale-[0.97] shadow-md shadow-indigo-200 transition-transform">
                    Create Slot
                  </button>
                </div>
              )}

              {/* Slots List */}
              {slotsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}</div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl mb-3">🕐</div>
                  <p className="text-sm font-bold text-gray-400">No time slots set</p>
                  <p className="text-xs text-gray-300 mt-1 max-w-[220px] mx-auto">Add your available hours so patients know when to book</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Group by day */}
                  {[0,1,2,3,4,5,6].map(day => {
                    const daySlots = slots.filter(s => s.dayOfWeek === day);
                    if (daySlots.length === 0) return null;
                    return (
                      <div key={day}>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 mt-3 first:mt-0">{DAY_NAMES[day]}</p>
                        {daySlots.map(slot => (
                          <div key={slot.id} className={`flex items-center justify-between p-3 rounded-2xl mb-1.5 border transition-all ${slot.isActive ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${slot.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                🕐
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800">{slot.startTime} — {slot.endTime}</p>
                                <p className="text-[9px] text-gray-400">{slot.isActive ? 'Active' : 'Disabled'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleSlot(slot)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold active:scale-95 border ${slot.isActive ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {slot.isActive ? 'Disable' : 'Enable'}
                              </button>
                              <button onClick={() => handleDeleteSlot(slot.id)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 active:scale-95">
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100/50">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">💡</span>
                <div>
                  <p className="text-[11px] font-bold text-blue-800">How Slots Work</p>
                  <p className="text-[10px] text-blue-600/70 leading-relaxed mt-0.5">
                    Time slots define when patients can book appointments. Add slots for each day you're available.
                    Toggle "Accepting Bookings" off to temporarily pause all new bookings without removing your slots.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════ PRESCRIPTIONS TAB ══════════════ */}
        {tab === 'prescriptions' && (
          rxLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-3xl p-4 animate-pulse h-24" />)}</div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-50 flex items-center justify-center text-3xl mb-3">💊</div>
              <p className="text-sm font-bold text-gray-400">No prescriptions yet</p>
              <p className="text-xs text-gray-300 mt-1">Complete an appointment to write a prescription</p>
            </div>
          ) : (
            prescriptions.map(rx => (
              <div key={rx.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm">💊</div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{rx.appointment?.user?.name || 'Patient'}</p>
                      <p className="text-[10px] text-gray-400">{new Date(rx.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-bold border border-purple-100">Rx</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2 mt-2">
                  <p className="text-[11px] text-gray-700 font-medium">{rx.diagnosis}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{rx.medicines?.length || 0} medicine(s) prescribed</p>
                </div>
              </div>
            ))
          )
        )}

        {/* ══════════════ ARTICLES TAB ══════════════ */}
        {tab === 'articles' && (
          <>
            {!showArticleForm ? (
              <>
                <button onClick={() => { setEditingArticle(null); setArticleForm({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '', references: '', sources: '', disclaimer: '', evidenceLevel: '' }); setShowArticleForm(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold active:scale-[0.97] shadow-lg shadow-emerald-200 transition-transform">
                  <span className="text-base">✍️</span> Write New Article
                </button>

                {articlesLoading ? (
                  <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-3xl p-4 animate-pulse h-28" />)}</div>
                ) : articles.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center text-3xl mb-3">📝</div>
                    <p className="text-sm font-bold text-gray-400">No articles yet</p>
                    <p className="text-xs text-gray-300 mt-1 max-w-[220px] mx-auto">Write your first article to share medical expertise with patients!</p>
                  </div>
                ) : (
                  articles.map(art => (
                    <div key={art.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-lg flex-shrink-0">
                            {art.emoji || '📝'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{art.title}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{art.category} · {new Date(art.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <span className={'text-[9px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ' + (STATUS_BADGE[art.status] || 'bg-gray-100 text-gray-600')}>
                          {art.status}
                        </span>
                      </div>
                      {art.excerpt && <p className="text-[11px] text-gray-500 leading-relaxed mb-2 line-clamp-2">{art.excerpt}</p>}
                      {art.status === 'REVIEW' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 rounded-xl px-2.5 py-1.5 mb-2 font-medium border border-amber-100/50">
                          <span>⏳</span> Waiting for admin approval
                        </div>
                      )}
                      {art.status === 'ARCHIVED' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-red-600 bg-red-50 rounded-xl px-2.5 py-1.5 mb-2 font-medium border border-red-100/50">
                          <span>🗑️</span> Delete requested — pending admin approval
                        </div>
                      )}
                      {art.status === 'PUBLISHED' && (
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2">
                          {art.viewCount > 0 && <span>👁 {art.viewCount} views</span>}
                          {art.likeCount > 0 && <span>👍 {art.likeCount} likes</span>}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {art.status !== 'ARCHIVED' && (
                          <>
                            <button onClick={() => {
                              setEditingArticle(art);
                              setArticleForm({ title: art.title, content: art.content, category: art.category, tags: (art.tags || []).join(', '), excerpt: art.excerpt || '', emoji: art.emoji || '', references: (art.references || []).join('\n'), sources: (art.sources || []).join('\n'), disclaimer: art.disclaimer || '', evidenceLevel: art.evidenceLevel || '' });
                              setShowArticleForm(true);
                            }} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold active:scale-95 border border-blue-100">
                              ✏️ Edit
                            </button>
                            <button onClick={() => handleDeleteArticle(art.id)}
                              className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold active:scale-95 border border-red-100">
                              🗑️ Request Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              /* Article Form */
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-extrabold text-gray-900">{editingArticle ? '✏️ Edit Article' : '✍️ Write Article'}</h3>
                  <button onClick={() => { setShowArticleForm(false); setEditingArticle(null); }}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-500 active:scale-95">Cancel</button>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title *</label>
                  <input value={articleForm.title} onChange={e => setArticleForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Article title" className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category *</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {ARTICLE_CATS.map(c => (
                      <button key={c.k} onClick={() => setArticleForm(p => ({ ...p, category: c.k }))}
                        className={'px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 border ' + (articleForm.category === c.k ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-100')}>
                        {c.e} {c.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Content *</label>
                  <textarea value={articleForm.content} onChange={e => setArticleForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="Write your article content here..." rows={10}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Excerpt (short summary)</label>
                  <textarea value={articleForm.excerpt} onChange={e => setArticleForm(p => ({ ...p, excerpt: e.target.value }))}
                    placeholder="Brief summary shown in article previews..." rows={2}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tags (comma-sep)</label>
                    <input value={articleForm.tags} onChange={e => setArticleForm(p => ({ ...p, tags: e.target.value }))}
                      placeholder="PCOD, Diet, Tips..." className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Emoji</label>
                    <input value={articleForm.emoji} onChange={e => setArticleForm(p => ({ ...p, emoji: e.target.value }))}
                      placeholder="e.g. 📝" className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>
                {/* ─── Credibility & References Section ─── */}
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">📚</span>
                    <h4 className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">References & Credibility</h4>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Adding references and sources improves article credibility and helps pass admin review faster. Medical articles should cite peer-reviewed sources.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evidence Level</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      { k: 'peer-reviewed', l: 'Peer-Reviewed Study', e: '🔬' },
                      { k: 'clinical-study', l: 'Clinical Study', e: '🏥' },
                      { k: 'traditional-knowledge', l: 'Traditional Knowledge', e: '📜' },
                      { k: 'expert-opinion', l: 'Expert Opinion', e: '👨‍⚕️' },
                    ].map(ev => (
                      <button key={ev.k} onClick={() => setArticleForm(p => ({ ...p, evidenceLevel: p.evidenceLevel === ev.k ? '' : ev.k }))}
                        className={'px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 border ' + (articleForm.evidenceLevel === ev.k ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-100')}>
                        {ev.e} {ev.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">References (one per line)</label>
                  <textarea value={articleForm.references} onChange={e => setArticleForm(p => ({ ...p, references: e.target.value }))}
                    placeholder={"e.g.\nAyurvedic Pharmacology & Therapeutic Uses of Medicinal Plants — Vaidya V.M. Gogte\nCharaka Samhita, Chikitsasthanam Chapter 30\nJ Ethnopharmacol. 2019;234:112-120"}
                    rows={4}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source Links (one per line)</label>
                  <textarea value={articleForm.sources} onChange={e => setArticleForm(p => ({ ...p, sources: e.target.value }))}
                    placeholder={"e.g.\nhttps://pubmed.ncbi.nlm.nih.gov/12345678\nhttps://www.who.int/traditional-medicine"}
                    rows={3}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Disclaimer (optional)</label>
                  <textarea value={articleForm.disclaimer} onChange={e => setArticleForm(p => ({ ...p, disclaimer: e.target.value }))}
                    placeholder="e.g. This article is for educational purposes only. Consult your doctor before starting any treatment."
                    rows={2}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
                </div>

                <button onClick={handleSubmitArticle}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 active:scale-[0.97] shadow-lg shadow-emerald-200 transition-transform">
                  {editingArticle ? '✏️ Update & Re-submit for Review' : '📤 Submit for Admin Review'}
                </button>
                <p className="text-[10px] text-gray-400 text-center">Your article will be reviewed by admin before publishing</p>
              </div>
            )}
          </>
        )}

        {/* ══════════════ PROFILE TAB ══════════════ */}
        {tab === 'profile' && (
          profileLoading ? (
            <div className="bg-white rounded-3xl p-6 animate-pulse h-72" />
          ) : profile ? (
            <div className="space-y-4">
              {/* Profile Header Card */}
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-extrabold border-2 border-white/30">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} className="w-full h-full rounded-2xl object-cover" alt="" />
                    ) : (profile.fullName?.charAt(0) || 'D')}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-extrabold">Dr. {profile.fullName || user?.fullName || 'Doctor'}</p>
                    <p className="text-white/70 text-xs">{profile.specialization || 'Specialization not set'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {profile.experienceYears && <span className="text-[9px] bg-white/20 rounded-full px-2 py-0.5 font-bold">{profile.experienceYears} yrs exp</span>}
                      {profile.rating > 0 && <span className="text-[9px] bg-white/20 rounded-full px-2 py-0.5 font-bold">⭐ {Number(profile.rating).toFixed(1)}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">Profile Details</h3>
                  <button onClick={() => setEditing(!editing)}
                    className={'px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 border ' + (editing ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100')}>
                    {editing ? 'Cancel' : '✏️ Edit'}
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'fullName', label: 'Full Name', type: 'text', icon: '👤' },
                    { key: 'specialization', label: 'Specialization', type: 'text', icon: '🩺' },
                    { key: 'experienceYears', label: 'Experience (years)', type: 'number', icon: '📅' },
                    { key: 'consultationFee', label: 'Consultation Fee (INR)', type: 'number', icon: '💰' },
                    { key: 'hospitalName', label: 'Hospital/Clinic', type: 'text', icon: '🏥' },
                    { key: 'location', label: 'Location', type: 'text', icon: '📍' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <span>{field.icon}</span> {field.label}
                      </label>
                      {editing ? (
                        <input type={field.type} value={profileForm[field.key] || ''} onChange={e => setProfileForm((p: any) => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                      ) : (
                        <p className="text-xs font-medium text-gray-800 mt-1 bg-gray-50 rounded-xl px-3 py-2">{profile[field.key] || '—'}</p>
                      )}
                    </div>
                  ))}
                  {/* About */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <span>📝</span> About
                    </label>
                    {editing ? (
                      <textarea value={profileForm.bio || ''} onChange={e => setProfileForm((p: any) => ({ ...p, bio: e.target.value }))}
                        className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" rows={3} />
                    ) : (
                      <p className="text-xs text-gray-700 mt-1 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">{profile.bio || '—'}</p>
                    )}
                  </div>
                </div>
                {editing && (
                  <button onClick={handleSaveProfile} className="w-full mt-4 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 active:scale-[0.97] shadow-lg shadow-indigo-200 transition-transform">
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl mb-3">👤</div>
              <p className="text-sm font-bold text-gray-400">Profile not found</p>
              <p className="text-xs text-gray-300 mt-2 max-w-[250px] mx-auto">Contact admin to link your account to a doctor profile.</p>
            </div>
          )
        )}

        {/* ══════════════ REVIEWS TAB ══════════════ */}
        {tab === 'reviews' && (
          reviewsLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-3xl p-4 animate-pulse h-24" />)}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-3xl mb-3">⭐</div>
              <p className="text-sm font-bold text-gray-400">No reviews yet</p>
              <p className="text-xs text-gray-300 mt-1">Patient reviews will appear here after consultations</p>
            </div>
          ) : (
            <>
              {/* Rating Summary */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-5 text-center border border-amber-100/50">
                <p className="text-4xl font-extrabold text-gray-900">
                  {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                </p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="text-lg" style={{ opacity: i <= Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) ? 1 : 0.2 }}>⭐</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5 font-bold">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>

              {reviews.map((rev, i) => (
                <div key={i} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
                        {(rev.user?.name || 'P').charAt(0)}
                      </div>
                      <p className="text-xs font-bold text-gray-800">{rev.user?.name || 'Patient'}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className="text-xs" style={{ opacity: s <= Math.round(rev.rating) ? 1 : 0.2 }}>⭐</span>
                      ))}
                    </div>
                  </div>
                  {rev.comment && <p className="text-[11px] text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">{rev.comment}</p>}
                  <p className="text-[9px] text-gray-300 mt-2 font-medium">{new Date(rev.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </>
          )
        )}

        {/* ═══ PATIENT AYURVEDA / DOSHA TAB ═══ */}
        {tab === 'ayurveda' && (<DoctorAyurvedaTab />)}

        {/* ═══ EARNINGS TAB ═══ */}
        {tab === 'earnings' && (
          <div className="px-5 py-5 space-y-4">
            {earningsLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" /></div>
            ) : !earnings ? (
              <div className="text-center py-12">
                <p className="text-4xl">💰</p>
                <p className="text-sm text-gray-400 mt-2">No earnings data yet</p>
              </div>
            ) : (<>
              {/* Earnings Overview Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-xs font-bold text-white/70 uppercase tracking-wide">Total Earnings</p>
                <p className="text-3xl font-black mt-1">{'\u20B9'}{(earnings.totalEarned || 0).toLocaleString()}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{earnings.totalAppointments || 0} completed consultations</p>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className="text-lg font-black text-emerald-600">{'\u20B9'}{(earnings.totalPaidOut || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-1">Received</p>
                  <div className="w-full h-1 bg-emerald-100 rounded-full mt-2">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${earnings.totalEarned ? (earnings.totalPaidOut / earnings.totalEarned * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className="text-lg font-black text-amber-600">{'\u20B9'}{(earnings.totalPending || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-1">Processing</p>
                  <div className="w-full h-1 bg-amber-100 rounded-full mt-2">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${earnings.totalEarned ? (earnings.totalPending / earnings.totalEarned * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className="text-lg font-black text-rose-600">{'\u20B9'}{(earnings.unsettled || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-1">Unsettled</p>
                  <div className="w-full h-1 bg-rose-100 rounded-full mt-2">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${earnings.totalEarned ? (earnings.unsettled / earnings.totalEarned * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Payout History */}
              {earnings.payouts && earnings.payouts.length > 0 && (<>
                <h3 className="text-sm font-bold text-gray-700 mt-1">Payout History</h3>
                <div className="space-y-2.5">
                  {earnings.payouts.map((p: any) => (
                    <div key={p.id} className={'bg-white rounded-2xl p-4 shadow-sm ' + (p.status === 'PAID' ? 'border-l-4 border-emerald-400' : p.status === 'PENDING' ? 'border-l-4 border-amber-400' : '')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{'\u20B9'}{p.netPayout?.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400">
                            {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                            {' \u2022 '}{p.appointmentCount} appts
                          </p>
                        </div>
                        <span className={'text-[8px] font-bold px-2 py-0.5 rounded-full ' + (
                          p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          p.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        )}>{p.status}</span>
                      </div>
                      {p.paidAt && <p className="text-[9px] text-emerald-600 mt-1">Paid: {new Date(p.paidAt).toLocaleString()} {'\u2022'} {p.paymentMethod}</p>}
                      {p.transactionId && <p className="text-[9px] text-gray-400 mt-0.5">TXN: {p.transactionId}</p>}
                    </div>
                  ))}
                </div>
              </>)}

              {/* Recent Consultations */}
              {earnings.recentAppointments && earnings.recentAppointments.length > 0 && (<>
                <h3 className="text-sm font-bold text-gray-700 mt-1">Recent Consultations</h3>
                <div className="space-y-2">
                  {earnings.recentAppointments.map((a: any) => (
                    <div key={a.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{a.user?.fullName || 'Patient'}</p>
                        <p className="text-[9px] text-gray-400">{new Date(a.scheduledAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">{'\u20B9'}{(a.amountPaid || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </>)}

              <div className="bg-blue-50 rounded-2xl p-4 mt-2">
                <p className="text-[11px] text-blue-700 font-medium">
                  {'\u2139\uFE0F'} Payouts are settled by the admin after deducting platform commission. You'll receive settlements via UPI/Bank Transfer.
                </p>
              </div>
            </>)}
          </div>
        )}

      </div>

      {/* ═══ COMMUNITY MODERATION ═══ */}
      {tab === 'community' && (<DoctorCommunityTab />)}

      {/* ═══ Write Prescription Modal ═══ */}
      {rxModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setRxModal({ open: false, appointmentId: null })}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900">💊 Write Prescription</h3>
              <button onClick={() => setRxModal({ open: false, appointmentId: null })} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold active:scale-95">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Diagnosis *</label>
                <input value={rxForm.diagnosis} onChange={e => setRxForm(p => ({ ...p, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis" className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Medicines</label>
                {rxForm.medicines.map((med, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-2xl p-3 mb-2 space-y-2 border border-gray-100">
                    <input value={med.name} onChange={e => setRxForm(p => ({ ...p, medicines: p.medicines.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) }))}
                      placeholder="Medicine name" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" />
                    <div className="grid grid-cols-3 gap-2">
                      {['dosage', 'frequency', 'duration'].map(f => (
                        <input key={f} value={(med as any)[f]} onChange={e => setRxForm(p => ({ ...p, medicines: p.medicines.map((m, i) => i === idx ? { ...m, [f]: e.target.value } : m) }))}
                          placeholder={f.charAt(0).toUpperCase() + f.slice(1)} className="px-2 py-2 border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-indigo-400" />
                      ))}
                    </div>
                    {rxForm.medicines.length > 1 && (
                      <button onClick={() => setRxForm(p => ({ ...p, medicines: p.medicines.filter((_, i) => i !== idx) }))} className="text-[10px] text-red-500 font-bold">Remove</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setRxForm(p => ({ ...p, medicines: [...p.medicines, { name: '', dosage: '', frequency: '', duration: '' }] }))}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-bold active:scale-95">
                  + Add Medicine
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Instructions</label>
                <textarea value={rxForm.instructions} onChange={e => setRxForm(p => ({ ...p, instructions: e.target.value }))}
                  placeholder="Additional instructions for patient..." className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Follow-up Date</label>
                <input type="date" value={rxForm.followUpDate} onChange={e => setRxForm(p => ({ ...p, followUpDate: e.target.value }))}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none" />
              </div>
              <button onClick={handleWritePrescription} className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 active:scale-[0.97] shadow-lg shadow-purple-200 transition-transform">
                Save Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Rejection Reason Modal ═══ */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setRejectModal({ open: false, appointmentId: null })}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-xl">✗</div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Reject Appointment</h3>
                <p className="text-[10px] text-gray-400">The patient will see your reason</p>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Fully booked on this date, please try another day..."
                className="w-full mt-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none" rows={3}
                autoFocus />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectModal({ open: false, appointmentId: null })}
                className="flex-1 py-3 rounded-2xl font-bold text-xs text-gray-600 bg-gray-100 active:scale-95 transition-transform">
                Cancel
              </button>
              <button onClick={confirmReject} disabled={!!actionLoading}
                className="flex-1 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-red-500 to-orange-500 active:scale-95 transition-transform shadow-md shadow-red-200 disabled:opacity-50">
                {actionLoading ? 'Rejecting...' : 'Reject Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
