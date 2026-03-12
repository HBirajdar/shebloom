// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useChiefDoctor } from '../hooks/useChiefDoctor';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

interface Post {
  id: string; category: string; content: string; anonymous: boolean;
  authorName: string; authorInitial: string; likes: number; replies: Reply[];
  timestamp: string; isDoctor: boolean; isPinned: boolean;
}
interface Reply {
  id: string; content: string; authorName: string; isDoctor: boolean; timestamp: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🌍' },
  { id: 'periods', label: 'Periods', emoji: '🩸' },
  { id: 'pcod', label: 'PCOD/PCOS', emoji: '🌿' },
  { id: 'fertility', label: 'Fertility', emoji: '💜' },
  { id: 'pregnancy', label: 'Pregnancy', emoji: '🤰' },
  { id: 'menopause', label: 'Menopause', emoji: '🍂' },
  { id: 'mental', label: 'Mental Health', emoji: '🧠' },
  { id: 'ayurveda', label: 'Ayurveda', emoji: '🌿' },
  { id: 'hair', label: 'Hair & Skin', emoji: '✨' },
  { id: 'ask_doctor', label: 'Ask Doctor', emoji: '👩‍⚕️' },
];

const CAT_COLORS: Record<string, string> = {
  periods: '#E11D48', pcod: '#059669', fertility: '#7C3AED', pregnancy: '#EC4899',
  menopause: '#D97706', mental: '#6366F1', ayurveda: '#16A34A', hair: '#F59E0B', ask_doctor: '#3B82F6',
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

const WEEKLY_POLL = {
  question: 'How was your energy level this week?',
  options: [
    { id: 'p1', label: 'Very High ⚡', votes: 234 },
    { id: 'p2', label: 'Good 😊', votes: 389 },
    { id: 'p3', label: 'Average 😐', votes: 278 },
    { id: 'p4', label: 'Low 😔', votes: 156 },
  ],
};

const defaultPosts: Post[] = [
  { id: 'p1', category: 'pcod', content: 'I was diagnosed with PCOD 6 months ago. Started Shatavari and changed my diet — no sugar, no dairy. My periods are becoming regular for the first time in 3 years! Don\'t lose hope, sisters. 💚', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 47, timestamp: '2h ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r1', content: 'This is wonderful progress! Shatavari combined with dietary changes is very effective for PCOD. I recommend also adding 30 minutes of walking daily and avoiding processed foods. Keep going!', authorName: 'Dr. Shruthi', isDoctor: true, timestamp: '1h ago' },
      { id: 'r2', content: 'Same here! 4 months in and my cycle is now 32 days instead of 45+. Diet change was the game changer for me.', authorName: 'Anonymous', isDoctor: false, timestamp: '1h ago' },
    ]},
  { id: 'p2', category: 'periods', content: 'Does anyone else get terrible cramps on day 2? I\'ve tried everything — hot water bottles, painkillers, nothing helps for more than an hour. Any ayurvedic remedies that actually work?', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 32, timestamp: '4h ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r3', content: 'Ajwain water is magic! Boil 1 tbsp ajwain in water, sip warm. Works in 15-20 minutes for me. Also try castor oil pack on lower abdomen with a hot water bottle.', authorName: 'Anonymous', isDoctor: false, timestamp: '3h ago' },
      { id: 'r4', content: 'Severe cramps that don\'t respond to painkillers should be evaluated. It could be endometriosis. Please book a consultation and we can discuss your specific situation.', authorName: 'Dr. Shruthi', isDoctor: true, timestamp: '2h ago' },
    ]},
  { id: 'p3', category: 'ask_doctor', content: 'Dr. Shruthi, is it safe to take Ashwagandha while trying to conceive? My husband and I have been trying for 8 months.', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 28, timestamp: '6h ago', isDoctor: false, isPinned: true,
    replies: [
      { id: 'r5', content: 'Yes, Ashwagandha is safe and actually beneficial when TTC. It reduces cortisol which is one of the top causes of unexplained infertility. I recommend 500mg twice daily for both partners. For you, combine it with Shatavari. Please request a callback so I can create a personalized fertility protocol for you.', authorName: 'Dr. Shruthi', isDoctor: true, timestamp: '5h ago' },
    ]},
  { id: 'p4', category: 'pregnancy', content: 'Just found out I\'m pregnant! 6 weeks along. Feeling nauseous all day. Any tips from moms who\'ve been through this? First time pregnancy and I\'m nervous. 🤰', anonymous: false, authorName: 'Priya M.', authorInitial: 'P', likes: 53, timestamp: '8h ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r6', content: 'Congratulations! Ginger tea with honey helped me a lot. Also eat small meals every 2-3 hours instead of 3 big meals. It gets better after week 12!', authorName: 'Meera K.', isDoctor: false, timestamp: '7h ago' },
      { id: 'r7', content: 'Congratulations! Nausea in first trimester is actually a good sign — strong hormones. Try ginger, vitamin B6, and keep dry crackers by bedside. Start prenatal vitamins with folic acid immediately if you haven\'t already.', authorName: 'Dr. Shruthi', isDoctor: true, timestamp: '6h ago' },
    ]},
  { id: 'p5', category: 'mental', content: 'I feel so anxious and irritable for 10 days before my period every month. It affects my work and relationships. Is this normal or should I be worried?', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 41, timestamp: '1d ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r8', content: '10 days of severe PMS symptoms could indicate PMDD (Premenstrual Dysphoric Disorder). This is a real medical condition, not "just PMS." Magnesium supplements, evening primrose oil, and reducing caffeine can help significantly. Please consult — there are effective treatments.', authorName: 'Dr. Shruthi', isDoctor: true, timestamp: '22h ago' },
    ]},
  { id: 'p6', category: 'menopause', content: 'I\'m 47 and my periods have become irregular — sometimes 20 days, sometimes 45. Getting hot flashes at night. Is this perimenopause? What should I do?', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 19, timestamp: '1d ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r9', content: 'Yes, this sounds like perimenopause. It\'s completely normal from age 40-45. Shatavari is excellent for managing symptoms naturally. For hot flashes, keep the room cool and avoid spicy food and caffeine. This transition can last 4-10 years. You\'re not alone — let\'s talk in a consultation.', authorName: 'Dr. Shruthi', isDoctor: true, timestamp: '20h ago' },
    ]},
];

export default function CommunityPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { isAdminUnlocked } = useAyurvedaStore();
  const { chief } = useChiefDoctor();

  const [cat, setCat] = useState('all');
  const [posts, setPosts] = useState<Post[]>(defaultPosts);
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCat, setNewCat] = useState('periods');
  const [isAnon, setIsAnon] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [pollVote, setPollVote] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState({ p1: 234, p2: 389, p3: 278, p4: 156 });
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedQA, setLikedQA] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = posts;
    if (cat !== 'all') result = result.filter(p => p.category === cat);
    if (searchQ) result = result.filter(p => p.content.toLowerCase().includes(searchQ.toLowerCase()));
    return [...result].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [posts, cat, searchQ]);

  const submitPost = () => {
    if (!newContent.trim()) { toast.error('Write something first'); return; }
    const post: Post = {
      id: 'p_' + Date.now(), category: newCat, content: newContent.trim(),
      anonymous: isAnon, authorName: isAnon ? 'Anonymous' : (user?.fullName || 'User'),
      authorInitial: isAnon ? 'A' : (user?.fullName?.charAt(0) || 'U'),
      likes: 0, replies: [], timestamp: 'Just now', isDoctor: false, isPinned: false,
    };
    setPosts([post, ...posts]);
    setNewContent(''); setShowCompose(false);
    localStorage.setItem('sb_community_joined', '1');
    toast.success('Posted! Dr. Shruthi reviews posts daily.');
  };

  const submitReply = (postId: string) => {
    if (!replyText.trim()) return;
    const isDoc = isAdminUnlocked;
    const reply: Reply = {
      id: 'r_' + Date.now(), content: replyText.trim(),
      authorName: isDoc ? chief.name : (user?.fullName || 'Anonymous'),
      isDoctor: isDoc, timestamp: 'Just now',
    };
    setPosts(posts.map(p => p.id === postId ? { ...p, replies: [...p.replies, reply] } : p));
    setReplyText('');
    toast.success(isDoc ? 'Doctor reply posted!' : 'Reply posted!');
  };

  const likePost = (id: string) => {
    if (likedPosts.has(id)) return;
    setLikedPosts(prev => new Set([...prev, id]));
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  const handlePollVote = (optId: string) => {
    if (pollVote) return;
    setPollVote(optId);
    setPollVotes(prev => ({ ...prev, [optId]: (prev[optId] || 0) + 1 }));
    toast.success('Vote submitted! 🗳️');
  };

  const totalPollVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);
  const catColor = (c: string) => CAT_COLORS[c] || '#E11D48';

  const activeWomen = 1247 + Math.floor(Math.random() * 50);

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#FAFAF9' }}>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90 transition-transform">←</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Community 💬</h1>
              <p className="text-[9px] text-emerald-500 font-bold">● {activeWomen.toLocaleString()} women active today</p>
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
        {cat === 'all' && !searchQ && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🗳️</span>
              <div>
                <p className="text-[9px] font-extrabold text-gray-400 uppercase">Weekly Poll</p>
                <p className="text-xs font-extrabold text-gray-800">{WEEKLY_POLL.question}</p>
              </div>
            </div>
            <div className="space-y-2">
              {WEEKLY_POLL.options.map(opt => {
                const votes = pollVotes[opt.id] || opt.votes;
                const pct = Math.round((votes / totalPollVotes) * 100);
                const isMyVote = pollVote === opt.id;
                return (
                  <button key={opt.id} onClick={() => handlePollVote(opt.id)}
                    className={'w-full text-left rounded-xl overflow-hidden border-2 transition-all active:scale-[0.99] ' + (isMyVote ? 'border-rose-400' : 'border-gray-100')}
                    disabled={!!pollVote}>
                    <div className="relative h-9">
                      <div className="absolute inset-0 rounded-xl transition-all" style={{ width: pollVote ? `${pct}%` : '0%', backgroundColor: isMyVote ? '#FFF1F2' : '#F9FAFB' }} />
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className="text-[10px] font-bold text-gray-700">{opt.label}</span>
                        {pollVote && <span className="text-[10px] font-extrabold" style={{ color: isMyVote ? '#E11D48' : '#9CA3AF' }}>{pct}%</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!pollVote && <p className="text-[9px] text-gray-400 text-center mt-2">Tap to vote · {totalPollVotes.toLocaleString()} votes</p>}
            {pollVote && <p className="text-[9px] text-emerald-500 font-bold text-center mt-2">✓ Thanks for voting! · {totalPollVotes.toLocaleString()} total</p>}
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

        {/* ─── Posts ─── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">💬</span>
            <p className="text-sm text-gray-400 mt-2 font-bold">No posts yet in this category</p>
            <button onClick={() => setShowCompose(true)} className="mt-2 text-xs text-rose-500 font-bold active:scale-95 transition-transform">Be the first to ask →</button>
          </div>
        ) : (
          filtered.map(post => (
            <div key={post.id} className={'bg-white rounded-2xl shadow-sm overflow-hidden ' + (post.isPinned ? 'ring-1 ring-amber-200' : '')}>
              {post.isPinned && <div className="bg-amber-50 px-4 py-1 text-[8px] font-bold text-amber-600">📌 Pinned by Doctor</div>}
              <div className="p-4">
                {/* Category badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: catColor(post.category) }}>
                    {CATEGORIES.find(c => c.id === post.category)?.emoji} {post.category}
                  </span>
                </div>
                {/* Author */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + (post.isDoctor ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gray-100 text-gray-500')}>
                    {post.isDoctor ? '👩‍⚕️' : post.authorInitial}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{post.authorName}</span>
                      {post.isDoctor && <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">DOCTOR ✓</span>}
                    </div>
                    <span className="text-[9px] text-gray-400">{post.timestamp}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>
                {/* Actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => likePost(post.id)} className={'flex items-center gap-1 text-[10px] active:scale-95 transition-transform ' + (likedPosts.has(post.id) ? 'text-rose-500' : 'text-gray-400')}>
                    <span>{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                    <span className="font-bold">{post.likes}</span>
                  </button>
                  <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)} className="flex items-center gap-1 text-[10px] text-gray-500 active:scale-95 transition-transform">
                    <span>💬</span>
                    <span className="font-bold">{post.replies.length} replies</span>
                  </button>
                  <button onClick={() => toast('Share coming soon!')} className="flex items-center gap-1 text-[10px] text-gray-400 active:scale-95 transition-transform ml-auto">
                    <span>🔗</span>
                  </button>
                </div>
                {/* Replies */}
                {expandedPost === post.id && (
                  <div className="mt-3 space-y-2.5">
                    {post.replies.map(reply => (
                      <div key={reply.id} className={'rounded-xl p-3 ' + (reply.isDoctor ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50')}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={'text-[10px] font-bold ' + (reply.isDoctor ? 'text-emerald-700' : 'text-gray-600')}>{reply.authorName}</span>
                          {reply.isDoctor && <span className="text-[7px] font-bold bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded">✓ Verified Doctor</span>}
                          <span className="text-[9px] text-gray-400">{reply.timestamp}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{reply.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input value={replyText} onChange={e => setReplyText(e.target.value)}
                        placeholder={isAdminUnlocked ? 'Reply as ' + chief.name + '...' : 'Write a reply...'}
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
            <button onClick={submitPost} disabled={!newContent.trim()}
              className="w-full mt-4 py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899)' }}>
              Post {isAnon ? 'Anonymously' : 'as ' + (user?.fullName || 'User')}
            </button>
          </div>
        </div>
      )}

      <BottomNav communityBadge />
    </div>
  );
}
