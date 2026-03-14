import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { analyticsAPI } from '../services/api';

const NPS_STORAGE_KEY = 'vedaclue_last_nps';
const NPS_COOLDOWN_DAYS = 90;
const ACCOUNT_AGE_MIN_DAYS = 7;

function getScoreColor(score: number): string {
  if (score <= 6) return 'bg-red-500 hover:bg-red-600';
  if (score <= 8) return 'bg-yellow-500 hover:bg-yellow-600';
  return 'bg-green-500 hover:bg-green-600';
}

function getScoreRing(score: number): string {
  if (score <= 6) return 'ring-red-300';
  if (score <= 8) return 'ring-yellow-300';
  return 'ring-green-300';
}

export default function NpsPopup() {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  const [visible, setVisible] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const shouldShow = useCallback(() => {
    if (!isAuthenticated || !user) return false;

    // Don't show on admin or doctor dashboard pages
    const path = location.pathname;
    if (path.startsWith('/admin') || path.startsWith('/doctor-dashboard')) return false;

    // Check cooldown (90 days since last NPS)
    const lastNps = localStorage.getItem(NPS_STORAGE_KEY);
    if (lastNps) {
      const daysSince = (Date.now() - Number(lastNps)) / (1000 * 60 * 60 * 24);
      if (daysSince < NPS_COOLDOWN_DAYS) return false;
    }

    return true;
  }, [isAuthenticated, user, location.pathname]);

  useEffect(() => {
    if (!shouldShow()) return;

    // Show after a short delay so the page loads first
    const timer = setTimeout(() => {
      setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [shouldShow]);

  const handleDismiss = () => {
    setFadeOut(true);
    setTimeout(() => setVisible(false), 300);
  };

  const handleSubmit = async () => {
    if (selectedScore === null || submitting) return;
    setSubmitting(true);
    try {
      await analyticsAPI.submitNps({
        score: selectedScore,
        feedback: feedback.trim() || undefined,
        page: location.pathname,
      });
      localStorage.setItem(NPS_STORAGE_KEY, String(Date.now()));
      setSubmitted(true);
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setVisible(false), 300);
      }, 2000);
    } catch {
      // Silent fail — don't block user experience
      localStorage.setItem(NPS_STORAGE_KEY, String(Date.now()));
      setSubmitted(true);
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setVisible(false), 300);
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaybeLater = () => {
    // Set a shorter cooldown (7 days) for "maybe later"
    const sevenDaysAgo = Date.now() - (NPS_COOLDOWN_DAYS - 7) * 24 * 60 * 60 * 1000;
    localStorage.setItem(NPS_STORAGE_KEY, String(sevenDaysAgo));
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-24 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] transition-all duration-300 ${
        fadeOut ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 animate-slide-up'
      }`}
      style={{ animation: fadeOut ? undefined : 'slideUp 0.4s ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">We value your feedback</h3>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          {submitted ? (
            /* Thank you state */
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🙏</div>
              <p className="text-rose-600 font-semibold text-lg">Thank you!</p>
              <p className="text-gray-500 text-sm mt-1">Your feedback helps us improve VedaClue.</p>
            </div>
          ) : (
            <>
              {/* Question */}
              <p className="text-gray-700 font-medium text-sm mb-3">
                How likely are you to recommend VedaClue to a friend?
              </p>

              {/* Score buttons */}
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedScore(i)}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all duration-150 ${
                      selectedScore === i
                        ? `${getScoreColor(i)} text-white ring-2 ${getScoreRing(i)} scale-110`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-3 px-1">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>

              {/* Feedback textarea (shown after score selection) */}
              {selectedScore !== null && (
                <div className="mb-3 animate-fade-in">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={
                      selectedScore <= 6
                        ? 'What can we improve?'
                        : selectedScore <= 8
                        ? 'What would make it a 10?'
                        : 'What do you love most?'
                    }
                    className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                    rows={2}
                    maxLength={500}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleMaybeLater}
                  className="text-gray-400 hover:text-gray-600 text-xs transition-colors"
                >
                  Maybe later
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedScore === null || submitting}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedScore !== null
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-md'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
