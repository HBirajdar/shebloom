// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { articleAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ArticleDetailPage() {
  const nav = useNavigate();
  const { slug } = useParams();
  const user = useAuthStore(s => s.user);

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    articleAPI.get(slug).then(res => {
      const d = res.data.data || res.data;
      setArticle(d);
      setLikes(d.likes || 0);
      setDislikes(d.dislikes || 0);
      setUserReaction(d.userReaction || null);
      setIsBookmarked(d.isBookmarked || false);
      setComments(d.comments || []);
    }).catch(() => toast.error('Article not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
    if (!article) return;
    try {
      const res = await articleAPI.like(article.id, type);
      const d = res.data.data || res.data;
      setLikes(d.likes);
      setDislikes(d.dislikes);
      setUserReaction(d.userReaction);
    } catch { toast.error('Failed to react'); }
  };

  const handleBookmark = async () => {
    if (!article) return;
    try {
      const res = await articleAPI.bookmark(article.id);
      const d = res.data.data || res.data;
      setIsBookmarked(d.bookmarked);
      toast.success(d.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
    } catch { toast.error('Failed'); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !article) return;
    setCommentLoading(true);
    try {
      const res = await articleAPI.addComment(article.id, newComment.trim());
      const d = res.data.data || res.data;
      setComments(prev => [d, ...prev]);
      setNewComment('');
      toast.success('Comment added!');
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Failed to comment';
      toast.error(msg);
    }
    setCommentLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!article) return;
    try {
      await articleAPI.deleteComment(article.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch { toast.error('Failed'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <span className="text-5xl">📄</span>
        <p className="text-sm font-bold text-gray-400">Article not found</p>
        <button onClick={() => nav('/articles')} className="text-rose-500 text-xs font-bold">← Back to Articles</button>
      </div>
    );
  }

  const authorInitials = (article.authorName || 'VC').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
  const canComment = user?.role === 'DOCTOR' || user?.role === 'ADMIN';

  // Split content into paragraphs for rendering
  const contentParts = (article.content || '').split('\n').filter((l: string) => l.trim());

  return (
    <div className="min-h-screen bg-white pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/articles')} className="text-xl hover:text-rose-500 transition-colors">&#8592;</button>
        <h1 className="text-sm font-bold text-gray-800 flex-1 truncate">{article.title}</h1>
        <button onClick={handleBookmark} className="text-xl active:scale-90 transition-transform">
          {isBookmarked ? '🔖' : '📑'}
        </button>
      </div>

      <div className="px-5 pt-4">
        {/* Cover Image or Emoji Banner */}
        {article.coverImageUrl ? (
          <img src={article.coverImageUrl} alt={article.title} className="w-full h-48 object-cover rounded-2xl mb-6" />
        ) : (
          <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl h-40 flex items-center justify-center text-5xl mb-6">
            {article.emoji || '📝'}
          </div>
        )}

        {/* Category badge */}
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-600">{article.category}</span>

        {/* Title */}
        <h1 className="text-xl font-extrabold text-gray-900 mt-3 leading-tight">{article.title}</h1>

        {/* Author & Meta */}
        <div className="flex items-center gap-3 mt-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600">
            {article.doctor?.avatarUrl ? (
              <img src={article.doctor.avatarUrl} className="w-full h-full rounded-full object-cover" />
            ) : authorInitials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{article.authorName || 'VedaClue Team'}</p>
            <p className="text-xs text-gray-400">
              {article.readTimeMinutes || 5} min read
              {article.publishedAt && <> · {new Date(article.publishedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <span>👁</span> {article.viewCount || 0}
          </div>
        </div>

        {/* Like / Dislike Bar */}
        <div className="flex items-center gap-3 mt-4 mb-6">
          <button onClick={() => handleReaction('LIKE')}
            className={'flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold active:scale-95 transition-all border-2 ' +
              (userReaction === 'LIKE' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-600')}>
            <span className="text-base">👍</span> {likes}
          </button>
          <button onClick={() => handleReaction('DISLIKE')}
            className={'flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold active:scale-95 transition-all border-2 ' +
              (userReaction === 'DISLIKE' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 bg-gray-50 text-gray-600')}>
            <span className="text-base">👎</span> {dislikes}
          </button>
          <div className="flex-1" />
          <button onClick={handleBookmark}
            className={'px-4 py-2.5 rounded-2xl text-xs font-bold active:scale-95 transition-all border-2 ' +
              (isBookmarked ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-100 bg-gray-50 text-gray-600')}>
            {isBookmarked ? '🔖 Saved' : '📑 Save'}
          </button>
        </div>

        {/* Article Content */}
        <div className="text-sm text-gray-600 leading-relaxed space-y-3">
          {contentParts.map((para: string, i: number) =>
            para.startsWith('## ') ? (
              <h3 key={i} className="text-base font-bold text-gray-900 mt-4">{para.slice(3)}</h3>
            ) : para.startsWith('# ') ? (
              <h2 key={i} className="text-lg font-extrabold text-gray-900 mt-4">{para.slice(2)}</h2>
            ) : (
              <p key={i}>{para}</p>
            )
          )}
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-6">
            {article.tags.map((tag: string) => (
              <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">#{tag}</span>
            ))}
          </div>
        )}

        {/* ─── Comments Section ─── */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-extrabold text-gray-800 mb-4">
            💬 Doctor Comments ({comments.length})
          </h3>

          {/* Comment Input — only for DOCTOR / ADMIN */}
          {canComment && (
            <div className="flex gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {user?.fullName?.charAt(0) || 'D'}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a doctor's comment..."
                  className="flex-1 px-3 py-2 border-2 border-gray-100 rounded-xl text-xs focus:border-rose-400 focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 disabled:opacity-50">
                  {commentLoading ? '...' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {!canComment && (
            <p className="text-[10px] text-gray-400 mb-4 bg-gray-50 rounded-xl px-3 py-2">
              Only verified doctors can comment on articles
            </p>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">💬</span>
              <p className="text-xs text-gray-400 mt-2">No comments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                      {c.user?.fullName?.charAt(0) || 'D'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-800">{c.user?.fullName || 'Doctor'}</span>
                        {c.user?.role === 'DOCTOR' && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">Doctor</span>
                        )}
                        {c.user?.role === 'ADMIN' && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">Admin</span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {(c.user?.id === user?.id || user?.role === 'ADMIN') && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        className="text-[10px] text-red-400 font-bold active:scale-95">Delete</button>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed ml-9">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
