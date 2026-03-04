import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';

const programs = [
  { id: 'pcod', title: 'PCOD/PCOS Reversal', subtitle: '90-Day Ayurvedic Protocol', emoji: '\u{1F33F}', duration: '90 days', color: '#059669', bg: '#ECFDF5',
    desc: 'Complete lifestyle program designed by Dr. Shruti. Diet, herbs, yoga, and tracking — everything you need to manage PCOD naturally.',
    who: 'Women diagnosed with PCOD/PCOS or experiencing irregular periods, acne, weight gain, or excess hair growth.',
    phases: [
      { week: '1-2', title: 'Detox & Reset', tasks: ['Eliminate sugar, dairy, processed foods', 'Start Triphala at bedtime', 'Morning warm lemon water', '30 min walk daily', 'Sleep by 10 PM'] },
      { week: '3-4', title: 'Herb Introduction', tasks: ['Start Shatavari (1 tsp with milk)', 'Add Ashwagandha (500mg twice daily)', 'Anti-inflammatory meals (turmeric, ginger)', 'Yoga: Butterfly pose, Supta Baddha Konasana', 'Track symptoms daily in app'] },
      { week: '5-8', title: 'Deep Healing', tasks: ['Continue herbs consistently', 'Add Kanchanar Guggulu (with doctor guidance)', 'Strength training 3x/week', 'Cinnamon daily (improves insulin sensitivity)', 'Reduce screen time, increase sunlight'] },
      { week: '9-12', title: 'Sustain & Track', tasks: ['Monitor cycle regularity', 'Adjust herbs based on progress', 'Monthly check-in with Dr. Shruti', 'Maintain diet and exercise', 'Celebrate your progress!'] },
    ],
    diet: ['No refined sugar (use jaggery, honey)', 'Minimize dairy (try almond/coconut milk)', 'Complex carbs: brown rice, oats, millets', 'Protein every meal: dal, paneer, eggs, nuts', 'Anti-inflammatory: turmeric, ginger, leafy greens', 'Cinnamon in tea daily', 'Avoid: packaged foods, white bread, maida'],
    herbs: ['Shatavari — hormone regulation', 'Ashwagandha — stress & cortisol', 'Triphala — detox & metabolism', 'Kanchanar Guggulu — cyst reduction', 'Lodhra — androgen balance', 'Guduchi — immune support'],
    yoga: ['Butterfly Pose (Baddha Konasana) — 5 min', 'Supta Baddha Konasana — 5 min', 'Cat-Cow — 10 rounds', 'Bridge Pose — hold 30 sec x 5', 'Pranayama: Anulom Vilom — 10 min', 'Walking — 30 min daily'] },

  { id: 'cycle_sync', title: 'Cycle Syncing Lifestyle', subtitle: 'Work WITH Your Hormones', emoji: '\u{1F300}', duration: '28-day cycle', color: '#7C3AED', bg: '#F5F3FF',
    desc: 'Align your diet, exercise, work, and social life with your menstrual phases. Stop fighting your biology — use it as a superpower.',
    who: 'Any woman who wants to optimize energy, productivity, fitness, and mood by understanding her cycle.',
    phases: [
      { week: 'Period (Day 1-5)', title: 'Inner Winter — Rest', tasks: ['Light meals: soups, stews, warm foods', 'Gentle yoga or walking only', 'Journal, reflect, set intentions', 'Say no to extra commitments', 'Iron-rich foods: dates, spinach, jaggery'] },
      { week: 'Follicular (Day 6-12)', title: 'Inner Spring — Create', tasks: ['Start new projects and plans', 'High-intensity workouts', 'Schedule important meetings', 'Try new recipes and experiences', 'Social events and networking'] },
      { week: 'Ovulation (Day 13-16)', title: 'Inner Summer — Shine', tasks: ['Public speaking, presentations', 'Ask for that raise or promotion', 'Date nights and social events', 'HIIT and strength training', 'Creative peak — write, paint, create'] },
      { week: 'Luteal (Day 17-28)', title: 'Inner Autumn — Complete', tasks: ['Finish projects, organize, admin', 'Complex carbs: sweet potato, oats', 'Gentle exercise: yoga, swimming', 'Extra sleep (body needs more)', 'Dark chocolate for magnesium!'] },
    ],
    diet: ['Period: Warm, iron-rich, comforting foods', 'Follicular: Light, fresh, energizing foods', 'Ovulation: Raw salads, fruits, social meals', 'Luteal: Complex carbs, magnesium-rich, warming'],
    herbs: ['Period: Ajwain water, ginger tea', 'Follicular: Green smoothies, amla', 'Ovulation: Shatavari, cooling herbs', 'Luteal: Ashwagandha, chamomile tea'],
    yoga: ['Period: Child\'s pose, savasana, gentle stretching', 'Follicular: Sun salutations, power yoga', 'Ovulation: Dance, HIIT, strength', 'Luteal: Yin yoga, pilates, walking'] },

  { id: 'fertility', title: 'Fertility Boost', subtitle: '90-Day Conception Protocol', emoji: '\u{1F495}', duration: '90 days', color: '#EC4899', bg: '#FDF2F8',
    desc: 'Ayurvedic Vajikarana protocol combined with modern fertility science. For couples who are trying to conceive naturally.',
    who: 'Women trying to conceive, especially those with unexplained infertility or who have been trying for 6+ months.',
    phases: [
      { week: '1-4', title: 'Prepare & Detox', tasks: ['Both partners: stop alcohol, reduce caffeine', 'Start Shatavari + Ashwagandha', 'Folate-rich foods for both partners', 'Reduce stress: daily meditation 10 min', 'Track BBT and cervical mucus'] },
      { week: '5-8', title: 'Nourish', tasks: ['Saffron milk at bedtime', 'Dates with ghee daily', 'Pomegranate juice (improves uterine blood flow)', 'Partner: Safed Musli + zinc-rich foods', 'Time intercourse: Days 10-16 of cycle'] },
      { week: '9-12', title: 'Optimize', tasks: ['Continue all herbs', 'BBT chart should show ovulation', 'Intercourse every 1-2 days during fertile window', 'Lie still 15 min after intercourse', 'If not pregnant, consult Dr. Shruti for next steps'] },
    ],
    diet: ['Shatavari milk at bedtime', 'Dates with ghee (4-5 daily)', 'Pomegranate (improves uterine blood flow)', 'Soaked almonds (7 daily)', 'Black sesame seeds', 'A2 cow milk with turmeric', 'Avoid: excess caffeine, alcohol, soy, processed food'],
    herbs: ['Shatavari — #1 female fertility herb', 'Ashwagandha — reduces cortisol', 'Lodhra — regulates ovulation', 'Guduchi — immune balance', 'For him: Safed Musli + Shilajit'],
    yoga: ['Supta Baddha Konasana — opens pelvis', 'Viparita Karani — legs up wall (after intercourse)', 'Pranayama — Nadi Shodhana', 'Walking 30 min daily', 'Avoid hot yoga and extreme exercise'] },

  { id: 'menopause', title: 'Menopause Wellness', subtitle: 'Graceful Transition', emoji: '\u{1F343}', duration: 'Ongoing', color: '#D97706', bg: '#FFFBEB',
    desc: 'Navigate perimenopause and menopause with Ayurvedic wisdom. Manage hot flashes, mood, sleep, and bone health naturally.',
    who: 'Women aged 40-55 experiencing irregular periods, hot flashes, mood changes, sleep disturbances, or diagnosed with perimenopause/menopause.',
    phases: [
      { week: 'Month 1', title: 'Foundation', tasks: ['Start Shatavari (1 tsp twice daily)', 'Calcium + Vitamin D supplement', 'Morning sunlight 15 min daily', 'Reduce caffeine and spicy foods', 'Cooling pranayama (Sheetali)'] },
      { week: 'Month 2', title: 'Symptom Management', tasks: ['Add Ashoka bark for hot flashes', 'Weight-bearing exercise (bone health)', 'Sleep hygiene: dark room, 10 PM', 'Flaxseed daily (phytoestrogens)', 'Track symptoms in app'] },
      { week: 'Month 3+', title: 'Long-term Wellness', tasks: ['Continue herbs and lifestyle', 'Regular bone density awareness', 'Pelvic floor exercises (Kegels)', 'Social connections (reduce isolation)', 'Celebrate this new chapter'] },
    ],
    diet: ['Phytoestrogens: flaxseed, soy (moderate), sesame', 'Calcium: dairy, ragi, sesame, leafy greens', 'Omega-3: walnuts, flaxseed', 'Cooling foods: cucumber, coconut water, mint', 'Avoid: alcohol, caffeine, very spicy food, sugar'],
    herbs: ['Shatavari — #1 menopause herb', 'Ashoka bark — hot flash relief', 'Ashwagandha — mood and sleep', 'Brahmi — memory and focus', 'Jatamansi — sleep aid'],
    yoga: ['Gentle yoga daily', 'Cat-cow for spine flexibility', 'Bridge pose for pelvic floor', 'Walking 30-45 min daily', 'Weight-bearing: light dumbbells'] },
];

export default function ProgramsPage() {
  const nav = useNavigate();
  const { getChiefDoctor } = useAyurvedaStore();
  const { goal } = useCycleStore();
  const chief = getChiefDoctor();
  const [selProgram, setSelProgram] = useState<typeof programs[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'diet' | 'herbs' | 'yoga'>('plan');

  // Sort: goal-matched programs first
  const sorted = [...programs].sort((a, b) => {
    const aMatch = (goal === 'fertility' && a.id === 'fertility') || (goal === 'periods' && (a.id === 'pcod' || a.id === 'cycle_sync')) || (goal === 'wellness' && a.id === 'cycle_sync');
    const bMatch = (goal === 'fertility' && b.id === 'fertility') || (goal === 'periods' && (b.id === 'pcod' || b.id === 'cycle_sync')) || (goal === 'wellness' && b.id === 'cycle_sync');
    return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
  });

  // Full-screen program view
  if (selProgram) {
    const p = selProgram;
    return (
      <div className="min-h-screen bg-white pb-10">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => setSelProgram(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
          <div className="flex-1 min-w-0"><h1 className="text-sm font-extrabold text-gray-900 truncate">{p.title}</h1><p className="text-[9px] text-gray-400">{p.duration}</p></div>
        </div>

        {/* Hero */}
        <div className="px-5 pt-5 pb-4">
          <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}CC)` }}>
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full" />
            <span className="text-4xl">{p.emoji}</span>
            <h2 className="text-xl font-extrabold mt-2">{p.title}</h2>
            <p className="text-xs text-white/80 mt-1">{p.subtitle}</p>
            <p className="text-[10px] text-white/70 mt-2">{p.desc}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full">{'\u23F1'} {p.duration}</span>
              <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full">{'\u{1F469}\u200D\u2695\uFE0F'} By {chief.name}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mb-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {([['plan', '\u{1F4CB} Plan'], ['diet', '\u{1F957} Diet'], ['herbs', '\u{1F33F} Herbs'], ['yoga', '\u{1F9D8} Yoga']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={'flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ' + (activeTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400')}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 space-y-4">
          {activeTab === 'plan' && p.phases.map((phase, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50" style={{ backgroundColor: p.bg }}>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: p.color }}>{phase.week}</p>
                <h3 className="text-sm font-extrabold text-gray-900">{phase.title}</h3>
              </div>
              <div className="p-4 space-y-2">
                {phase.tasks.map((t, j) => (
                  <div key={j} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: p.color }}>{j + 1}</div>
                    <p className="text-xs text-gray-700 leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {activeTab === 'diet' && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
              <h3 className="text-sm font-extrabold text-gray-900 mb-2">{'\u{1F957}'} Diet Plan</h3>
              {p.diet.map((d, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-emerald-500 text-xs mt-0.5">{'\u2713'}</span>
                  <p className="text-xs text-gray-700">{d}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'herbs' && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
              <h3 className="text-sm font-extrabold text-gray-900 mb-2">{'\u{1F33F}'} Ayurvedic Herbs</h3>
              {p.herbs.map((h, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: p.color }}>{i + 1}</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{h}</p>
                </div>
              ))}
              <div className="bg-amber-50 rounded-xl p-3 mt-3 border border-amber-100">
                <p className="text-[10px] text-amber-700">{'\u26A0\uFE0F'} Always consult {chief.name} before starting any herb, especially if you are on medication or pregnant.</p>
              </div>
            </div>
          )}

          {activeTab === 'yoga' && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
              <h3 className="text-sm font-extrabold text-gray-900 mb-2">{'\u{1F9D8}'} Yoga & Exercise</h3>
              {p.yoga.map((y, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-purple-500 text-xs mt-0.5">{'\u2022'}</span>
                  <p className="text-xs text-gray-700">{y}</p>
                </div>
              ))}
            </div>
          )}

          {/* Who is this for */}
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: p.bg, borderColor: p.color + '30' }}>
            <h3 className="text-xs font-bold" style={{ color: p.color }}>Who is this for?</h3>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{p.who}</p>
          </div>

          {/* CTA */}
          <button onClick={() => nav('/appointments')} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}CC)` }}>
            Consult {chief.name} to Start {'\u2192'}
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────
  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
        <div><h1 className="text-base font-extrabold text-gray-900">Wellness Programs</h1><p className="text-[9px] text-gray-400">Doctor-designed protocols for real results</p></div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <h2 className="text-lg font-extrabold">Transform Your Health</h2>
          <p className="text-xs text-white/80 mt-1">Structured programs designed by {chief.name}. Ayurveda + modern science. Real results in 90 days.</p>
        </div>

        {sorted.map(p => (
          <button key={p.id} onClick={() => { setSelProgram(p); setActiveTab('plan'); }}
            className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: p.bg }}>
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-gray-800">{p.title}</h3>
                  {((goal === 'fertility' && p.id === 'fertility') || (goal === 'periods' && p.id === 'pcod')) && (
                    <span className="text-[7px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">For You</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{p.subtitle}</p>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{p.desc}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: p.bg, color: p.color }}>{'\u23F1'} {p.duration}</span>
                  <span className="text-[9px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{'\u{1F469}\u200D\u2695\uFE0F'} {chief.name}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
