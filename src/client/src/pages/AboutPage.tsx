// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const FEATURES = [
  { emoji: '\uD83C\uDF19', title: 'Cycle Tracking', desc: 'Smart period and ovulation tracking with Ayurvedic dosha insights' },
  { emoji: '\uD83D\uDC69\u200D\u2695\uFE0F', title: 'Expert Doctors', desc: 'Consult verified Ayurvedic doctors via video, audio or chat' },
  { emoji: '\uD83D\uDECD\uFE0F', title: 'Authentic Products', desc: 'Curated Ayurvedic products \u2014 verified, lab-tested, genuine' },
  { emoji: '\uD83D\uDCDA', title: 'Wellness Programs', desc: 'Expert-led programs for PCOS, fertility, skin, and more' },
  { emoji: '\uD83D\uDCAC', title: 'Safe Community', desc: 'Anonymous, supportive community of women who understand you' },
  { emoji: '\uD83D\uDCCA', title: 'Health Insights', desc: 'Personalised health reports and Ayurvedic recommendations' },
];

const VALUES = [
  { emoji: '\uD83D\uDD12', title: 'Privacy First', desc: 'Your health data is yours. We never sell it. Ever.', color: 'from-rose-500 to-pink-500' },
  { emoji: '\u2705', title: 'Verified Quality', desc: 'Every doctor and product on VedaClue is verified by our expert team', color: 'from-emerald-500 to-teal-500' },
  { emoji: '\uD83C\uDF3F', title: 'Authentically Ayurvedic', desc: 'Not a wellness trend \u2014 rooted in classical Ayurvedic principles', color: 'from-green-500 to-emerald-500' },
  { emoji: '\u2764\uFE0F', title: 'Women First', desc: 'Built by women, for women, with women\'s needs at the centre', color: 'from-pink-500 to-rose-500' },
];

export default function AboutPage() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50" style={{ fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">
            <span className="text-gray-600">&#8592;</span>
          </button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">About VedaClue</h1>
            <p className="text-[9px] text-gray-400">Ancient Wisdom. Modern Wellness.</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {/* Hero */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-center shadow-xl shadow-rose-200">
          <span className="text-5xl block mb-3">{'\uD83C\uDF38'}</span>
          <h2 className="text-xl font-extrabold text-white leading-tight">Ancient Wisdom.<br />Modern Wellness.</h2>
          <p className="text-xs text-rose-100 mt-3 leading-relaxed">
            VedaClue brings the power of Ayurveda to every woman's daily life — through technology that understands, cares, and heals.
          </p>
        </div>

        {/* Our Story */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <p className="text-sm font-extrabold text-gray-800 mb-2">Our Story</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            VedaClue was born from a simple belief: every woman deserves access to personalised, holistic healthcare rooted in India's 5000-year-old Ayurvedic tradition.
          </p>
          <p className="text-xs text-gray-600 leading-relaxed mt-2">
            We built VedaClue to bridge the gap between ancient wisdom and modern life — making it easy to track your cycle, consult real Ayurvedic doctors, discover authentic products, and connect with a community of women on the same journey.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl shadow-lg p-4">
            <span className="text-2xl block mb-2">{'\uD83C\uDFAF'}</span>
            <p className="text-xs font-extrabold text-gray-800 mb-1">Our Mission</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              To make Ayurvedic women's healthcare accessible, personalised and trustworthy for every woman in India.
            </p>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-4">
            <span className="text-2xl block mb-2">{'\uD83D\uDC41\uFE0F'}</span>
            <p className="text-xs font-extrabold text-gray-800 mb-1">Our Vision</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              A world where every woman understands her body, trusts her health choices, and thrives naturally.
            </p>
          </div>
        </div>

        {/* Features */}
        <div>
          <p className="text-sm font-extrabold text-gray-800 mb-3">What We Offer</p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-3xl shadow-lg p-4 text-center">
                <span className="text-3xl block mb-2">{f.emoji}</span>
                <p className="text-xs font-extrabold text-gray-800">{f.title}</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div>
          <p className="text-sm font-extrabold text-gray-800 mb-3">Our Values</p>
          <div className="space-y-3">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-3xl shadow-lg p-4 flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${v.color} flex items-center justify-center text-lg shadow-md flex-shrink-0`}>
                  <span className="text-white">{v.emoji}</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-800">{v.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Founder */}
        <div>
          <p className="text-sm font-extrabold text-gray-800 mb-3">Meet Our Founder</p>
          <div className="bg-white rounded-3xl shadow-lg p-6 text-center border-2 border-rose-100">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center text-4xl shadow-md mb-4">
              {'\uD83D\uDC69'}
            </div>
            <p className="text-base font-extrabold text-gray-900">Sugandhika Patil</p>
            <p className="text-[10px] text-rose-500 font-bold mt-0.5">Founder & CEO, VedaClue</p>
            <p className="text-xs text-gray-500 leading-relaxed mt-3">
              Sugandhika is passionate about making Ayurvedic women's healthcare accessible to every woman in India. VedaClue is her vision of combining ancient Ayurvedic wisdom with modern technology to empower women's health and wellness.
            </p>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed">
            Built with {'\u2764\uFE0F'} in Bengaluru, India by a team dedicated to women's health and Ayurvedic wellness.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-center shadow-xl shadow-rose-200">
          <p className="text-base font-extrabold text-white">Ready to start your wellness journey?</p>
          <button onClick={() => nav('/auth')} className="mt-4 px-8 py-3 bg-white text-rose-600 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-md">
            Get Started {'\u2192'}
          </button>
        </div>

        {/* Footer spacing */}
        <div className="h-4" />
      </div>

      <BottomNav />
    </div>
  );
}
