// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChiefDoctor } from '../hooks/useChiefDoctor';
import { communityAPI } from '../services/api';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

// Backend category keys → frontend display
const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🌍' },
  { id: 'periods', label: 'Periods', emoji: '🩸' },
  { id: 'pcod', label: 'PCOD/PCOS', emoji: '🌿' },
  { id: 'fertility', label: 'Fertility', emoji: '💜' },
  { id: 'pregnancy', label: 'Pregnancy', emoji: '🤰' },
  { id: 'menopause', label: 'Menopause', emoji: '🍂' },
  { id: 'mental_health', label: 'Mental Health', emoji: '🧠' },
  { id: 'ayurveda', label: 'Ayurveda', emoji: '🌿' },
  { id: 'hair_skin', label: 'Hair & Skin', emoji: '✨' },
  { id: 'ask_doctor', label: 'Ask Doctor', emoji: '👩‍⚕️' },
];

const CAT_COLORS: Record<string, string> = {
  periods: '#E11D48', pcod: '#059669', fertility: '#7C3AED', pregnancy: '#EC4899',
  menopause: '#D97706', mental_health: '#6366F1', ayurveda: '#16A34A', hair_skin: '#F59E0B', ask_doctor: '#3B82F6',
};

const STORIES = [
  { id: 's1', name: "Dr. Shruthi's Tip", emoji: '👩‍⚕️', gradient: 'linear-gradient(135deg,#059669,#10B981)', new: true },
  { id: 's2', name: 'PCOS Journey', emoji: '🌿', gradient: 'linear-gradient(135deg,#7C3AED,#A78BFA)', new: true },
  { id: 's3', name: 'Pregnancy Diary', emoji: '🤰', gradient: 'linear-gradient(135deg,#EC4899,#F9A8D4)', new: false },
  { id: 's4', name: 'Period Truths', emoji: '🩸', gradient: 'linear-gradient(135deg,#E11D48,#F43F5E)', new: true },
  { id: 's5', name: 'Ayurveda Tips', emoji: '🌱', gradient: 'linear-gradient(135deg,#D97706,#FDE68A)', new: false },
];

const EXPERT_QA = [
  {
    id: 'eq1', question: 'Can I exercise during my period?',
    answer: 'Gentle exercise is actually beneficial during periods! Light yoga, walking, and stretching can reduce cramping by increasing blood flow. Avoid high-intensity workouts on Day 1–2 when flow is heaviest. Listen to your body.',
    doctor: 'Dr. Shruthi', specialty: 'Gynecologist', likes: 89,
  },
  {
    id: 'eq2', question: 'What\'s the difference between PCOD and PCOS?',
    answer: 'PCOD (Polycystic Ovarian Disease) is a condition where ovaries release immature eggs. PCOS (Syndrome) is more severe, involving hormonal imbalance affecting multiple body systems. Both are manageable with diet and Ayurveda.',
    doctor: 'Dr. Shruthi', specialty: 'Gynecologist', likes: 124,
  },
];

const REPORT_REASONS = ['Spam', 'Harassment', 'Misinformation', 'Inappropriate content', 'Other'];

export default function CommunityPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { chief } = useChiefDoctor();

  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'ADMIN' || user?.role === 'DOCTOR';

  // ─── State ───
  const [cat, setCat] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCat, setNewCat] = useState('periods');
  const [isAnon, setIsAnon] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedQA, setLikedQA] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Poll state
  const [poll, setPoll] = useState<any>(null);
  const [pollVoted, setPollVoted] = useState<string | null>(null);

  // Report modal
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'reply'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('');

  // ─── Fetch posts ───
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (cat !== 'all') params.category = cat;
      if (searchQ) params.search = searchQ;
      const res = await communityAPI.listPosts(params);
      setPosts(res.data?.data?.posts || []);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [cat, searchQ]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ─── Fetch poll ───
  useEffect(() => {
    (async () => {
      try {
        const res = await communityAPI.getActivePoll();
        const data = res.data?.data;
        if (data) setPoll(data);
      } catch { /* no poll available */ }
    })();
  }, []);

  // ─── Fetch single post (for replies) ───
  const fetchPostDetail = async (postId: string) => {
    try {
      const res = await communityAPI.getPost(postId);
      const detail = res.data?.data;
      if (detail) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: detail.replies } : p));
      }
    } catch { /* silent */ }
  };

  // ─── Create post ───
  const submitPost = async () => {
    if (!newContent.trim()) { toast.error('Write something first'); return; }
    try {
      setSubmitting(true);
      await communityAPI.createPost({ content: newContent.trim(), category: newCat, isAnonymous: isAnon });
      setNewContent(''); setShowCompose(false);
      toast.success('Posted! Dr. Shruthi reviews posts daily.');
      fetchPosts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reply ───
  const submitReply = async (postId: string) => {
    if (!replyText.trim()) return;
    try {
      await communityAPI.reply(postId, { content: replyText.trim(), isAnonymous: false });
      setReplyText('');
      toast.success('Reply posted!');
      fetchPostDetail(postId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reply');
    }
  };

  // ─── Like post (toggle) ───
  const likePost = async (id: string) => {
    try {
      const res = await communityAPI.likePost(id);
      const liked = res.data?.data?.liked;
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likeCount: p.likeCount + (liked ? 1 : -1) } : p));
      setLikedPosts(prev => {
        const next = new Set(prev);
        liked ? next.add(id) : next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to like');
    }
  };

  // ─── Poll vote ───
  const handlePollVote = async (optionId: string) => {
    if (pollVoted || !poll) return;
    try {
      await communityAPI.votePoll(poll.id, optionId);
      setPollVoted(optionId);
      setPoll((prev: any) => ({
        ...prev,
        totalVotes: (prev.totalVotes || 0) + 1,
        voteCounts: { ...prev.voteCounts, [optionId]: ((prev.voteCounts?.[optionId]) || 0) + 1 },
      }));
      toast.success('Vote submitted! 🗳️');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to vote');
    }
  };

  // ─── Report ───
  const submitReport = async () => {
    if (!reportTarget || !reportReason) return;
    try {
      if (reportTarget.type === 'post') {
        await communityAPI.reportPost(reportTarget.id, { reason: reportReason });
      } else {
        await communityAPI.reportReply(reportTarget.id, { reason: reportReason });
      }
      toast.success('Report submitted. Moderators will review.');
      setReportTarget(null); setReportReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to report');
    }
  };

  // ─── Moderation actions ───
  const hidePost = async (id: string) => {
    try {
      await communityAPI.hidePost(id, { hidden: true, reason: 'Moderation' });
      toast.success('Post hidden');
      fetchPosts();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const deletePost = async (id: string) => {
    try {
      await communityAPI.deletePost(id);
      toast.success('Post deleted');
      fetchPosts();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const pinPost = async (id: string) => {
    try {
      const res = await communityAPI.pinPost(id);
      toast.success(res.data?.message || 'Pin toggled');
      fetchPosts();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const hideReply = async (id: string) => {
    try {
      await communityAPI.hideReply(id, { hidden: true, reason: 'Moderation' });
      toast.success('Reply hidden');
      if (expandedPost) fetchPostDetail(expandedPost);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const deleteReply = async (id: string) => {
    try {
      await communityAPI.deleteReply(id);
      toast.success('Reply deleted');
      if (expandedPost) fetchPostDetail(expandedPost);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ─── Helpers ───
  const catColor = (c: string) => CAT_COLORS[c] || '#E11D48';
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };
  const authorName = (item: any) => item.user?.fullName || 'Anonymous';
  const authorInitial = (item: any) => (authorName(item))[0] || 'A';
  const isDocRole = (item: any) => item.user?.role === 'DOCTOR' || item.isDoctor;

  // poll helpers
  const pollOptions = (poll?.options || []) as { id: string; label: string }[];
  const pollTotal = poll?.totalVotes || 0;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#FAFAF9' }}>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90 transition-transform">←</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Community 💬</h1>
              <p className="text-[9px] text-emerald-500 font-bold">● Safe space for women's health</p>
            </div>
          </div>
          <button onClick={() => setShowCompose(true)}
            className="text-[10px] font-bold text-white px-3 py-1.5 rounded-full active:scale-95 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#E11D48,#F43F5E)' }}>
            + Ask
          </button>
        </div>
        {/* Categories */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all flex-shrink-0 ' + (cat === c.id ? 'text-white' : 'bg-gray-100 text-gray-500')}
              style={cat === c.id ? { backgroundColor: catColor(c.id === 'all' ? 'periods' : c.id) } : {}}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-3 space-y-4">

        {/* ─── Stories Row ─── */}
        <div>
          <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Stories</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {STORIES.map(s => (
              <button key={s.id} onClick={() => {
                setViewedStories(prev => new Set([...prev, s.id]));
                toast(`${s.emoji} ${s.name} — Story content coming soon!`);
              }} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 ${viewedStories.has(s.id) ? 'border-gray-200 opacity-60' : 'border-rose-400'}`}
                  style={{ background: s.gradient }}>
                  {s.emoji}
                </div>
                <span className="text-[8px] text-gray-500 font-bold w-14 text-center leading-tight line-clamp-1">{s.name}</span>
                {s.new && !viewedStories.has(s.id) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Search ─── */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search discussions..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs outline-none bg-white focus:border-rose-400" />
        </div>

        {/* ─── Community Welcome ─── */}
        {cat === 'all' && !searchQ && (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <span>🤝</span>
              <h3 className="text-xs font-extrabold text-rose-800">Safe Space. Anonymous. Expert-Verified.</h3>
            </div>
            <p className="text-[10px] text-rose-700 leading-relaxed">{chief.name} personally reviews and answers questions daily. Be kind, be honest, be supportive.</p>
          </div>
        )}

        {/* ─── Expert Q&A ─── */}
        {cat === 'all' && !searchQ && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">👩‍⚕️ Expert Q&A</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="space-y-3">
              {EXPERT_QA.map(qa => (
                <div key={qa.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
                    <p className="text-[10px] font-extrabold text-emerald-800">❓ {qa.question}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs text-white font-bold">👩‍⚕️</div>
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-800">{qa.doctor}</p>
                        <p className="text-[8px] text-emerald-600 font-bold">{qa.specialty} · ✓ Verified</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{qa.answer}</p>
                    <button onClick={() => {
                      if (likedQA.has(qa.id)) return;
                      setLikedQA(prev => new Set([...prev, qa.id]));
                    }} className="flex items-center gap-1 mt-3 text-[10px] text-gray-400 active:scale-95 transition-transform">
                      <span>{likedQA.has(qa.id) ? '❤️' : '🤍'}</span>
                      <span className="font-bold">{qa.likes + (likedQA.has(qa.id) ? 1 : 0)} helpful</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Weekly Poll ─── */}
        {cat === 'all' && !searchQ && poll && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🗳️</span>
              <div>
                <p className="text-[9px] font-extrabold text-gray-400 uppercase">Weekly Poll</p>
                <p className="text-xs font-extrabold text-gray-800">{poll.question}</p>
              </div>
            </div>
            <div className="space-y-2">
              {pollOptions.map(opt => {
                const votes = poll.voteCounts?.[opt.id] || 0;
                const pct = pollTotal > 0 ? Math.round((votes / pollTotal) * 100) : 0;
                const isMyVote = pollVoted === opt.id;
                return (
                  <button key={opt.id} onClick={() => handlePollVote(opt.id)}
                    className={'w-full text-left rounded-xl overflow-hidden border-2 transition-all active:scale-[0.99] ' + (isMyVote ? 'border-rose-400' : 'border-gray-100')}
                    disabled={!!pollVoted}>
                    <div className="relative h-9">
                      <div className="absolute inset-0 rounded-xl transition-all" style={{ width: pollVoted ? `${pct}%` : '0%', backgroundColor: isMyVote ? '#FFF1F2' : '#F9FAFB' }} />
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className="text-[10px] font-bold text-gray-700">{opt.label}</span>
                        {pollVoted && <span className="text-[10px] font-extrabold" style={{ color: isMyVote ? '#E11D48' : '#9CA3AF' }}>{pct}%</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!pollVoted && <p className="text-[9px] text-gray-400 text-center mt-2">Tap to vote · {pollTotal.toLocaleString()} votes</p>}
            {pollVoted && <p className="text-[9px] text-emerald-500 font-bold text-center mt-2">✓ Thanks for voting! · {pollTotal.toLocaleString()} total</p>}
          </div>
        )}

        {/* ─── Posts heading ─── */}
        {(cat !== 'all' || searchQ) && (
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-1">
            {searchQ ? `Results for "${searchQ}"` : CATEGORIES.find(c => c.id === cat)?.label + ' discussions'}
          </p>
        )}
        {cat === 'all' && !searchQ && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Latest Discussions</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        )}

        {/* ─── Loading ─── */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 mt-3 font-bold">Loading discussions...</p>
          </div>
        )}

        {/* ─── Posts ─── */}
        {!loading && posts.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">💬</span>
            <p className="text-sm text-gray-400 mt-2 font-bold">No posts yet in this category</p>
            <button onClick={() => setShowCompose(true)} className="mt-2 text-xs text-rose-500 font-bold active:scale-95 transition-transform">Be the first to ask →</button>
          </div>
        ) : !loading && (
          posts.map(post => (
            <div key={post.id} className={'bg-white rounded-2xl shadow-sm overflow-hidden ' + (post.isPinned ? 'ring-1 ring-amber-200' : '') + (post.isHidden ? ' opacity-50' : '')}>
              {post.isPinned && <div className="bg-amber-50 px-4 py-1 text-[8px] font-bold text-amber-600">📌 Pinned</div>}
              {post.isHidden && <div className="bg-red-50 px-4 py-1 text-[8px] font-bold text-red-500">🚫 Hidden by moderator</div>}
              <div className="p-4">
                {/* Category badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: catColor(post.category) }}>
                    {CATEGORIES.find(c => c.id === post.category)?.emoji} {post.category}
                  </span>
                </div>
                {/* Author */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + (isDocRole(post) ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gray-100 text-gray-500')}>
                    {isDocRole(post) ? '👩‍⚕️' : authorInitial(post)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{authorName(post)}</span>
                      {isDocRole(post) && <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">DOCTOR ✓</span>}
                    </div>
                    <span className="text-[9px] text-gray-400">{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                  <button onClick={() => likePost(post.id)} className={'flex items-center gap-1 text-[10px] active:scale-95 transition-transform ' + (likedPosts.has(post.id) ? 'text-rose-500' : 'text-gray-400')}>
                    <span>{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                    <span className="font-bold">{post.likeCount || 0}</span>
                  </button>
                  <button onClick={() => {
                    if (expandedPost === post.id) {
                      setExpandedPost(null);
                    } else {
                      setExpandedPost(post.id);
                      fetchPostDetail(post.id);
                    }
                  }} className="flex items-center gap-1 text-[10px] text-gray-500 active:scale-95 transition-transform">
                    <span>💬</span>
                    <span className="font-bold">{post.replyCount || 0} replies</span>
                  </button>
                  <button onClick={() => setReportTarget({ type: 'post', id: post.id })} className="text-[10px] text-gray-400 active:scale-95 transition-transform">
                    🚩
                  </button>
                  {/* Moderation buttons */}
                  {isModerator && (
                    <button onClick={() => hidePost(post.id)} className="text-[9px] text-orange-500 font-bold active:scale-95 ml-auto">
                      {post.isHidden ? 'Unhide' : 'Hide'}
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => pinPost(post.id)} className="text-[9px] text-amber-500 font-bold active:scale-95">
                        {post.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button onClick={() => { if (confirm('Delete this post permanently?')) deletePost(post.id); }} className="text-[9px] text-red-500 font-bold active:scale-95">
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {/* Replies */}
                {expandedPost === post.id && (
                  <div className="mt-3 space-y-2.5">
                    {(post.replies || []).map((reply: any) => (
                      <div key={reply.id} className={'rounded-xl p-3 ' + (isDocRole(reply) ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50')}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={'text-[10px] font-bold ' + (isDocRole(reply) ? 'text-emerald-700' : 'text-gray-600')}>{authorName(reply)}</span>
                          {isDocRole(reply) && <span className="text-[7px] font-bold bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded">✓ Verified Doctor</span>}
                          <span className="text-[9px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{reply.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => setReportTarget({ type: 'reply', id: reply.id })} className="text-[9px] text-gray-400 active:scale-95">🚩</button>
                          {isModerator && (
                            <button onClick={() => hideReply(reply.id)} className="text-[8px] text-orange-500 font-bold active:scale-95">Hide</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => { if (confirm('Delete reply?')) deleteReply(reply.id); }} className="text-[8px] text-red-500 font-bold active:scale-95">Delete</button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input value={replyText} onChange={e => setReplyText(e.target.value)}
                        placeholder={isModerator ? 'Reply as ' + (user?.fullName || 'Doctor') + '...' : 'Write a reply...'}
                        onKeyDown={e => { if (e.key === 'Enter') submitReply(post.id); }}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:border-rose-400 focus:outline-none" />
                      <button onClick={() => submitReply(post.id)} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold active:scale-95 transition-transform">→</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* ─── Trending hashtags ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Trending Today</p>
          <div className="flex flex-wrap gap-2">
            {['#PCOS', '#PeriodPain', '#TTC', '#Pregnancy', '#Menopause', '#Ayurveda', '#HormoneBalance', '#SelfCare'].map(tag => (
              <button key={tag} onClick={() => setSearchQ(tag.slice(1))}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 active:scale-95 transition-transform border border-rose-100">
                {tag}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ─── FAB Ask Button ─── */}
      <button onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full text-white text-2xl shadow-xl active:scale-95 transition-transform z-30 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899)' }}>
        ✏️
      </button>

      {/* ─── Compose Modal ─── */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCompose(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Share or Ask 💬</h3>
            <p className="text-xs text-gray-400 mb-4">{chief.name} reviews all posts daily</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <button key={c.id} onClick={() => setNewCat(c.id)}
                  className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ' + (newCat === c.id ? 'text-white' : 'bg-gray-100 text-gray-500')}
                  style={newCat === c.id ? { backgroundColor: catColor(c.id) } : {}}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="What's on your mind? Ask a question, share your experience, or seek support..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none resize-none" rows={5} autoFocus />
            <button onClick={() => setIsAnon(!isAnon)} className="flex items-center gap-2 mt-3 py-2 active:scale-95 transition-transform">
              <div className={'w-10 h-5 rounded-full transition-colors flex items-center ' + (isAnon ? 'bg-rose-500 justify-end' : 'bg-gray-300 justify-start')}>
                <div className="w-4 h-4 bg-white rounded-full shadow mx-0.5" />
              </div>
              <span className="text-xs font-bold text-gray-700">{isAnon ? 'Anonymous' : 'Show my name'}</span>
              {isAnon && <span className="text-[9px] text-gray-400">Your identity is hidden</span>}
            </button>
            <button onClick={submitPost} disabled={!newContent.trim() || submitting}
              className="w-full mt-4 py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899)' }}>
              {submitting ? 'Posting...' : `Post ${isAnon ? 'Anonymously' : 'as ' + (user?.fullName || 'User')}`}
            </button>
          </div>
        </div>
      )}

      {/* ─── Report Modal ─── */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={() => setReportTarget(null)}>
          <div className="bg-white w-[90%] max-w-[380px] rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">Report {reportTarget.type} 🚩</h3>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={'w-full text-left px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ' + (reportReason === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-100 text-gray-600')}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReportTarget(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">Cancel</button>
              <button onClick={submitReport} disabled={!reportReason}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold disabled:opacity-40">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav communityBadge />
    </div>
  );
}
