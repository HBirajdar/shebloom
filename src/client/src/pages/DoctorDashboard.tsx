// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { doctorDashAPI, prescriptionAPI } from '../services/api';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'appointments' | 'prescriptions' | 'articles' | 'profile' | 'reviews';

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  CONFIRMED:   'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  REJECTED:    'bg-orange-100 text-orange-700',
  CANCELLED:   'bg-red-100 text-red-600',
  NO_SHOW:     'bg-gray-100 text-gray-600',
};

export default function DoctorDashboard() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState<Tab>('overview');

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
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '' });

  // Write prescription modal
  const [rxModal, setRxModal] = useState<{ open: boolean; appointmentId: string | null }>({ open: false, appointmentId: null });
  const [rxForm, setRxForm] = useState({ diagnosis: '', medicines: [{ name: '', dosage: '', frequency: '', duration: '' }], instructions: '', followUpDate: '' });

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await doctorDashAPI.getDashboard();
      setStats(res.data.data);
    } catch { toast.error('Failed to load stats'); }
    finally { setStatsLoading(false); }
  }, []);

  const fetchAppts = useCallback(async () => {
    setApptsLoading(true);
    try {
      const res = await doctorDashAPI.getAppointments(statusFilter ? { status: statusFilter } : {});
      setAppts(res.data.data || []);
    } catch { toast.error('Failed to load appointments'); }
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

  useEffect(() => {
    if (tab === 'overview') fetchStats();
    if (tab === 'appointments') fetchAppts();
    if (tab === 'prescriptions') fetchPrescriptions();
    if (tab === 'articles') fetchArticles();
    if (tab === 'profile') fetchProfile();
    if (tab === 'reviews') fetchReviews();
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
    const reason = prompt('Reason for rejection (optional):') || '';
    setActionLoading(id + '_reject');
    try {
      await doctorDashAPI.rejectAppointment(id, reason);
      toast.success('Appointment rejected');
      fetchAppts();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
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
      await doctorDashAPI.updateProfile(profileForm);
      toast.success('Profile updated');
      setEditing(false);
      fetchProfile();
    } catch (e: any) { toast.error(e.message || 'Failed to update'); }
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
      setArticleForm({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '' });
      fetchArticles();
    } catch (e: any) { toast.error(e.message || 'Failed to submit'); }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await doctorDashAPI.deleteArticle(id);
      toast.success('Article deleted');
      fetchArticles();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const ARTICLE_CATS = [
    { k: 'periods', l: 'Periods' }, { k: 'pregnancy', l: 'Pregnancy' }, { k: 'pcod', l: 'PCOD' },
    { k: 'wellness', l: 'Wellness' }, { k: 'nutrition', l: 'Nutrition' }, { k: 'mental_health', l: 'Mental Health' },
  ];

  const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    REVIEW: 'bg-amber-100 text-amber-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    ARCHIVED: 'bg-red-100 text-red-600',
  };

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'overview', label: 'Overview', emoji: '\u{1F4CA}' },
    { id: 'appointments', label: 'Appointments', emoji: '\u{1F4C5}' },
    { id: 'prescriptions', label: 'Prescriptions', emoji: '\u{1F48A}' },
    { id: 'articles', label: 'Articles', emoji: '\u{1F4DD}' },
    { id: 'profile', label: 'My Profile', emoji: '\u{1F464}' },
    { id: 'reviews', label: 'Reviews', emoji: '\u{2B50}' },
  ];

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.92)' }}>
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow">
            {user?.fullName?.charAt(0) || 'D'}
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-extrabold text-gray-900">Doctor Portal</h1>
            <p className="text-[10px] text-gray-400">{user?.fullName || 'Doctor'}</p>
          </div>
          <button onClick={() => nav('/dashboard')} className="px-3 py-1.5 rounded-2xl bg-white/60 text-xs font-bold text-gray-500 active:scale-95">Exit</button>
        </div>
        {/* Tab bar */}
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex-shrink-0 px-3 py-2 rounded-2xl text-[11px] font-bold transition-all active:scale-95 ' + (tab === t.id ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white/60 text-gray-500')}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* -- OVERVIEW TAB -- */}
        {tab === 'overview' && (
          statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-24" />)}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Today's Appointments", value: stats.todayAppointments, emoji: '\u{1F4C5}', color: 'from-blue-500 to-indigo-500' },
                  { label: 'Pending Requests', value: stats.pendingCount, emoji: '\u{23F3}', color: 'from-amber-500 to-orange-500' },
                  { label: 'Patients Served', value: stats.totalPatients, emoji: '\u{1F9D1}\u{200D}\u{2695}\u{FE0F}', color: 'from-emerald-500 to-teal-500' },
                  { label: 'Avg Rating', value: stats.averageRating ? `${stats.averageRating} \u{2605}` : 'No reviews', emoji: '\u{2B50}', color: 'from-rose-500 to-pink-500' },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-3xl p-4 shadow-sm">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl mb-2 shadow-sm`}>{card.emoji}</div>
                    <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{card.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <p className="text-xs font-extrabold text-gray-800 mb-2">Quick Actions</p>
                <div className="space-y-2">
                  <button onClick={() => setTab('appointments')} className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 shadow-md shadow-rose-200">
                    \u{1F4C5} View Today's Appointments
                  </button>
                  <button onClick={() => { setStatusFilter('PENDING'); setTab('appointments'); }} className="w-full py-3 rounded-2xl bg-amber-50 text-amber-700 text-xs font-bold active:scale-95 border border-amber-100">
                    \u{23F3} Review {stats.pendingCount} Pending Requests
                  </button>
                  <button onClick={() => setTab('articles')} className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold active:scale-95 border border-emerald-100">
                    \u{1F4DD} Write & Publish Article
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm font-bold text-gray-400">No stats available</p>
              <p className="text-xs text-gray-300 mt-1">Your doctor profile may not be linked yet. Contact admin.</p>
            </div>
          )
        )}

        {/* -- APPOINTMENTS TAB -- */}
        {tab === 'appointments' && (
          <>
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={'flex-shrink-0 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all active:scale-95 ' + (statusFilter === s ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 'bg-white text-gray-500 border border-gray-100')}>
                  {s || 'All'}
                </button>
              ))}
            </div>

            {apptsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-28" />)}</div>
            ) : appts.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl">\u{1F4C5}</span>
                <p className="text-sm font-bold text-gray-400 mt-3">No appointments found</p>
              </div>
            ) : (
              appts.map(appt => (
                <div key={appt.id} className="bg-white rounded-3xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                        {(appt.user?.name || 'P').charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{appt.user?.name || 'Patient'}</p>
                        <p className="text-[10px] text-gray-400">{appt.user?.phone || appt.user?.email || ''}</p>
                      </div>
                    </div>
                    <span className={'text-[9px] font-bold px-2 py-1 rounded-full ' + (STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-600')}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-gray-500 mb-2">
                    <span>\u{1F4C5} {new Date(appt.scheduledAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                    <span>\u{1F552} {new Date(appt.scheduledAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                    {appt.notes && <span>\u{1F4DD} {appt.notes.split(' | ')[0]}</span>}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {appt.status === 'PENDING' && (<>
                      <button onClick={() => handleAccept(appt.id)} disabled={!!actionLoading}
                        className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold active:scale-95 disabled:opacity-50">
                        {actionLoading === appt.id + '_accept' ? '...' : '\u{2713} Accept'}
                      </button>
                      <button onClick={() => handleReject(appt.id)} disabled={!!actionLoading}
                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold active:scale-95 disabled:opacity-50">
                        {actionLoading === appt.id + '_reject' ? '...' : '\u{2717} Reject'}
                      </button>
                    </>)}
                    {['CONFIRMED', 'IN_PROGRESS'].includes(appt.status) && (
                      <button onClick={() => handleComplete(appt.id)} disabled={!!actionLoading}
                        className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold active:scale-95 disabled:opacity-50">
                        {actionLoading === appt.id + '_complete' ? '...' : '\u{2713} Complete'}
                      </button>
                    )}
                    {appt.status === 'COMPLETED' && (
                      <button onClick={() => setRxModal({ open: true, appointmentId: appt.id })}
                        className="flex-1 py-2 rounded-xl bg-purple-50 text-purple-700 text-[11px] font-bold active:scale-95">
                        \u{1F48A} Write Prescription
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* -- PRESCRIPTIONS TAB -- */}
        {tab === 'prescriptions' && (
          rxLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" />)}</div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">\u{1F48A}</span>
              <p className="text-sm font-bold text-gray-400 mt-3">No prescriptions written yet</p>
            </div>
          ) : (
            prescriptions.map(rx => (
              <div key={rx.id} className="bg-white rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{rx.appointment?.user?.name || 'Patient'}</p>
                    <p className="text-[10px] text-gray-500">{new Date(rx.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-bold">Prescription</span>
                </div>
                <p className="text-xs text-gray-700 mt-2 font-medium">{rx.diagnosis}</p>
                <p className="text-[10px] text-gray-400 mt-1">{rx.medicines?.length || 0} medicine(s)</p>
              </div>
            ))
          )
        )}

        {/* -- ARTICLES TAB -- */}
        {tab === 'articles' && (
          <>
            {!showArticleForm ? (
              <>
                <button onClick={() => { setEditingArticle(null); setArticleForm({ title: '', content: '', category: 'wellness', tags: '', excerpt: '', emoji: '' }); setShowArticleForm(true); }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold active:scale-95 shadow-md shadow-emerald-200">
                  + Write New Article
                </button>

                {articlesLoading ? (
                  <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-24" />)}</div>
                ) : articles.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="text-5xl">{'\u{1F4DD}'}</span>
                    <p className="text-sm font-bold text-gray-400 mt-3">No articles yet</p>
                    <p className="text-xs text-gray-300 mt-1">Write your first article to share your expertise!</p>
                  </div>
                ) : (
                  articles.map(art => (
                    <div key={art.id} className="bg-white rounded-3xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-800">{art.emoji || '\u{1F4DD}'} {art.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{art.category} &middot; {new Date(art.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <span className={'text-[9px] font-bold px-2 py-1 rounded-full ' + (STATUS_BADGE[art.status] || 'bg-gray-100 text-gray-600')}>
                          {art.status}
                        </span>
                      </div>
                      {art.excerpt && <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{art.excerpt.substring(0, 100)}...</p>}
                      {art.status === 'REVIEW' && (
                        <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mb-2 font-medium">Waiting for admin approval</p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingArticle(art);
                          setArticleForm({ title: art.title, content: art.content, category: art.category, tags: (art.tags || []).join(', '), excerpt: art.excerpt || '', emoji: art.emoji || '' });
                          setShowArticleForm(true);
                        }} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold active:scale-95">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteArticle(art.id)}
                          className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold active:scale-95">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              /* Article Form */
              <div className="bg-white rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-extrabold text-gray-900">{editingArticle ? 'Edit Article' : 'Write Article'}</h3>
                  <button onClick={() => { setShowArticleForm(false); setEditingArticle(null); }}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-500 active:scale-95">Cancel</button>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Title *</label>
                  <input value={articleForm.title} onChange={e => setArticleForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Article title" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Category *</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ARTICLE_CATS.map(c => (
                      <button key={c.k} onClick={() => setArticleForm(p => ({ ...p, category: c.k }))}
                        className={'px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ' + (articleForm.category === c.k ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                        {c.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Content *</label>
                  <textarea value={articleForm.content} onChange={e => setArticleForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="Write your article content here..." rows={8}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Excerpt (short summary)</label>
                  <textarea value={articleForm.excerpt} onChange={e => setArticleForm(p => ({ ...p, excerpt: e.target.value }))}
                    placeholder="Brief summary for preview..." rows={2}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tags (comma-sep)</label>
                    <input value={articleForm.tags} onChange={e => setArticleForm(p => ({ ...p, tags: e.target.value }))}
                      placeholder="PCOD, Diet, Tips..." className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Emoji</label>
                    <input value={articleForm.emoji} onChange={e => setArticleForm(p => ({ ...p, emoji: e.target.value }))}
                      placeholder="e.g. \u{1F4DD}" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
                  </div>
                </div>
                <button onClick={handleSubmitArticle}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 active:scale-95 shadow-md shadow-emerald-200">
                  {editingArticle ? 'Update & Re-submit for Review' : 'Submit for Admin Review'}
                </button>
                <p className="text-[10px] text-gray-400 text-center">Your article will be reviewed by admin before publishing</p>
              </div>
            )}
          </>
        )}

        {/* -- PROFILE TAB -- */}
        {tab === 'profile' && (
          profileLoading ? (
            <div className="bg-white rounded-2xl p-6 animate-pulse h-64" />
          ) : profile ? (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">My Profile</h3>
                  <button onClick={() => setEditing(!editing)}
                    className={'px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 ' + (editing ? 'bg-gray-100 text-gray-600' : 'bg-rose-50 text-rose-600 border border-rose-100')}>
                    {editing ? 'Cancel' : '\u{270F}\u{FE0F} Edit'}
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'fullName', label: 'Full Name', type: 'text' },
                    { key: 'specialization', label: 'Specialization', type: 'text' },
                    { key: 'experienceYears', label: 'Experience (years)', type: 'number' },
                    { key: 'consultationFee', label: 'Consultation Fee', type: 'number' },
                    { key: 'hospitalName', label: 'Hospital/Clinic', type: 'text' },
                    { key: 'location', label: 'Location', type: 'text' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{field.label}</label>
                      {editing ? (
                        <input type={field.type} value={profileForm[field.key] || ''} onChange={e => setProfileForm((p: any) => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
                      ) : (
                        <p className="text-xs font-medium text-gray-800 mt-0.5">{profile[field.key] || '\u{2014}'}</p>
                      )}
                    </div>
                  ))}
                  {/* About (textarea) */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">About</label>
                    {editing ? (
                      <textarea value={profileForm.bio || ''} onChange={e => setProfileForm((p: any) => ({ ...p, bio: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none resize-none" rows={3} />
                    ) : (
                      <p className="text-xs text-gray-700 mt-0.5">{profile.bio || '\u{2014}'}</p>
                    )}
                  </div>
                </div>
                {editing && (
                  <button onClick={handleSaveProfile} className="w-full mt-4 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 to-pink-500 active:scale-95 shadow-md shadow-rose-200">
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm font-bold text-gray-400">Profile not found</p>
              <p className="text-xs text-gray-300 mt-1">Contact admin to link your account to a doctor profile.</p>
            </div>
          )
        )}

        {/* -- REVIEWS TAB -- */}
        {tab === 'reviews' && (
          reviewsLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" />)}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">\u{2B50}</span>
              <p className="text-sm font-bold text-gray-400 mt-3">No reviews yet</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl p-4 shadow-sm text-center">
                <p className="text-3xl font-extrabold text-gray-900">
                  {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} \u{2605}
                </p>
                <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
              {reviews.map((rev, i) => (
                <div key={i} className="bg-white rounded-3xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-800">{rev.user?.name || 'Patient'}</p>
                    <span className="text-amber-500 text-xs font-bold">{'\u{2605}'.repeat(Math.round(rev.rating))}{'\u{2606}'.repeat(5 - Math.round(rev.rating))}</span>
                  </div>
                  {rev.comment && <p className="text-xs text-gray-600">{rev.comment}</p>}
                  <p className="text-[10px] text-gray-300 mt-1">{new Date(rev.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </>
          )
        )}

      </div>

      {/* Write Prescription Modal */}
      {rxModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setRxModal({ open: false, appointmentId: null })}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900">\u{1F48A} Write Prescription</h3>
              <button onClick={() => setRxModal({ open: false, appointmentId: null })} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold active:scale-95">\u{00D7}</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Diagnosis *</label>
                <input value={rxForm.diagnosis} onChange={e => setRxForm(p => ({ ...p, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Medicines</label>
                {rxForm.medicines.map((med, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-2xl p-3 mb-2 space-y-2">
                    <input value={med.name} onChange={e => setRxForm(p => ({ ...p, medicines: p.medicines.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) }))}
                      placeholder="Medicine name" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-rose-400" />
                    <div className="grid grid-cols-3 gap-2">
                      {['dosage', 'frequency', 'duration'].map(f => (
                        <input key={f} value={(med as any)[f]} onChange={e => setRxForm(p => ({ ...p, medicines: p.medicines.map((m, i) => i === idx ? { ...m, [f]: e.target.value } : m) }))}
                          placeholder={f.charAt(0).toUpperCase() + f.slice(1)} className="px-2 py-2 border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-rose-400" />
                      ))}
                    </div>
                    {rxForm.medicines.length > 1 && (
                      <button onClick={() => setRxForm(p => ({ ...p, medicines: p.medicines.filter((_, i) => i !== idx) }))} className="text-[10px] text-red-500 font-bold">Remove</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setRxForm(p => ({ ...p, medicines: [...p.medicines, { name: '', dosage: '', frequency: '', duration: '' }] }))}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-bold active:scale-95">
                  + Add Medicine
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Instructions</label>
                <textarea value={rxForm.instructions} onChange={e => setRxForm(p => ({ ...p, instructions: e.target.value }))}
                  placeholder="Additional instructions for patient..." className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Follow-up Date</label>
                <input type="date" value={rxForm.followUpDate} onChange={e => setRxForm(p => ({ ...p, followUpDate: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-rose-400 focus:outline-none" />
              </div>
              <button onClick={handleWritePrescription} className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 active:scale-95 shadow-md">
                Save Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
