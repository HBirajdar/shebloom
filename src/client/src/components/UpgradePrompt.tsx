import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { trackEvent } from '../hooks/useTrackEvent';

interface Props {
  feature?: string;
  title?: string;
  description?: string;
}

export default function UpgradePrompt({ feature, title, description }: Props) {
  const nav = useNavigate();

  // Track that user hit a locked feature
  useEffect(() => {
    trackEvent('feature_locked', { category: 'subscription', label: feature || 'unknown' });
    trackEvent('upgrade_prompt_shown', { category: 'subscription', label: feature || 'unknown' });
  }, [feature]);

  const featureLabels: Record<string, string> = {
    'cycle:bbt': 'BBT Tracking',
    'cycle:cervical-mucus': 'Cervical Mucus Tracking',
    'cycle:fertility-daily': 'Fertility Daily Log',
    'cycle:fertility-insights': 'Fertility Insights',
    'cycle:ayurvedic-insights': 'Ayurvedic Insights',
    'cycle:extended-history': 'Extended Cycle History',
    'reports:export': 'Data Export',
    'reports:full': 'Full Reports',
    'dosha:full-assessment': 'Full Dosha Assessment',
    'programs:paid': 'Premium Programs',
    'articles:premium': 'Premium Articles',
    'appointments:priority': 'Priority Doctor Booking',
    'pregnancy:advanced': 'Advanced Pregnancy Features',
  };

  const label = feature ? featureLabels[feature] || feature : 'Premium Features';

  return (
    <div className="bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200 rounded-2xl p-6 text-center my-4">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">
        {title || `Unlock ${label}`}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {description || `Upgrade to VedaClue Premium for full access to ${label.toLowerCase()} and more.`}
      </p>
      <button
        onClick={() => { trackEvent('upgrade_prompt_clicked', { category: 'subscription', label: feature }); nav('/pricing'); }}
        className="bg-gradient-to-r from-rose-500 to-amber-500 text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        View Plans
      </button>
    </div>
  );
}
