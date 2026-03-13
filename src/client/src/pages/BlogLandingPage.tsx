// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

const CATEGORIES = ['All', 'Periods', 'Fertility', 'PCOS', 'Ayurveda', 'Wellness', 'Nutrition'];

const STATIC_ARTICLES = [
  {
    id: 's1',
    title: 'Understanding Your Menstrual Cycle: A Complete Guide',
    excerpt: 'Learn about the four phases of your menstrual cycle — menstruation, follicular, ovulation, and luteal — and how each phase affects your body, mood, and energy levels.',
    category: 'Periods',
    readTime: '8 min read',
    image: null,
  },
  {
    id: 's2',
    title: '10 Ayurvedic Herbs That Support Hormonal Balance',
    excerpt: 'From Shatavari to Ashwagandha, discover the classical Ayurvedic herbs that have been used for centuries to support women\'s hormonal health and reproductive wellness.',
    category: 'Ayurveda',
    readTime: '6 min read',
    image: null,
  },
  {
    id: 's3',
    title: 'PCOS Diet: Foods to Eat and Avoid for Better Symptom Management',
    excerpt: 'Nutrition plays a crucial role in managing PCOS symptoms. Learn which foods help reduce inflammation, balance blood sugar, and support healthy hormone levels.',
    category: 'PCOS',
    readTime: '10 min read',
    image: null,
  },
  {
    id: 's4',
    title: 'Boosting Fertility Naturally: An Ayurvedic Perspective',
    excerpt: 'Explore how Ayurvedic practices, diet modifications, and herbal remedies can support your fertility journey and improve your chances of conception naturally.',
    category: 'Fertility',
    readTime: '7 min read',
    image: null,
  },
  {
    id: 's5',
    title: 'Yoga Poses for Period Pain Relief: A Beginner\'s Guide',
    excerpt: 'Discover gentle yoga asanas that can help alleviate menstrual cramps, reduce bloating, and ease lower back pain during your period. Suitable for all fitness levels.',
    category: 'Wellness',
    readTime: '5 min read',
    image: null,
  },
  {
    id: 's6',
    title: 'Iron-Rich Foods for Women: Preventing Anemia During Menstruation',
    excerpt: 'Heavy periods can lead to iron deficiency. Learn about the best plant-based and non-vegetarian iron sources, plus tips on maximizing iron absorption from your meals.',
    category: 'Nutrition',
    readTime: '6 min read',
    image: null,
  },
  {
    id: 's7',
    title: 'How to Track Ovulation: Methods, Signs, and Tips',
    excerpt: 'Whether you are trying to conceive or simply want to understand your body better, learn about BBT tracking, cervical mucus changes, OPK strips, and more.',
    category: 'Fertility',
    readTime: '9 min read',
    image: null,
  },
  {
    id: 's8',
    title: 'Pranayama for PMS: Breathing Techniques That Actually Help',
    excerpt: 'Scientific research confirms what Ayurveda has known for millennia — controlled breathing exercises can significantly reduce PMS symptoms like anxiety and irritability.',
    category: 'Wellness',
    readTime: '5 min read',
    image: null,
  },
  {
    id: 's9',
    title: 'Understanding Your Dosha: How Body Type Affects Your Period',
    excerpt: 'In Ayurveda, your unique constitution (Prakriti) influences everything from your cycle length to your PMS symptoms. Learn what your dosha says about your menstrual health.',
    category: 'Ayurveda',
    readTime: '7 min read',
    image: null,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Periods: 'bg-rose-100 text-rose-700',
  Fertility: 'bg-emerald-100 text-emerald-700',
  PCOS: 'bg-purple-100 text-purple-700',
  Ayurveda: 'bg-green-100 text-green-700',
  Wellness: 'bg-amber-100 text-amber-700',
  Nutrition: 'bg-blue-100 text-blue-700',
};

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

export default function BlogLandingPage() {
  const nav = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [apiArticles, setApiArticles] = useState<any[] | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/articles')
        .then((res) => setApiArticles(res.data?.articles || res.data || []))
        .catch(() => setApiArticles(null));
    }
  }, [isAuthenticated]);

  const articles = apiArticles && apiArticles.length > 0
    ? apiArticles.map((a: any) => ({
        id: a._id || a.id,
        title: a.title,
        excerpt: a.excerpt || a.summary || a.content?.substring(0, 150) + '...',
        category: a.category || 'Wellness',
        readTime: a.readTime || '5 min read',
        image: a.coverImage || a.image || null,
        slug: a.slug,
      }))
    : STATIC_ARTICLES;

  const filtered = activeCategory === 'All'
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50" style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PublicNav nav={nav} />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-5 py-16 md:py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Women's Health Blog
          </h1>
          <p className="mt-4 text-base md:text-lg text-rose-100 max-w-2xl mx-auto leading-relaxed">
            Expert articles on periods, fertility, PCOS, Ayurveda, and holistic wellness. Evidence-based insights to help you understand your body and thrive naturally.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="max-w-5xl mx-auto px-5 pt-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-rose-50 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-5xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article) => (
            <article
              key={article.id}
              className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden group cursor-pointer"
              onClick={() => {
                if (isAuthenticated && article.slug) {
                  nav(`/articles/${article.slug}`);
                } else {
                  nav('/auth');
                }
              }}
            >
              <div className="h-40 bg-gradient-to-br from-rose-100 via-pink-100 to-purple-100 flex items-center justify-center">
                {article.image ? (
                  <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-40">{'\uD83D\uDCDD'}</span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-600'}`}>
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-400">{article.readTime}</span>
                </div>
                <h3 className="font-extrabold text-gray-900 leading-snug group-hover:text-rose-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
                <span className="inline-block mt-3 text-sm font-bold text-rose-500">
                  Read more {'\u2192'}
                </span>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">{'\uD83D\uDD0D'}</span>
            <p className="text-gray-500">No articles found in this category yet. Check back soon!</p>
          </div>
        )}
      </section>

      {/* SEO Content Sections */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-5 space-y-12">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Understanding Women's Health Through Ayurveda</h2>
            <p className="text-gray-600 leading-relaxed">
              Women's health is deeply nuanced, and Ayurveda — India's 5000-year-old system of natural medicine — offers a uniquely holistic perspective. Unlike conventional approaches that often treat symptoms in isolation, Ayurveda views the body as an interconnected system where menstrual health, hormonal balance, digestion, emotional wellbeing, and lifestyle are all intertwined. At VedaClue, our blog brings you evidence-informed Ayurvedic insights written by practitioners and health experts, helping you make empowered decisions about your health.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-3">Period Health and Menstrual Wellness</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your menstrual cycle is a vital sign of your overall health. Our period health articles cover everything from understanding cycle irregularities and managing painful periods to identifying when symptoms may signal conditions like endometriosis or PCOS. We combine modern gynecological knowledge with Ayurvedic approaches like diet modifications during each cycle phase, herbal support for menstrual discomfort, and lifestyle practices that promote regularity and ease.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-3">Fertility and Reproductive Health</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Whether you are actively trying to conceive or planning for the future, understanding your fertility is empowering. Our fertility articles guide you through ovulation tracking methods, factors that affect fertility, and how Ayurvedic practices like Ritucharya (seasonal routines) and specific herbal formulations like Shatavari and Phala Ghrita have traditionally supported reproductive health. We believe every woman deserves access to this knowledge.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-3">PCOS: Symptoms, Causes, and Natural Management</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Polycystic Ovary Syndrome (PCOS) affects up to 1 in 5 women of reproductive age in India. Our PCOS articles provide in-depth coverage of symptoms like irregular periods, acne, weight gain, and hair thinning, alongside natural management strategies. Discover how dietary changes, exercise routines, stress management, and Ayurvedic protocols can help you manage PCOS symptoms and improve quality of life.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-3">Nutrition and Holistic Wellness</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                What you eat profoundly impacts your hormonal health, cycle regularity, and overall vitality. Our nutrition articles explore Ayurvedic dietary principles, cycle-syncing nutrition, anti-inflammatory foods for hormonal balance, and practical meal ideas that support women's health. From iron-rich foods to hormone-balancing superfoods, we make healthy eating accessible and enjoyable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Get Personalized Health Insights</h2>
          <p className="mt-3 text-rose-100 max-w-lg mx-auto">Sign up for free to unlock personalized articles, track your health, and get recommendations based on your unique body type and needs.</p>
          <button onClick={() => nav('/onboarding')} className="mt-6 px-10 py-4 bg-white text-rose-600 rounded-2xl font-bold text-base hover:shadow-xl transition-all">
            Sign Up for Free {'\u2192'}
          </button>
        </div>
      </section>

      <PublicFooter nav={nav} />
    </div>
  );
}
