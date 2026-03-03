import { useNavigate, useParams } from 'react-router-dom';

export default function ArticleDetailPage() {
  const nav = useNavigate();
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/articles')}>&#8592;</button>
        <h1 className="text-lg font-bold">Article</h1>
      </div>
      <div className="px-5 pt-4">
        <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl h-48 flex items-center justify-center text-6xl mb-6">&#128221;</div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-600">PCOD</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-3 leading-tight">Understanding PCOD: A Complete Guide</h1>
        <div className="flex items-center gap-3 mt-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600">PS</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Dr. Priya Sharma</p>
            <p className="text-xs text-gray-400">Gynecologist &middot; 8 min read</p>
          </div>
        </div>
        <div className="mt-6 text-sm text-gray-600 leading-relaxed space-y-4">
          <p>Polycystic Ovarian Disease (PCOD) is one of the most common hormonal disorders affecting women of reproductive age. It affects approximately 1 in 5 women in India, making it crucial to understand its causes, symptoms, and management.</p>
          <h3 className="text-base font-bold text-gray-900">What is PCOD?</h3>
          <p>PCOD is a condition where the ovaries produce many immature or partially mature eggs. Over time, these become cysts in the ovaries. This enlarges the ovary size and leads to excess production of androgens (male hormones).</p>
          <h3 className="text-base font-bold text-gray-900">Common Symptoms</h3>
          <p>Irregular periods, weight gain, acne, hair thinning, and difficulty conceiving are among the most common symptoms. Many women also experience mood swings, fatigue, and skin darkening.</p>
          <h3 className="text-base font-bold text-gray-900">Management Tips</h3>
          <p>Lifestyle changes including regular exercise, a balanced diet rich in whole grains and lean proteins, adequate sleep, and stress management can significantly improve PCOD symptoms. Medical treatments include hormonal therapy and insulin-sensitizing medications.</p>
          <p>Always consult a qualified gynecologist for personalized treatment plans. Early detection and consistent management can help you lead a healthy, fulfilling life.</p>
        </div>
      </div>
    </div>
  );
}
