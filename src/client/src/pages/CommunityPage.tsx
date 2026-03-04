import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
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
  { id: 'all', label: 'All', emoji: '\u{1F30D}' },
  { id: 'periods', label: 'Periods', emoji: '\u{1FA78}' },
  { id: 'pcod', label: 'PCOD/PCOS', emoji: '\u{1F33F}' },
  { id: 'fertility', label: 'Fertility', emoji: '\u{1F495}' },
  { id: 'pregnancy', label: 'Pregnancy', emoji: '\u{1F930}' },
  { id: 'menopause', label: 'Menopause', emoji: '\u{1F343}' },
  { id: 'mental', label: 'Mental Health', emoji: '\u{1F9E0}' },
  { id: 'ayurveda', label: 'Ayurveda', emoji: '\u{1F33F}' },
  { id: 'hair', label: 'Hair & Skin', emoji: '\u2728' },
  { id: 'ask_doctor', label: 'Ask Doctor', emoji: '\u{1F469}\u200D\u2695\uFE0F' },
];

const defaultPosts: Post[] = [
  { id: 'p1', category: 'pcod', content: 'I was diagnosed with PCOD 6 months ago. Started Shatavari and changed my diet — no sugar, no dairy. My periods are becoming regular for the first time in 3 years! Don\'t lose hope, sisters.', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 47, timestamp: '2h ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r1', content: 'This is wonderful progress! Shatavari combined with dietary changes is very effective for PCOD. I recommend also adding 30 minutes of walking daily and avoiding processed foods. Keep going!', authorName: 'Dr. Shruti', isDoctor: true, timestamp: '1h ago' },
      { id: 'r2', content: 'Same here! 4 months in and my cycle is now 32 days instead of 45+. Diet change was the game changer for me.', authorName: 'Anonymous', isDoctor: false, timestamp: '1h ago' },
    ]},
  { id: 'p2', category: 'periods', content: 'Does anyone else get terrible cramps on day 2? I\'ve tried everything — hot water bottles, painkillers, nothing helps for more than an hour. Any ayurvedic remedies that actually work?', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 32, timestamp: '4h ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r3', content: 'Ajwain water is magic! Boil 1 tbsp ajwain in water, sip warm. Works in 15-20 minutes for me. Also try castor oil pack on lower abdomen with a hot water bottle.', authorName: 'Anonymous', isDoctor: false, timestamp: '3h ago' },
      { id: 'r4', content: 'Severe cramps that don\'t respond to painkillers should be evaluated. It could be endometriosis. Please book a consultation and we can discuss your specific situation.', authorName: 'Dr. Shruti', isDoctor: true, timestamp: '2h ago' },
    ]},
  { id: 'p3', category: 'ask_doctor', content: 'Dr. Shruti, is it safe to take Ashwagandha while trying to conceive? My husband and I have been trying for 8 months.', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 28, timestamp: '6h ago', isDoctor: false, isPinned: true,
    replies: [
      { id: 'r5', content: 'Yes, Ashwagandha is safe and actually beneficial when TTC. It reduces cortisol (stress hormone) which is one of the top causes of unexplained infertility. I recommend 500mg twice daily for both partners. For you specifically, combine it with Shatavari. Please request a callback so I can create a personalized fertility protocol for you.', authorName: 'Dr. Shruti', isDoctor: true, timestamp: '5h ago' },
    ]},
  { id: 'p4', category: 'pregnancy', content: 'Just found out I\'m pregnant! 6 weeks along. Feeling nauseous all day. Any tips from moms who\'ve been through this? First time pregnancy and I\'m nervous.', anonymous: false, authorName: 'Priya M.', authorInitial: 'P', likes: 53, timestamp: '8h ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r6', content: 'Congratulations! Ginger tea with honey helped me a lot. Also eat small meals every 2-3 hours instead of 3 big meals. It gets better after week 12 for most women!', authorName: 'Meera K.', isDoctor: false, timestamp: '7h ago' },
      { id: 'r7', content: 'Congratulations! Nausea in first trimester is actually a good sign — it means your hormones are strong. Try ginger, vitamin B6, and keep dry crackers by your bedside for morning sickness. Start prenatal vitamins with folic acid immediately if you haven\'t already.', authorName: 'Dr. Shruti', isDoctor: true, timestamp: '6h ago' },
    ]},
  { id: 'p5', category: 'mental', content: 'I feel so anxious and irritable for 10 days before my period every month. It affects my work and relationships. Is this normal or should I be worried?', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 41, timestamp: '1d ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r8', content: '10 days of severe PMS symptoms could indicate PMDD (Premenstrual Dysphoric Disorder). This is a real medical condition, not "just PMS." Magnesium supplements, evening primrose oil, and reducing caffeine can help. If symptoms are affecting your daily life, please consult — there are effective treatments available.', authorName: 'Dr. Shruti', isDoctor: true, timestamp: '22h ago' },
    ]},
  { id: 'p6', category: 'menopause', content: 'I\'m 47 and my periods have become irregular — sometimes 20 days, sometimes 45. Getting hot flashes at night. Is this perimenopause? What should I do?', anonymous: true, authorName: 'Anonymous', authorInitial: 'A', likes: 19, timestamp: '1d ago', isDoctor: false, isPinned: false,
    replies: [
      { id: 'r9', content: 'Yes, this sounds like perimenopause. It\'s completely normal and can start from age 40-45. Shatavari is excellent for managing symptoms naturally. For hot flashes, try keeping the room cool and avoid spicy food and caffeine. This transition can last 4-10 years. You\'re not alone — let\'s talk more in a consultation.', authorName: 'Dr. Shruti', isDoctor: true, timestamp: '20h ago' },
    ]},
];

export default function CommunityPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { getChiefDoctor, isAdminUnlocked } = useAyurvedaStore();
  const chief = getChiefDoctor();

  const [cat, setCat] = useState('all');
  const [posts, setPosts] = useState<Post[]>(defaultPosts);
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCat, setNewCat] = useState('periods');
  const [isAnon, setIsAnon] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQ, setSearchQ] = useState('');

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
    toast.success('Posted! Dr. Shruti reviews posts daily.');
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

  const likePost = (id: string) => setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));

  const catEmoji = (c: string) => CATEGORIES.find(x => x.id === c)?.emoji || '\u{1F4AC}';

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Community {'\u{1F4AC}'}</h1>
              <p className="text-[9px] text-gray-400">Safe space. Anonymous. Doctor-verified.</p>
            </div>
          </div>
          <button onClick={() => setShowCompose(true)}
            className="text-[10px] font-bold text-white bg-rose-500 px-3 py-1.5 rounded-full active:scale-95 shadow-sm">+ Ask</button>
        </div>
        {/* Categories */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all flex-shrink-0 ' + (cat === c.id ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500')}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u{1F50D}'}</span>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search discussions..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs outline-none bg-white focus:border-rose-400" />
        </div>

        {/* Community Guidelines */}
        {cat === 'all' && !searchQ && (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <span>{'\u{1F91D}'}</span>
              <h3 className="text-xs font-bold text-rose-800">Welcome to SheBloom Community</h3>
            </div>
            <p className="text-[10px] text-rose-700 leading-relaxed">A safe, anonymous space for women to share, ask, and support each other. {chief.name} personally reviews and answers questions daily. Be kind, be supportive.</p>
          </div>
        )}

        {/* Posts */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">{'\u{1F4AC}'}</span>
            <p className="text-sm text-gray-400 mt-2 font-bold">No posts yet in this category</p>
            <button onClick={() => setShowCompose(true)} className="mt-2 text-xs text-rose-500 font-bold">Be the first to ask {'\u2192'}</button>
          </div>
        ) : (
          filtered.map(post => (
            <div key={post.id} className={'bg-white rounded-2xl shadow-sm overflow-hidden ' + (post.isPinned ? 'ring-1 ring-amber-200' : '')}>
              {post.isPinned && <div className="bg-amber-50 px-4 py-1 text-[8px] font-bold text-amber-600">{'\u{1F4CC}'} Pinned by Doctor</div>}
              <div className="p-4">
                {/* Author */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + (post.isDoctor ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gray-100 text-gray-500')}>
                    {post.isDoctor ? '\u{1F469}\u200D\u2695\uFE0F' : post.authorInitial}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{post.authorName}</span>
                      {post.isDoctor && <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">DOCTOR</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-gray-400">{post.timestamp}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{catEmoji(post.category)} {post.category}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => likePost(post.id)} className="flex items-center gap-1 text-[10px] text-gray-500 active:scale-95">
                    <span>{'\u2764\uFE0F'}</span> <span className="font-bold">{post.likes}</span>
                  </button>
                  <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)} className="flex items-center gap-1 text-[10px] text-gray-500 active:scale-95">
                    <span>{'\u{1F4AC}'}</span> <span className="font-bold">{post.replies.length} replies</span>
                  </button>
                </div>

                {/* Replies */}
                {expandedPost === post.id && (
                  <div className="mt-3 space-y-2.5">
                    {post.replies.map(reply => (
                      <div key={reply.id} className={'rounded-xl p-3 ' + (reply.isDoctor ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50')}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={'text-[10px] font-bold ' + (reply.isDoctor ? 'text-emerald-700' : 'text-gray-600')}>{reply.authorName}</span>
                          {reply.isDoctor && <span className="text-[7px] font-bold bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded">{'\u2713'} Verified Doctor</span>}
                          <span className="text-[9px] text-gray-400">{reply.timestamp}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{reply.content}</p>
                      </div>
                    ))}
                    {/* Reply input */}
                    <div className="flex gap-2">
                      <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={isAdminUnlocked ? 'Reply as ' + chief.name + '...' : 'Write a reply...'}
                        onKeyDown={e => { if (e.key === 'Enter') submitReply(post.id); }}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:border-rose-400 focus:outline-none" />
                      <button onClick={() => submitReply(post.id)} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold active:scale-95">{'\u2192'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCompose(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Share or Ask</h3>
            <p className="text-xs text-gray-400 mb-4">{chief.name} reviews all posts daily</p>

            {/* Category */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <button key={c.id} onClick={() => setNewCat(c.id)}
                  className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold ' + (newCat === c.id ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500')}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="What's on your mind? Ask a question, share your experience, or seek support..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none resize-none" rows={5} autoFocus />

            {/* Anonymous toggle */}
            <button onClick={() => setIsAnon(!isAnon)} className="flex items-center gap-2 mt-3 py-2">
              <div className={'w-10 h-5 rounded-full transition-colors flex items-center ' + (isAnon ? 'bg-rose-500 justify-end' : 'bg-gray-300 justify-start')}>
                <div className="w-4 h-4 bg-white rounded-full shadow mx-0.5" />
              </div>
              <span className="text-xs font-bold text-gray-700">{isAnon ? 'Anonymous' : 'Show my name'}</span>
              {isAnon && <span className="text-[9px] text-gray-400">Your identity is hidden</span>}
            </button>

            <button onClick={submitPost} disabled={!newContent.trim()}
              className="w-full mt-4 py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #E11D48, #EC4899)' }}>
              Post {isAnon ? 'Anonymously' : 'as ' + (user?.fullName || 'User')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
