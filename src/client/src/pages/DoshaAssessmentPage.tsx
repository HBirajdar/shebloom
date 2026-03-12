import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doshaAPI } from '../services/api';

interface Question {
  id: string;
  questionText: string;
  questionCategory: string;
  options: { label: string; vataScore: number; pittaScore: number; kaphaScore: number }[];
  orderIndex: number;
}

interface DoshaResult {
  primaryDosha: string;
  primaryDoshaType: string;
  secondaryDosha: string | null;
  vataScore: number;
  pittaScore: number;
  kaphaScore: number;
  confidence: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  body_type: 'Body Constitution',
  digestion: 'Digestion & Appetite',
  sleep: 'Sleep Patterns',
  stress: 'Stress Response',
  menstrual: 'Menstrual Health',
  emotional: 'Emotional Tendencies',
  energy: 'Energy & Activity',
  appetite: 'Thirst & Hunger',
  climate: 'Climate Preference',
  mental: 'Mental Activity',
  speech: 'Speech & Voice',
  movement: 'Movement Style',
};

const DOSHA_INFO: Record<string, { emoji: string; color: string; bg: string; element: string }> = {
  Vata: { emoji: '🌬️', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', element: 'Air + Ether' },
  Pitta: { emoji: '🔥', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', element: 'Fire + Water' },
  Kapha: { emoji: '🌿', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', element: 'Earth + Water' },
  'Vata-Pitta': { emoji: '🌬️🔥', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', element: 'Air + Fire' },
  'Pitta-Kapha': { emoji: '🔥🌿', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', element: 'Fire + Earth' },
  'Vata-Kapha': { emoji: '🌬️🌿', color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', element: 'Air + Earth' },
  Tridoshic: { emoji: '☯️', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', element: 'All Elements' },
};

export default function DoshaAssessmentPage() {
  const nav = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DoshaResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    doshaAPI.getQuestions().then(r => {
      setQuestions(r.data.data || []);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load questions');
      setLoading(false);
    });
  }, []);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + (answers[currentQ?.id] !== undefined ? 1 : 0)) / questions.length) * 100 : 0;
  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined);

  const selectOption = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionIndex }));
    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const answerList = questions.map(q => ({
        questionId: q.id,
        selectedOptionIndex: answers[q.id] ?? 0,
      }));
      const res = await doshaAPI.submitAssessment(answerList, 'SELF_FULL');
      setResult(res.data.data.result);
      // Clear old localStorage dosha
      localStorage.removeItem('sb_dosha');
    } catch {
      setError('Failed to submit assessment');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );

  // ─── Result Screen ──────────────────────────────────
  if (result) {
    const info = DOSHA_INFO[result.primaryDosha] || DOSHA_INFO.Vata;
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 p-4">
        <div className="max-w-md mx-auto">
          <div className={`${info.bg} border rounded-2xl p-6 text-center mb-4`}>
            <div className="text-5xl mb-3">{info.emoji}</div>
            <h1 className={`text-2xl font-bold ${info.color} mb-1`}>Your Prakriti: {result.primaryDosha}</h1>
            <p className="text-sm text-gray-500 mb-4">{info.element}</p>
            {result.secondaryDosha && (
              <p className="text-sm text-gray-600 mb-3">Secondary: {result.secondaryDosha}</p>
            )}
            <p className="text-xs text-gray-400">Confidence: {result.confidence}%</p>
          </div>

          {/* Score Breakdown */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">Dosha Score Breakdown</h2>
            {[
              { name: 'Vata', score: result.vataScore, color: 'bg-indigo-500', emoji: '🌬️' },
              { name: 'Pitta', score: result.pittaScore, color: 'bg-orange-500', emoji: '🔥' },
              { name: 'Kapha', score: result.kaphaScore, color: 'bg-emerald-500', emoji: '🌿' },
            ].map(d => (
              <div key={d.name} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{d.emoji} {d.name}</span>
                  <span className="font-medium">{d.score}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`${d.color} h-2.5 rounded-full transition-all`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <p className="text-sm text-gray-600">
              Your Ayurvedic recommendations on the Dashboard are now personalized to your <strong>{result.primaryDosha}</strong> constitution.
              {result.confidence < 60 && (
                <span className="block mt-2 text-amber-600">For more accurate results, consult with a doctor who can verify your Prakriti through clinical assessment.</span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => nav('/dashboard')} className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-medium">
              Go to Dashboard
            </button>
            <button onClick={() => { setResult(null); setAnswers({}); setCurrentIndex(0); }} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
              Retake
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-500 mb-3">{error}</p>
        <button onClick={() => nav(-1)} className="text-rose-500 underline">Go Back</button>
      </div>
    </div>
  );

  if (!currentQ) return null;

  const category = CATEGORY_LABELS[currentQ.questionCategory] || currentQ.questionCategory;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 flex flex-col">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => currentIndex > 0 ? setCurrentIndex(currentIndex - 1) : nav(-1)} className="text-gray-400 text-sm">
            {currentIndex > 0 ? '← Back' : '← Exit'}
          </button>
          <span className="text-xs text-gray-400">{currentIndex + 1} / {questions.length}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
          <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-rose-400 font-medium">{category}</p>
      </div>

      {/* Question */}
      <div className="flex-1 p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 leading-snug">{currentQ.questionText}</h2>

        <div className="space-y-3 flex-1">
          {currentQ.options.map((opt, i) => {
            const selected = answers[currentQ.id] === i;
            return (
              <button
                key={i}
                onClick={() => selectOption(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-rose-400 bg-rose-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <span className={`text-sm ${selected ? 'text-rose-700 font-medium' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6 pt-4">
          {currentIndex > 0 && (
            <button onClick={() => setCurrentIndex(currentIndex - 1)} className="px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
              Previous
            </button>
          )}
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              disabled={answers[currentQ.id] === undefined}
              className="flex-1 py-3 rounded-xl text-sm font-medium bg-rose-500 text-white disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!allAnswered || submitting}
              className="flex-1 py-3 rounded-xl text-sm font-medium bg-rose-500 text-white disabled:opacity-40"
            >
              {submitting ? 'Analyzing...' : 'See My Prakriti'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
