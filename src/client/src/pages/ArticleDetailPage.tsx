import { useNavigate, useParams } from 'react-router-dom';

const articleData: Record<string, { title: string; cat: string; by: string; initials: string; time: string; content: string[] }> = {
  '1': {
    title: 'Understanding PCOD: A Complete Guide', cat: 'PCOD', by: 'Dr. Priya Sharma', initials: 'PS', time: '8 min',
    content: [
      'Polycystic Ovarian Disease (PCOD) is one of the most common hormonal disorders affecting women of reproductive age. It affects approximately 1 in 5 women in India.',
      '## What is PCOD?',
      'PCOD is a condition where the ovaries produce many immature or partially mature eggs. Over time, these become cysts in the ovaries, leading to excess androgen production.',
      '## Common Symptoms',
      'Irregular periods, weight gain, acne, hair thinning, and difficulty conceiving are among the most common symptoms. Many women also experience mood swings and fatigue.',
      '## Management Tips',
      'Lifestyle changes including regular exercise, a balanced diet, adequate sleep, and stress management can significantly improve PCOD symptoms. Always consult a qualified gynecologist for personalized treatment.',
    ],
  },
  '2': {
    title: '5 Natural Remedies for Period Pain', cat: 'Periods', by: 'Dr. Kavitha Rao', initials: 'KR', time: '5 min',
    content: [
      'Period pain (dysmenorrhea) affects most women. Here are 5 natural remedies that can help.',
      '## 1. Heat Therapy',
      'A heating pad on your lower abdomen relaxes muscles and reduces cramping. Studies show it is as effective as OTC painkillers for many women.',
      '## 2. Ginger Tea',
      'Ginger has anti-inflammatory properties. Drink 2-3 cups during your period.',
      '## 3. Light Exercise',
      'Gentle yoga, walking, or stretching releases endorphins. Even 20 minutes helps.',
      '## 4. Magnesium-Rich Foods',
      'Dark chocolate, bananas, nuts, and leafy greens help relax muscles and reduce cramping.',
      '## 5. Deep Breathing',
      'Practicing deep breathing for 10 minutes can reduce pain perception and relax tense muscles.',
    ],
  },
  '3': {
    title: 'First Trimester: What to Expect', cat: 'Pregnancy', by: 'Dr. Anita Desai', initials: 'AD', time: '10 min',
    content: [
      'The first trimester (weeks 1-12) is a time of incredible change for both mother and baby.',
      '## Common Symptoms',
      'Morning sickness, fatigue, breast tenderness, and frequent urination are caused by rising hCG and progesterone levels.',
      '## Baby\'s Development',
      'By week 12, your baby has all major organs, a heartbeat, and is about the size of a lime.',
      '## Important First Steps',
      'Schedule your first prenatal visit around week 8. Start folic acid, avoid alcohol and raw foods, and stay hydrated.',
    ],
  },
  '4': {
    title: 'Yoga Poses for Menstrual Relief', cat: 'Wellness', by: 'Dr. Meera Nair', initials: 'MN', time: '6 min',
    content: [
      'Yoga is one of the most effective natural remedies for menstrual discomfort.',
      '## Child\'s Pose (Balasana)',
      'Gently stretches the lower back and hips. Hold for 1-3 minutes while breathing deeply.',
      '## Supine Twist',
      'Lying on your back, bring one knee across your body to massage internal organs and relieve back pain.',
      '## Cat-Cow Pose',
      'This flowing movement warms up the spine and can help with cramps. Move slowly for 10-15 rounds.',
      '## Legs Up the Wall',
      'This restorative inversion improves circulation and reduces bloating. Hold for 5-10 minutes.',
    ],
  },
  '5': {
    title: 'Hormonal Imbalance: 7 Warning Signs', cat: 'Health', by: 'Dr. Sunita Gupta', initials: 'SG', time: '7 min',
    content: [
      'Hormonal imbalances affect mood, metabolism, and more. Recognizing the signs early leads to better outcomes.',
      '## 1. Irregular Periods',
      'Cycles shorter than 21 days or longer than 35 days may indicate hormonal issues.',
      '## 2. Persistent Acne',
      'Hormonal acne along the jawline that worsens before periods.',
      '## 3. Unexplained Weight Changes',
      'Sudden gain or difficulty losing weight, especially around the midsection.',
      '## 4. Chronic Fatigue',
      'Exhaustion despite adequate sleep could indicate thyroid issues.',
      '## 5. Mood Swings & Sleep Issues',
      'Severe PMS, anxiety, or trouble sleeping that follows a cyclical pattern may be hormone-related.',
      'If you experience several of these, consult an endocrinologist or gynecologist.',
    ],
  },
  '6': {
    title: 'Nutrition Tips During Your Period', cat: 'Nutrition', by: 'Dr. Sunita Gupta', initials: 'SG', time: '4 min',
    content: [
      'What you eat during your period significantly impacts how you feel.',
      '## Foods to Embrace',
      'Iron-rich foods (spinach, lentils) replace iron lost through menstruation. Omega-3 foods (salmon) reduce inflammation.',
      '## Foods to Limit',
      'Excess salt causes bloating. Caffeine worsens cramps. Processed sugar increases inflammation.',
      '## Hydration is Key',
      'Aim for 8-10 glasses daily. Chamomile and peppermint teas help with cramps and bloating.',
    ],
  },
  '7': {
    title: 'Mental Health and PMS Connection', cat: 'Mental Health', by: 'Dr. Priya Sharma', initials: 'PS', time: '9 min',
    content: [
      'The connection between your menstrual cycle and mental health is stronger than many realize.',
      '## The Hormonal Rollercoaster',
      'Estrogen and progesterone fluctuations directly affect serotonin and GABA, which regulate mood and sleep.',
      '## PMS vs PMDD',
      'While PMS affects up to 75% of women, PMDD is a severe form affecting 3-8% that causes debilitating emotional symptoms.',
      '## Coping Strategies',
      'Regular exercise, consistent sleep, stress management, and social support significantly reduce PMS mood changes.',
      '## Tracking Your Patterns',
      'Using SheBloom to track mood alongside your cycle can reveal patterns and help you prepare.',
    ],
  },
};

export default function ArticleDetailPage() {
  const nav = useNavigate();
  const { slug } = useParams();
  const article = articleData[slug || '1'] || articleData['1'];

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/articles')} className="text-xl hover:text-rose-500 transition-colors">&#8592;</button>
        <h1 className="text-lg font-bold">Article</h1>
      </div>
      <div className="px-5 pt-4">
        <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl h-48 flex items-center justify-center text-6xl mb-6">&#128221;</div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-600">{article.cat}</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-3 leading-tight">{article.title}</h1>
        <div className="flex items-center gap-3 mt-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600">{article.initials}</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{article.by}</p>
            <p className="text-xs text-gray-400">{article.time} read</p>
          </div>
        </div>
        <div className="mt-6 text-sm text-gray-600 leading-relaxed space-y-4">
          {article.content.map((para, i) =>
            para.startsWith('## ') ? (
              <h3 key={i} className="text-base font-bold text-gray-900">{para.slice(3)}</h3>
            ) : (
              <p key={i}>{para}</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
