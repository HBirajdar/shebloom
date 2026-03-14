import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChiefDoctor } from '../hooks/useChiefDoctor';
import { programAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────
interface Program {
  id: string; title: string; subtitle: string; description: string;
  emoji: string; imageUrl: string | null; category: string;
  duration: string; durationDays: number;
  isFree: boolean; price: number; discountPrice: number | null;
  targetAudiences: string[]; doshaTypes: string[];
  difficulty: string; highlights: string[]; whatYouGet: string[];
  prerequisites: string | null; doctorName: string | null;
  status: string; isPublished: boolean; isFeatured: boolean;
  totalEnrolled: number; contentCount?: number; enrolledCount?: number;
  contents?: ProgramContent[];
}

interface ProgramContent {
  id: string; weekNumber: number; dayNumber: number | null; sortOrder: number;
  title: string; description: string | null; contentType: string;
  videoUrl: string | null; audioUrl: string | null; imageUrl: string | null;
  articleUrl: string | null; body: string | null; duration: number | null;
  instructions: string | null; isFree: boolean; isLocked: boolean;
}

interface Enrollment {
  id: string; programId: string; status: string;
  startDate: string; completedAt: string | null;
  isPaid: boolean; amountPaid: number;
  progress: { completed: string[]; currentWeek: number } | null;
  completedCount: number; lastAccessedAt: string | null;
  program?: Program;
}

const CATEGORIES = [
  { key: '', label: 'All', emoji: '\u2728' },
  { key: 'PCOD', label: 'PCOD', emoji: '\uD83C\uDF3F' },
  { key: 'FERTILITY', label: 'Fertility', emoji: '\uD83D\uDC95' },
  { key: 'MENOPAUSE', label: 'Menopause', emoji: '\uD83C\uDF43' },
  { key: 'CYCLE_SYNC', label: 'Cycle Sync', emoji: '\uD83C\uDF00' },
  { key: 'PREGNANCY', label: 'Pregnancy', emoji: '\uD83E\uDD30' },
  { key: 'WELLNESS', label: 'Wellness', emoji: '\uD83E\uDDD8' },
  { key: 'NUTRITION', label: 'Nutrition', emoji: '\uD83E\uDD57' },
  { key: 'YOGA', label: 'Yoga', emoji: '\uD83E\uDDD8\u200D\u2640\uFE0F' },
];

const CONTENT_ICONS: Record<string, string> = {
  video: '\uD83C\uDFA5', audio: '\uD83C\uDF99\uFE0F', article: '\uD83D\uDCDD',
  task: '\u2705', diet_plan: '\uD83E\uDD57', yoga: '\uD83E\uDDD8',
  live_class: '\uD83D\uDCF1', recipe: '\uD83C\uDF73', quiz: '\u2753',
};

type View = 'browse' | 'detail' | 'my_programs' | 'enrolled_detail' | 'content_view';

export default function ProgramsPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { chief } = useChiefDoctor();

  // ─── State ─────────────────────────────────────
  const [view, setView] = useState<View>('browse');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [searchQ, setSearchQ] = useState('');

  // Detail view
  const [selProgram, setSelProgram] = useState<Program | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // My programs
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  // Enrolled detail
  const [activeEnrollment, setActiveEnrollment] = useState<Enrollment | null>(null);
  const [enrolledProgram, setEnrolledProgram] = useState<(Program & { contents: ProgramContent[] }) | null>(null);

  // Content viewer
  const [activeContent, setActiveContent] = useState<ProgramContent | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Payment
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // ─── Fetch programs ────────────────────────────
  useEffect(() => {
    fetchPrograms();
  }, [category]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (category) params.category = category;
      const res = await programAPI.list(params);
      setPrograms(res.data?.data || res.data || []);
    } catch { toast.error('Failed to load programs'); }
    setLoading(false);
  };

  // ─── Fetch my enrollments ──────────────────────
  const fetchMyEnrollments = async () => {
    if (!user) { toast.error('Please login first'); nav('/auth'); return; }
    setMyLoading(true);
    try {
      const res = await programAPI.myEnrolled();
      setEnrollments(res.data?.data || res.data || []);
    } catch { toast.error('Failed to load enrollments'); }
    setMyLoading(false);
  };

  // ─── View program detail ──────────────────────
  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setView('detail');
    try {
      const res = await programAPI.get(id);
      setSelProgram(res.data?.data || res.data);
    } catch { toast.error('Failed to load program'); setView('browse'); }
    setDetailLoading(false);
  };

  // ─── Open enrolled detail ─────────────────────
  const openEnrolledDetail = async (programId: string) => {
    setView('enrolled_detail');
    setDetailLoading(true);
    try {
      const res = await programAPI.myEnrollment(programId);
      const data = res.data?.data || res.data;
      setActiveEnrollment(data);
      setEnrolledProgram(data.program);
    } catch { toast.error('Failed to load enrollment'); setView('my_programs'); }
    setDetailLoading(false);
  };

  // ─── Enroll (free) ────────────────────────────
  const handleFreeEnroll = async (programId: string) => {
    if (!user) { toast.error('Please login to enroll'); nav('/auth'); return; }
    setEnrolling(true);
    try {
      await programAPI.enroll(programId);
      toast.success('Enrolled successfully!');
      openEnrolledDetail(programId);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Enrollment failed';
      toast.error(msg);
    }
    setEnrolling(false);
  };

  // ─── Enroll (paid via Razorpay) ───────────────
  const handlePaidEnroll = async (program: Program) => {
    if (!user) { toast.error('Please login to enroll'); nav('/auth'); return; }
    if (!(window as any).Razorpay) {
      toast.error('Payment gateway is loading. Please wait and try again.');
      return;
    }
    setPaymentProcessing(true);
    try {
      const amount = program.discountPrice || program.price;
      const orderRes = await paymentAPI.createOrder({
        amount, productId: program.id, type: 'program',
      });
      const orderData = orderRes.data?.data || orderRes.data;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'VedaClue',
        description: `Program: ${program.title}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await paymentAPI.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await programAPI.enrollPaid(program.id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              amountPaid: amount,
            });
            toast.success('Payment successful! You are enrolled.');
            openEnrolledDetail(program.id);
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
          setPaymentProcessing(false);
        },
        prefill: { name: user.fullName || '', email: user.email || '', contact: user.phone || '' },
        theme: { color: '#7C3AED' },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
            toast('Payment cancelled', { icon: '\u26A0\uFE0F' });
          },
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => { setPaymentProcessing(false); toast.error('Payment failed'); });
      rzp.open();
    } catch (err: any) {
      setPaymentProcessing(false);
      toast.error(err.response?.data?.error || 'Payment setup failed');
    }
  };

  // ─── Mark content complete ────────────────────
  const markComplete = async (contentId: string) => {
    if (!activeEnrollment) return;
    try {
      const res = await programAPI.markProgress({ programId: activeEnrollment.programId, contentId });
      const data = res.data?.data || res.data;
      setActiveEnrollment(data);
      toast.success(res.data?.message || 'Progress saved!');
    } catch { toast.error('Failed to save progress'); }
  };

  // ─── Leave program ───────────────────────────
  const handleLeave = async (programId: string) => {
    if (!confirm('Are you sure you want to leave this program?')) return;
    try {
      await programAPI.leave(programId);
      toast.success('Program cancelled');
      setView('my_programs');
      fetchMyEnrollments();
    } catch { toast.error('Failed to leave program'); }
  };

  const isCompleted = (contentId: string) => {
    const completed = (activeEnrollment?.progress as any)?.completed || [];
    return completed.includes(contentId);
  };

  const progressPercent = () => {
    if (!activeEnrollment || !enrolledProgram?.contents?.length) return 0;
    const done = (activeEnrollment.progress as any)?.completed?.length || 0;
    return Math.round((done / enrolledProgram.contents.length) * 100);
  };

  // ─── Filter programs by search ────────────────
  const filtered = programs.filter(p =>
    !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQ.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQ.toLowerCase())
  );

  // ═══════════════════════════════════════════════
  // CONTENT VIEWER
  // ═══════════════════════════════════════════════
  if (view === 'content_view' && activeContent) {
    const c = activeContent;
    return (
      <div className="min-h-screen bg-white pb-10">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => { setActiveContent(null); setView('enrolled_detail'); }}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-gray-900 truncate">{c.title}</h1>
            <p className="text-[9px] text-gray-400">{CONTENT_ICONS[c.contentType] || '\uD83D\uDCCC'} {c.contentType.replace('_', ' ')}</p>
          </div>
          {!isCompleted(c.id) && (
            <button onClick={() => markComplete(c.id)}
              className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full active:scale-95">
              Mark Done
            </button>
          )}
          {isCompleted(c.id) && (
            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full">{'\u2713'} Done</span>
          )}
        </div>

        <div className="px-5 pt-5 space-y-4">
          {/* Video Player */}
          {c.videoUrl && (
            <div className="rounded-2xl overflow-hidden bg-black aspect-video">
              <video src={c.videoUrl} controls className="w-full h-full" controlsList="nodownload" playsInline />
            </div>
          )}

          {/* Audio Player */}
          {c.audioUrl && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{'\uD83C\uDF99\uFE0F'}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{c.title}</p>
                  {c.duration && <p className="text-[10px] text-gray-400">{c.duration} min</p>}
                </div>
              </div>
              <audio ref={audioRef} src={c.audioUrl} controls className="w-full" controlsList="nodownload" />
            </div>
          )}

          {/* Image */}
          {c.imageUrl && !c.videoUrl && (
            <img src={c.imageUrl} alt={c.title} className="w-full rounded-2xl object-cover max-h-72" />
          )}

          {/* Description */}
          {c.description && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-700 leading-relaxed">{c.description}</p>
            </div>
          )}

          {/* Body / Article content */}
          {c.body && (
            <div className="prose prose-sm max-w-none">
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{c.body}</div>
            </div>
          )}

          {/* Instructions */}
          {c.instructions && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <h3 className="text-xs font-bold text-amber-800 mb-2">{'\uD83D\uDCCB'} Instructions</h3>
              <p className="text-xs text-amber-700 leading-relaxed whitespace-pre-wrap">{c.instructions}</p>
            </div>
          )}

          {/* External article link */}
          {c.articleUrl && (
            <a href={c.articleUrl} target="_blank" rel="noopener noreferrer"
              className="block bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
              <p className="text-xs font-bold text-blue-700">Read Full Article {'\u2192'}</p>
            </a>
          )}

          {/* Complete button at bottom */}
          {!isCompleted(c.id) && (
            <button onClick={() => markComplete(c.id)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm active:scale-95 shadow-lg">
              {'\u2713'} Mark as Complete
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ENROLLED DETAIL (with content list + progress)
  // ═══════════════════════════════════════════════
  if (view === 'enrolled_detail') {
    if (detailLoading) return <LoadingScreen onBack={() => setView('my_programs')} />;
    if (!enrolledProgram || !activeEnrollment) return null;
    const p = enrolledProgram;
    const pct = progressPercent();
    const completed = (activeEnrollment.progress as any)?.completed || [];

    // Group contents by week
    const weekMap = new Map<number, ProgramContent[]>();
    (p.contents || []).forEach(c => {
      const w = c.weekNumber || 1;
      if (!weekMap.has(w)) weekMap.set(w, []);
      weekMap.get(w)!.push(c);
    });
    const weeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);

    return (
      <div className="min-h-screen pb-10" style={{ backgroundColor: '#FAFAF9' }}>
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => { setView('my_programs'); fetchMyEnrollments(); }}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-gray-900 truncate">{p.title}</h1>
            <p className="text-[9px] text-gray-400">{activeEnrollment.status === 'COMPLETED' ? '\u2705 Completed' : `${pct}% complete`}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{p.emoji}</span>
              <span className="text-xl font-extrabold text-purple-600">{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {completed.length} of {p.contents?.length || 0} activities completed
            </p>
            {activeEnrollment.status === 'COMPLETED' && (
              <div className="mt-3 bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-emerald-600">{'\uD83C\uDF89'} Congratulations! Program completed!</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly content */}
        <div className="px-5 pt-4 space-y-4">
          {weeks.map(([weekNum, contents]) => {
            const weekCompleted = contents.filter(c => completed.includes(c.id)).length;
            const allDone = weekCompleted === contents.length;
            return (
              <div key={weekNum} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className={`px-4 py-3 border-b border-gray-50 flex items-center justify-between ${allDone ? 'bg-emerald-50' : 'bg-purple-50'}`}>
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${allDone ? 'text-emerald-600' : 'text-purple-600'}`}>
                      Week {weekNum}
                    </p>
                    <p className="text-[10px] text-gray-400">{weekCompleted}/{contents.length} done</p>
                  </div>
                  {allDone && <span className="text-lg">{'\u2705'}</span>}
                </div>
                <div className="divide-y divide-gray-50">
                  {contents.map(c => {
                    const done = completed.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => { setActiveContent(c); setView('content_view'); }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0
                          ${done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                          {done ? '\u2713' : (CONTENT_ICONS[c.contentType] || '\uD83D\uDCCC')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {c.title}
                          </p>
                          <p className="text-[9px] text-gray-400">
                            {c.contentType.replace('_', ' ')}
                            {c.duration ? ` \u2022 ${c.duration} min` : ''}
                            {c.dayNumber ? ` \u2022 Day ${c.dayNumber}` : ''}
                          </p>
                        </div>
                        <span className="text-gray-300 text-xs">{'\u203A'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leave program */}
        {activeEnrollment.status === 'ACTIVE' && (
          <div className="px-5 pt-6">
            <button onClick={() => handleLeave(activeEnrollment.programId)}
              className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-xs active:scale-95">
              Leave Program
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // MY PROGRAMS
  // ═══════════════════════════════════════════════
  if (view === 'my_programs') {
    return (
      <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
          <button onClick={() => setView('browse')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
          <h1 className="text-base font-extrabold text-gray-900">My Programs</h1>
        </div>

        <div className="px-5 pt-4 space-y-3">
          {myLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl block mb-3">{'\uD83D\uDCDA'}</span>
              <p className="text-sm font-bold text-gray-600">No programs yet</p>
              <p className="text-xs text-gray-400 mt-1">Browse and enroll in a program to get started!</p>
              <button onClick={() => setView('browse')}
                className="mt-4 px-6 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-full active:scale-95">
                Browse Programs
              </button>
            </div>
          ) : enrollments.map(e => {
            const prog = e.program;
            if (!prog) return null;
            const done = (e.progress as any)?.completed?.length || 0;
            const statusColors: Record<string, string> = {
              ACTIVE: 'bg-emerald-100 text-emerald-600',
              COMPLETED: 'bg-blue-100 text-blue-600',
              PAUSED: 'bg-amber-100 text-amber-600',
              CANCELLED: 'bg-gray-100 text-gray-400',
            };
            return (
              <button key={e.id} onClick={() => openEnrolledDetail(e.programId)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-xl flex-shrink-0">
                    {prog.emoji || '\uD83D\uDCDA'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-gray-800 truncate">{prog.title}</h3>
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[e.status] || ''}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{prog.subtitle}</p>
                    {e.status === 'ACTIVE' && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${e.completedCount > 0 ? Math.min(100, (e.completedCount / (prog.contentCount || prog.contents?.length || 1)) * 100) : 0}%` }} />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1">{done} activities completed</p>
                      </div>
                    )}
                  </div>
                  <span className="text-gray-300">{'\u203A'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PROGRAM DETAIL
  // ═══════════════════════════════════════════════
  if (view === 'detail') {
    if (detailLoading || !selProgram) return <LoadingScreen onBack={() => setView('browse')} />;
    const p = selProgram;
    const price = p.discountPrice || p.price;
    const hasDiscount = p.discountPrice && p.discountPrice < p.price;

    // Group contents by week for outline
    const weekMap = new Map<number, ProgramContent[]>();
    (p.contents || []).forEach(c => {
      const w = c.weekNumber || 1;
      if (!weekMap.has(w)) weekMap.set(w, []);
      weekMap.get(w)!.push(c);
    });
    const weeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);

    return (
      <div className="min-h-screen pb-10" style={{ backgroundColor: '#FAFAF9' }}>
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => { setSelProgram(null); setView('browse'); }}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-gray-900 truncate">{p.title}</h1>
            <p className="text-[9px] text-gray-400">{p.duration}</p>
          </div>
        </div>

        {/* Hero */}
        <div className="px-5 pt-5">
          {p.imageUrl ? (
            <div className="rounded-2xl overflow-hidden relative h-44">
              <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <span className="text-3xl">{p.emoji}</span>
                <h2 className="text-lg font-extrabold mt-1">{p.title}</h2>
                <p className="text-[10px] text-white/80">{p.subtitle}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5 text-white relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-500">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full" />
              <span className="text-4xl">{p.emoji}</span>
              <h2 className="text-xl font-extrabold mt-2">{p.title}</h2>
              <p className="text-xs text-white/80 mt-1">{p.subtitle}</p>
            </div>
          )}
        </div>

        <div className="px-5 pt-4 space-y-4">
          {/* Quick stats */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-lg font-extrabold text-purple-600">{p.contentCount || p.contents?.length || 0}</p>
              <p className="text-[9px] text-gray-400">Activities</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-lg font-extrabold text-pink-600">{p.totalEnrolled || 0}</p>
              <p className="text-[9px] text-gray-400">Enrolled</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
              <p className="text-lg font-extrabold text-emerald-600">{p.duration || `${p.durationDays}d`}</p>
              <p className="text-[9px] text-gray-400">Duration</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {p.isFree ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-emerald-600">FREE</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">No payment needed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-gray-900">{'\u20B9'}{price}</span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">{'\u20B9'}{p.price}</span>
                )}
                {hasDiscount && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    {Math.round(((p.price - p.discountPrice!) / p.price) * 100)}% OFF
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 mb-2">About this program</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{p.description}</p>
          </div>

          {/* Highlights */}
          {p.highlights?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 mb-2">{'\u2728'} Highlights</h3>
              <div className="space-y-2">
                {p.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-purple-500 text-xs mt-0.5">{'\u2713'}</span>
                    <p className="text-xs text-gray-600">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What you get */}
          {p.whatYouGet?.length > 0 && (
            <div className="bg-purple-50 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-purple-700 mb-2">{'\uD83C\uDF81'} What You Get</h3>
              <div className="space-y-2">
                {p.whatYouGet.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-purple-500 text-xs mt-0.5">{'\u2022'}</span>
                    <p className="text-xs text-purple-700">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content outline */}
          {weeks.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                <h3 className="text-xs font-bold text-gray-900">{'\uD83D\uDCCB'} Program Content</h3>
              </div>
              {weeks.map(([weekNum, contents]) => (
                <div key={weekNum}>
                  <div className="px-4 py-2 bg-purple-50/50">
                    <p className="text-[9px] font-bold text-purple-600 uppercase">Week {weekNum} ({contents.length} items)</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {contents.map(c => (
                      <div key={c.id} className="px-4 py-2.5 flex items-center gap-2.5">
                        <span className="text-sm">{CONTENT_ICONS[c.contentType] || '\uD83D\uDCCC'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-700 truncate">{c.title}</p>
                          <p className="text-[9px] text-gray-400">
                            {c.contentType.replace('_', ' ')}
                            {c.duration ? ` \u2022 ${c.duration} min` : ''}
                          </p>
                        </div>
                        {c.isFree && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">FREE</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prerequisites */}
          {p.prerequisites && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <h3 className="text-xs font-bold text-amber-800 mb-1">{'\u26A0\uFE0F'} Prerequisites</h3>
              <p className="text-xs text-amber-700">{p.prerequisites}</p>
            </div>
          )}

          {/* Doctor info */}
          {(p.doctorName || chief.name) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">{'\uD83D\uDC69\u200D\u2695\uFE0F'}</div>
              <div>
                <p className="text-xs font-bold text-gray-900">By {p.doctorName || chief.name}</p>
                <p className="text-[10px] text-gray-400">Program Creator</p>
              </div>
            </div>
          )}

          {/* Target audiences / Dosha */}
          {(p.targetAudiences?.length > 0 || p.doshaTypes?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {p.targetAudiences?.map((t, i) => (
                <span key={i} className="text-[9px] bg-pink-50 text-pink-600 px-2 py-1 rounded-full font-medium">{t}</span>
              ))}
              {p.doshaTypes?.map((d, i) => (
                <span key={i} className="text-[9px] bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">{d} dosha</span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="sticky bottom-4">
            {p.isFree ? (
              <button onClick={() => handleFreeEnroll(p.id)} disabled={enrolling}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm active:scale-95 shadow-lg disabled:opacity-60">
                {enrolling ? 'Enrolling...' : 'Enroll for Free'}
              </button>
            ) : (
              <button onClick={() => handlePaidEnroll(p)} disabled={paymentProcessing}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm active:scale-95 shadow-lg disabled:opacity-60">
                {paymentProcessing ? 'Processing...' : `Enroll Now \u2022 \u20B9${price}`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // BROWSE (main list)
  // ═══════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-gray-900">Wellness Programs</h1>
          <p className="text-[9px] text-gray-400">Doctor-designed protocols for real results</p>
        </div>
        {user && (
          <button onClick={() => { setView('my_programs'); fetchMyEnrollments(); }}
            className="px-3 py-1.5 bg-purple-100 text-purple-600 text-[10px] font-bold rounded-full active:scale-95">
            My Programs
          </button>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Hero banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <h2 className="text-lg font-extrabold">Transform Your Health</h2>
          <p className="text-xs text-white/80 mt-1">
            Structured programs combining Ayurveda + modern science.
            {chief.name ? ` Designed by ${chief.name}.` : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input type="text" placeholder="Search programs..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
            className="w-full bg-white rounded-xl px-4 py-2.5 pl-9 text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-200" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">{'\uD83D\uDD0D'}</span>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all
                ${category === c.key ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100'}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Programs list */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">{'\uD83D\uDCDA'}</span>
            <p className="text-sm font-bold text-gray-600">No programs found</p>
            <p className="text-xs text-gray-400 mt-1">
              {category ? 'Try a different category' : 'Programs will be available soon!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <button key={p.id} onClick={() => openDetail(p.id)}
                className="w-full bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform">
                {p.imageUrl && (
                  <img src={p.imageUrl} alt={p.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {!p.imageUrl && (
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {p.emoji || '\uD83D\uDCDA'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {p.imageUrl && <span className="text-lg">{p.emoji}</span>}
                        <h3 className="text-sm font-extrabold text-gray-800 truncate">{p.title}</h3>
                        {p.isFeatured && (
                          <span className="text-[7px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{'\u2B50'} Featured</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{p.subtitle}</p>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                          {'\u23F1'} {p.duration || `${p.durationDays} days`}
                        </span>
                        {p.isFree ? (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">FREE</span>
                        ) : (
                          <span className="text-[9px] font-bold bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">
                            {'\u20B9'}{p.discountPrice || p.price}
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400">
                          {p.contentCount || 0} activities \u2022 {p.totalEnrolled || 0} enrolled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading placeholder ────────────────────────
function LoadingScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center gap-2.5">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
      </div>
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    </div>
  );
}
