// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SYMPTOMS = [
  { emoji: '\uD83D\uDD34', title: 'Irregular Periods', desc: 'Cycles longer than 35 days, missed periods, or unpredictable bleeding patterns' },
  { emoji: '\uD83E\uDDB0', title: 'Hair Thinning', desc: 'Thinning hair on the scalp (androgenic alopecia) or excessive hair growth on face and body' },
  { emoji: '\uD83D\uDE16', title: 'Acne & Skin Issues', desc: 'Persistent hormonal acne on the chin, jawline, and cheeks that does not respond to typical treatments' },
  { emoji: '\u2696\uFE0F', title: 'Weight Gain', desc: 'Unexplained weight gain especially around the abdomen, and difficulty losing weight despite effort' },
  { emoji: '\uD83D\uDE29', title: 'Fatigue & Low Energy', desc: 'Chronic tiredness, brain fog, and energy crashes even with adequate sleep' },
  { emoji: '\uD83D\uDE1E', title: 'Mood Changes', desc: 'Anxiety, depression, mood swings, and irritability linked to hormonal imbalances' },
  { emoji: '\uD83C\uDF7D\uFE0F', title: 'Sugar Cravings', desc: 'Intense cravings for sweets and carbohydrates due to insulin resistance' },
  { emoji: '\uD83D\uDCA4', title: 'Sleep Problems', desc: 'Insomnia, poor sleep quality, or sleep apnea that worsens other PCOS symptoms' },
];

const VEDACLUE_HELPS = [
  {
    emoji: '\uD83D\uDCCA',
    title: 'Track Symptoms Intelligently',
    desc: 'Log and monitor your PCOS symptoms daily — acne, weight, mood, energy, hair changes — and see patterns over time with visual dashboards.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    emoji: '\uD83C\uDF19',
    title: 'Predict Your Irregular Cycles',
    desc: 'Our smart algorithm learns your unique irregular pattern and provides better period predictions, even when your cycles vary significantly.',
    color: 'from-purple-500 to-violet-500',
  },
  {
    emoji: '\uD83C\uDF3F',
    title: 'Ayurvedic PCOS Protocols',
    desc: 'Get personalized Ayurvedic recommendations based on your dosha type — herbal remedies, dietary plans, and lifestyle routines specifically for PCOS management.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    emoji: '\uD83D\uDC69\u200D\u2695\uFE0F',
    title: 'Consult PCOS Specialists',
    desc: 'Connect with verified Ayurvedic doctors and gynecologists who specialize in PCOS for personalized treatment plans and ongoing support.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    emoji: '\uD83E\uDDD8',
    title: 'PCOS Wellness Programs',
    desc: 'Access guided yoga sequences, meditation sessions, and breathing exercises specifically designed to support hormonal balance and reduce PCOS symptoms.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    emoji: '\uD83D\uDCAC',
    title: 'PCOS Community Support',
    desc: 'Join a supportive community of women managing PCOS. Share experiences, ask questions, and find encouragement on your journey.',
    color: 'from-pink-500 to-rose-500',
  },
];

const AYURVEDA_APPROACHES = [
  {
    title: 'Dosha-Based Diet',
    desc: 'In Ayurveda, PCOS is often linked to Kapha imbalance with Vata aggravation. A customized diet plan based on your Prakriti helps reduce Ama (toxins), improve digestion, and restore hormonal balance. This includes warm, cooked foods, bitter and astringent tastes, and specific spices like turmeric, cinnamon, and fenugreek.',
  },
  {
    title: 'Herbal Remedies',
    desc: 'Classical Ayurvedic herbs have been used for centuries to support women with PCOS symptoms. Shatavari supports reproductive health, Ashwagandha manages stress hormones, Guduchi boosts immunity, and Kanchanar Guggulu helps with cyst management. All herbal recommendations on VedaClue are guided by qualified Ayurvedic practitioners.',
  },
  {
    title: 'Panchakarma & Detox',
    desc: 'Ayurvedic detoxification therapies like Vamana, Virechana, and Basti can help cleanse the reproductive system and restore balance. VedaClue connects you with Ayurvedic centers that offer authentic Panchakarma treatments tailored for PCOS management.',
  },
  {
    title: 'Yoga & Pranayama',
    desc: 'Specific yoga asanas like Supta Baddha Konasana, Bharadvajasana, and Setu Bandhasana improve blood flow to the pelvic region and support ovarian health. Combined with Pranayama practices like Nadi Shodhana and Bhramari, these practices help reduce cortisol and support hormonal regulation.',
  },
];

const FAQS = [
  {
    q: 'What is PCOS and how common is it?',
    a: 'Polycystic Ovary Syndrome (PCOS) is a hormonal disorder affecting approximately 1 in 5 women of reproductive age in India and about 6-12% of women globally. It occurs when the ovaries produce excess androgens (male hormones), leading to irregular periods, cysts on the ovaries, and various metabolic symptoms. PCOS is the most common cause of anovulatory infertility but is highly manageable with the right approach.',
  },
  {
    q: 'Can PCOS be cured permanently?',
    a: 'While there is no permanent cure for PCOS, it can be effectively managed with lifestyle changes, diet modifications, stress management, and appropriate medical support. Many women see significant symptom improvement — regular periods, reduced acne, weight loss, and improved fertility — through consistent management. Ayurvedic approaches focus on addressing the root cause rather than just symptom suppression.',
  },
  {
    q: 'How does Ayurveda help with PCOS?',
    a: 'Ayurveda views PCOS as a disorder rooted in Kapha and Vata imbalance, leading to blocked channels (Srotas) and accumulation of toxins (Ama). Treatment focuses on restoring balance through customized diet plans, herbal formulations (like Shatavari, Ashwagandha, and Kanchanar Guggulu), Panchakarma detoxification, yoga, and lifestyle modifications. Many women find that combining Ayurvedic approaches with conventional medicine gives the best results.',
  },
  {
    q: 'Can I get pregnant with PCOS?',
    a: 'Yes, many women with PCOS conceive naturally or with minimal intervention. PCOS is the most common cause of anovulatory infertility, but with proper management — including ovulation tracking, weight management, hormonal balance, and potentially medical support — pregnancy is very achievable. VedaClue helps you track your fertility signs and connect with specialists who can guide your journey.',
  },
  {
    q: 'What foods should I eat and avoid with PCOS?',
    a: 'Focus on anti-inflammatory, low-glycemic foods: leafy greens, whole grains, lean proteins, healthy fats (ghee, nuts, seeds), and spices like turmeric and cinnamon. Reduce refined carbohydrates, sugary foods, processed snacks, and excessive dairy. Ayurveda specifically recommends warm, cooked foods over raw and cold foods, eating your largest meal at lunch, and avoiding eating late at night.',
  },
  {
    q: 'How does VedaClue help me manage PCOS?',
    a: 'VedaClue provides comprehensive PCOS management tools: daily symptom tracking with visual trends, smart cycle prediction for irregular periods, personalized Ayurvedic protocols based on your dosha type, guided wellness activities (yoga, meditation, pranayama), access to verified PCOS specialist doctors, and a supportive community of women on the same journey. All of this is available in one app, designed to make PCOS management practical and empowering.',
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

function FaqAccordion({ faqs }: { faqs: typeof FAQS }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-md overflow-hidden">
          <button
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="w-full px-5 py-4 flex items-center justify-between text-left"
          >
            <span className="font-bold text-gray-900 text-sm md:text-base pr-4">{faq.q}</span>
            <span className={`text-rose-500 text-xl transition-transform flex-shrink-0 ${openIdx === idx ? 'rotate-45' : ''}`}>+</span>
          </button>
          {openIdx === idx && (
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PcosPage() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50" style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PublicNav nav={nav} />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 text-white">
        <div className="max-w-5xl mx-auto px-5 py-16 md:py-24 text-center">
          <span className="text-5xl block mb-4">{'\uD83E\uDDA0'}</span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Understanding PCOS
          </h1>
          <p className="mt-4 text-base md:text-lg text-rose-100 max-w-2xl mx-auto leading-relaxed">
            Polycystic Ovary Syndrome affects millions of women worldwide. Learn about symptoms, causes, and how Ayurveda combined with modern tracking can help you manage PCOS effectively and live your best life.
          </p>
          <button onClick={() => nav('/onboarding')} className="mt-8 px-8 py-3 bg-white text-rose-600 rounded-2xl font-bold text-base hover:shadow-xl transition-all">
            Start Managing PCOS {'\u2192'}
          </button>
        </div>
      </section>

      {/* What is PCOS */}
      <section className="max-w-5xl mx-auto px-5 py-12 md:py-16">
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">What is PCOS?</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Polycystic Ovary Syndrome (PCOS) is one of the most common hormonal disorders among women of reproductive age, affecting approximately <strong>1 in 5 women in India</strong> and 6-12% of women globally. Despite being so common, PCOS is frequently misdiagnosed or diagnosed late because its symptoms vary widely from person to person.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            PCOS occurs when the ovaries produce excess androgens (often called "male hormones," though all women produce them in small amounts). This hormonal imbalance can prevent the ovaries from releasing eggs regularly (anovulation), lead to the development of small fluid-filled sacs (follicles) on the ovaries, and cause a range of metabolic and reproductive symptoms.
          </p>
          <p className="text-gray-600 leading-relaxed">
            The exact cause of PCOS is not fully understood, but it involves a combination of <strong>genetic factors, insulin resistance, inflammation, and lifestyle influences</strong>. The good news is that PCOS is highly manageable. With the right combination of lifestyle changes, dietary modifications, stress management, and medical support, most women with PCOS can significantly reduce their symptoms and lead healthy, fulfilling lives.
          </p>
        </div>
      </section>

      {/* Common Symptoms */}
      <section className="max-w-5xl mx-auto px-5 py-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">Common PCOS Symptoms</h2>
        <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">PCOS manifests differently in every woman. You may experience some or all of these symptoms. Recognizing them early is the first step to effective management.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SYMPTOMS.map((s) => (
            <div key={s.title} className="bg-white rounded-3xl shadow-lg p-5 hover:shadow-xl transition-shadow">
              <span className="text-3xl block mb-3">{s.emoji}</span>
              <h3 className="font-extrabold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How VedaClue Helps */}
      <section className="bg-white py-12 md:py-16 mt-8">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">How VedaClue Helps You Manage PCOS</h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">VedaClue is designed with PCOS management at its core. Here is how our app empowers you to take control of your symptoms.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VEDACLUE_HELPS.map((h) => (
              <div key={h.title} className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 border border-rose-100">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${h.color} flex items-center justify-center text-xl shadow-md mb-4`}>
                  <span className="text-white">{h.emoji}</span>
                </div>
                <h3 className="font-extrabold text-gray-900 mb-2">{h.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ayurvedic Approach */}
      <section className="max-w-5xl mx-auto px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">The Ayurvedic Approach to PCOS</h2>
        <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">Ayurveda offers a holistic, root-cause approach to PCOS that complements modern medicine. Here is how ancient wisdom addresses this modern condition.</p>
        <div className="space-y-6">
          {AYURVEDA_APPROACHES.map((a, idx) => (
            <div key={idx} className="bg-white rounded-3xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row items-start gap-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                {idx + 1}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{a.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Expert Doctors CTA */}
      <section className="max-w-5xl mx-auto px-5 py-8">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <span className="text-4xl block mb-4">{'\uD83D\uDC69\u200D\u2695\uFE0F'}</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Talk to a PCOS Specialist</h2>
          <p className="mt-3 text-blue-100 max-w-lg mx-auto">Our network includes verified Ayurvedic practitioners and gynecologists who specialize in PCOS. Get a personalized treatment plan from the comfort of your home.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => nav('/onboarding')} className="px-8 py-3 bg-white text-blue-600 rounded-2xl font-bold text-base hover:shadow-xl transition-all">
              Find a Doctor {'\u2192'}
            </button>
            <button onClick={() => nav('/features')} className="px-8 py-3 border-2 border-white/40 text-white rounded-2xl font-bold text-base hover:bg-white/10 transition-all">
              Learn About Features
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-3">Frequently Asked Questions About PCOS</h2>
        <p className="text-center text-gray-500 mb-10">Get answers to the most common questions about PCOS, its management, and how VedaClue can help.</p>
        <FaqAccordion faqs={FAQS} />
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Start Managing Your PCOS with VedaClue</h2>
          <p className="mt-3 text-rose-100 max-w-lg mx-auto">Join thousands of women who are taking control of their PCOS journey. Track symptoms, get Ayurvedic guidance, consult specialists, and find community support — all for free.</p>
          <button onClick={() => nav('/onboarding')} className="mt-6 px-10 py-4 bg-white text-rose-600 rounded-2xl font-bold text-base hover:shadow-xl transition-all">
            Get Started Free {'\u2192'}
          </button>
        </div>
      </section>

      <PublicFooter nav={nav} />
    </div>
  );
}
