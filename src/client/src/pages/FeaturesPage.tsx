// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

const FEATURES = [
  {
    id: 'period-tracking',
    emoji: '\uD83C\uDF19',
    title: 'Period Tracking',
    short: 'Accurate cycle prediction powered by Ayurvedic insights',
    bullets: [
      'Smart cycle prediction that learns your unique pattern over time',
      'Daily symptom logging — cramps, bloating, headaches, energy levels',
      'Mood tracking with emotional wellness trends and dosha correlations',
      'Period reminders and fertile window notifications',
    ],
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'fertility-tracking',
    emoji: '\uD83C\uDF31',
    title: 'Fertility Tracking',
    short: 'Holistic fertility monitoring with Ayurvedic support',
    bullets: [
      'Basal Body Temperature (BBT) charting with automatic pattern detection',
      'Cervical mucus tracking with visual guides and fertility scoring',
      'Ovulation prediction using multiple biomarkers for higher accuracy',
      'Fertility-friendly Ayurvedic diet and lifestyle recommendations',
    ],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'pcos-management',
    emoji: '\uD83E\uDDA0',
    title: 'PCOS Management',
    short: 'Comprehensive tools to manage and understand PCOS',
    bullets: [
      'Hormonal health insights based on symptom patterns and cycle data',
      'PCOS symptom tracker — acne, hair growth, weight changes, fatigue',
      'Personalized Ayurvedic protocols for insulin resistance and inflammation',
      'Progress dashboards to visualize symptom improvement over time',
    ],
    color: 'from-purple-500 to-violet-500',
  },
  {
    id: 'ayurveda-integration',
    emoji: '\uD83C\uDF3F',
    title: 'Ayurveda Integration',
    short: 'Classical Ayurvedic wisdom tailored to your body type',
    bullets: [
      'Comprehensive dosha assessment (Vata, Pitta, Kapha) questionnaire',
      'Personalized dietary recommendations based on your Prakriti',
      'Seasonal routines (Ritucharya) aligned with your menstrual cycle',
      'Herbal remedy suggestions from classical Ayurvedic texts',
    ],
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'wellness-activities',
    emoji: '\uD83E\uDDD8',
    title: 'Wellness Activities',
    short: 'Guided yoga, meditation, and breathing for every phase',
    bullets: [
      'Cycle-phase specific yoga sequences designed by certified instructors',
      'Guided meditation sessions for stress relief and hormonal balance',
      'Pranayama (breathing exercises) for anxiety, PMS, and pain management',
      'Daily wellness routines that adapt to your menstrual cycle phase',
    ],
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'doctor-consultations',
    emoji: '\uD83D\uDC69\u200D\u2695\uFE0F',
    title: 'Doctor Consultations',
    short: 'Connect with verified Ayurvedic doctors instantly',
    bullets: [
      'Network of verified Ayurvedic practitioners and gynecologists',
      'Online booking with video, audio, and chat consultation options',
      'Digital prescriptions and follow-up reminders',
      'Specialist doctors for PCOS, fertility, pregnancy, and menopause',
    ],
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'community',
    emoji: '\uD83D\uDCAC',
    title: 'Community',
    short: 'A safe, supportive space for women to connect',
    bullets: [
      'Anonymous discussion forums organized by health topics',
      'Community polls and surveys to share and learn from experiences',
      'Expert-led Q&A sessions with Ayurvedic doctors',
      'Shared stories and journeys from real women managing PCOS, fertility, and more',
    ],
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'shop',
    emoji: '\uD83D\uDECD\uFE0F',
    title: 'Ayurvedic Shop',
    short: 'Curated, lab-tested Ayurvedic products you can trust',
    bullets: [
      'Handpicked Ayurvedic products for period care, skin, hair, and wellness',
      'Natural remedies — herbal teas, supplements, essential oils',
      'Every product verified for authenticity and lab-tested for purity',
      'Personalized product recommendations based on your dosha profile',
    ],
    color: 'from-teal-500 to-cyan-500',
  },
];

function PublicNav({ nav }: { nav: (path: string) => void }) {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.92)' }}>
      <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
        <button onClick={() => nav('/')} className="flex items-center gap-2">
          <span className="text-2xl">{'\uD83C\uDF38'}</span>
          <span className="text-lg font-extrabold text-gray-900">VedaClue</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/auth')} className="text-sm font-semibold text-gray-600 hover:text-rose-600 transition-colors">
            Sign In
          </button>
          <button onClick={() => nav('/onboarding')} className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}

function PublicFooter({ nav }: { nav: (path: string) => void }) {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{'\uD83C\uDF38'}</span>
              <span className="text-lg font-extrabold text-white">VedaClue</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">Ancient Ayurvedic wisdom meets modern technology for women's health and wellness.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <button onClick={() => nav('/about-us')} className="hover:text-white transition-colors">About Us</button>
            <button onClick={() => nav('/features')} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => nav('/blog')} className="hover:text-white transition-colors">Blog</button>
            <button onClick={() => nav('/pcos')} className="hover:text-white transition-colors">PCOS Guide</button>
            <button onClick={() => nav('/privacy-policy')} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => nav('/terms-conditions')} className="hover:text-white transition-colors">Terms & Conditions</button>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} VedaClue. All rights reserved. Built with {'\u2764\uFE0F'} in Bengaluru, India.</p>
        </div>
      </div>
    </footer>
  );
}

export default function FeaturesPage() {
  const nav = useNavigate();
  const detailsRef = useRef<HTMLDivElement>(null);

  const scrollToDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50" style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PublicNav nav={nav} />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-5 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Everything You Need for<br />
            <span className="text-rose-200">Holistic Women's Health</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-rose-100 max-w-2xl mx-auto leading-relaxed">
            VedaClue combines ancient Ayurvedic wisdom with modern health tracking to help you understand your body, manage your cycle, and thrive naturally. From period tracking to doctor consultations — all in one app.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => nav('/onboarding')} className="px-8 py-3 bg-white text-rose-600 rounded-2xl font-bold text-base hover:shadow-xl transition-all">
              Start Free {'\u2192'}
            </button>
            <button onClick={scrollToDetails} className="px-8 py-3 border-2 border-white/40 text-white rounded-2xl font-bold text-base hover:bg-white/10 transition-all">
              Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-5xl mx-auto px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">Powerful Features for Every Woman</h2>
        <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">Whether you are tracking your period, managing PCOS, or seeking Ayurvedic guidance, VedaClue has the tools you need.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow p-6 flex flex-col items-center text-center group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                <span className="text-white">{f.emoji}</span>
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.short}</p>
              <button onClick={scrollToDetails} className="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors">
                Learn more {'\u2193'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Feature Sections */}
      <section ref={detailsRef} className="max-w-5xl mx-auto px-5 py-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-12">Deep Dive Into Our Features</h2>
        <div className="space-y-12">
          {FEATURES.map((f, idx) => (
            <div key={f.id} id={f.id} className={`flex flex-col ${idx % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8`}>
              <div className="flex-shrink-0">
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br ${f.color} flex items-center justify-center text-5xl md:text-6xl shadow-xl`}>
                  <span className="text-white">{f.emoji}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{f.short}</p>
                <ul className="space-y-2">
                  {f.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-rose-500 mt-0.5 flex-shrink-0">{'\u2713'}</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why VedaClue Section */}
      <section className="bg-white py-12 md:py-16 mt-12">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">Why Women Choose VedaClue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <span className="text-4xl block mb-3">{'\uD83D\uDD12'}</span>
              <h3 className="font-extrabold text-gray-900 mb-2">Privacy First</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Your health data is yours. We never sell or share your personal information with third parties.</p>
            </div>
            <div className="text-center p-6">
              <span className="text-4xl block mb-3">{'\uD83C\uDF3F'}</span>
              <h3 className="font-extrabold text-gray-900 mb-2">Authentically Ayurvedic</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Rooted in classical Ayurvedic principles, not wellness trends. Every recommendation backed by tradition and science.</p>
            </div>
            <div className="text-center p-6">
              <span className="text-4xl block mb-3">{'\u2764\uFE0F'}</span>
              <h3 className="font-extrabold text-gray-900 mb-2">Built for Women</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Designed by women, for women. Every feature crafted to address real health needs and concerns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Ready to Take Control of Your Health?</h2>
          <p className="mt-3 text-rose-100 max-w-lg mx-auto">Join thousands of women who trust VedaClue for their daily health and wellness needs. Start your journey today — it is completely free.</p>
          <button onClick={() => nav('/onboarding')} className="mt-6 px-10 py-4 bg-white text-rose-600 rounded-2xl font-bold text-base hover:shadow-xl transition-all">
            Start Free {'\u2192'}
          </button>
        </div>
      </section>

      <PublicFooter nav={nav} />
    </div>
  );
}
