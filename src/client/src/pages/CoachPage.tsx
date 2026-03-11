// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';
import { useAuthStore } from '../stores/authStore';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const QUICK_CHIPS = [
  { label: 'Why do I have cramps? 🩸', q: 'Why do I have cramps?' },
  { label: 'Is my cycle regular? 📊', q: 'Is my cycle regular?' },
  { label: 'What should I eat today? 🥗', q: 'What should I eat today?' },
  { label: 'Help with PMS mood 😔', q: 'Help me with PMS mood' },
  { label: 'Am I in fertile window? 💜', q: 'Am I in my fertile window?' },
  { label: 'Yoga for today? 🧘', q: 'What yoga is best for today?' },
];

function generateAIResponse(message: string, ctx: { cycleDay: number; phase: string; goal: string }): string {
  const msg = message.toLowerCase();
  const { cycleDay, phase, goal } = ctx;

  if (msg.includes('cramp') || msg.includes('pain')) {
    return `Cramps are caused by prostaglandins making your uterus contract during menstruation. Here's what helps:\n\n🌡️ Warm compress on lower abdomen\n🧘 Child's Pose or Butterfly Pose yoga\n🫖 Ginger tea with honey (anti-inflammatory)\n💊 Magnesium 400mg daily reduces severity\n🥬 Iron-rich foods: spinach, lentils, dates\n\nYou're currently on Day ${cycleDay} (${phase} phase). ${phase === 'menstrual' ? 'Rest is completely valid right now! ❤️' : 'If cramps occur outside your period, consider tracking them.'}\n\n🩺 For medical concerns, please consult a doctor.`;
  }

  if (msg.includes('eat') || msg.includes('food') || msg.includes('diet') || msg.includes('nutrition')) {
    const foods: Record<string, string> = {
      menstrual: '🥬 Iron-rich: spinach, lentils, red meat\n🫖 Warm ginger or chamomile tea\n🍫 Dark chocolate (magnesium!)\n🚫 Avoid: caffeine, salty snacks',
      follicular: '🥑 Healthy fats: avocado, nuts\n🫐 Antioxidant berries\n🥦 Cruciferous veggies (broccoli, kale)\n🥚 Protein-rich: eggs, legumes',
      ovulation: '🥗 High-fiber foods\n🌾 Whole grains and complex carbs\n🥜 Zinc-rich seeds and nuts\n💧 Stay extra hydrated',
      luteal: '🌰 Magnesium: almonds, pumpkin seeds\n🍠 Complex carbs: sweet potato, oats\n🫐 Anti-inflammatory: berries, turmeric\n🚫 Reduce: sugar, alcohol, caffeine',
    };
    return `For your ${phase} phase (Day ${cycleDay}), focus on:\n\n${foods[phase] || foods.follicular}\n\n💡 Eating phase-aligned foods can reduce PMS symptoms by up to 50%!\n\n🩺 For personalized nutrition, consult a registered dietitian.`;
  }

  if (msg.includes('regular') || msg.includes('irregular') || msg.includes('cycle length')) {
    return `A regular cycle is 21-35 days with consistent timing (±2-3 days). You're on Day ${cycleDay} now.\n\n📊 To assess regularity accurately, you need at least 3-6 logged cycles. Keep logging!\n\nCommon causes of irregularity:\n😰 Stress (raises cortisol, disrupts ovulation)\n⚖️ Significant weight change\n🏃 Over-exercising\n🦠 Thyroid issues or PCOS\n\n💡 Log consistently for 3 months for a clear picture.\n\n🩺 If cycles vary more than 7 days regularly, consult a gynecologist.`;
  }

  if (msg.includes('pms') || msg.includes('mood') || msg.includes('irritable') || msg.includes('anxious') || msg.includes('sad')) {
    return `PMS mood changes are real and caused by dropping estrogen + progesterone in the luteal phase. You're in the ${phase} phase.\n\n✅ Evidence-based relief:\n😌 5-min mindfulness meditation (reduces cortisol)\n🧘 Gentle yoga (30% cortisol reduction)\n🌰 Magnesium 400mg daily\n☀️ 15-min morning sunlight walk\n📵 Reduce social media (comparison worsens mood)\n🚫 Limit caffeine — it amplifies anxiety\n\n💡 Tracking mood helps predict your pattern so you can plan ahead!\n\n🩺 If PMS severely impacts daily life, PMDD treatment is available — please consult a doctor.`;
  }

  if (msg.includes('fertile') || msg.includes('ovulation') || msg.includes('conceive') || msg.includes('pregnant') || msg.includes('ttc')) {
    const ovDay = 28 - 14;
    const fertStart = Math.max(1, ovDay - 5);
    return `Your fertile window is typically Days ${fertStart}-${ovDay + 1} of your cycle. You're on Day ${cycleDay}.\n\n💜 Peak fertility: Day ${ovDay - 1} to ${ovDay + 1}\n🌟 Ovulation signs:\n  💧 Clear, stretchy (egg-white) cervical mucus\n  🌡️ Basal temp rises 0.2°C after ovulation\n  🌸 Mild pelvic ache (mittelschmerz)\n\n💡 Sperm survive 5 days — timing intercourse 2-3 days before ovulation maximizes chances!\n\n🩺 If trying for 12+ months (or 6m if 35+) without success, consult a fertility specialist.`;
  }

  if (msg.includes('yoga') || msg.includes('exercise') || msg.includes('workout') || msg.includes('fitness')) {
    const yogaMap: Record<string, string> = {
      menstrual: 'Child\'s Pose 🧎, Supine Twist 🔄, Butterfly Pose 🦋\n(Gentle, restorative — 10-15 min)',
      follicular: 'Sun Salutation ☀️, Warrior I & II 💪, Vinyasa Flow\n(Energizing — 20-40 min)',
      ovulation: 'Backbends 🌈, Camel Pose 🐪, Dance Flow 💃\n(High energy — 30-45 min)',
      luteal: 'Yin Yoga 🌙, Forward Folds 🙇, Restorative poses\n(Calming — 20-30 min)',
    };
    return `Best exercise for your ${phase} phase (Day ${cycleDay}):\n\n🧘 ${yogaMap[phase] || yogaMap.follicular}\n\n💡 Cycle-syncing exercise respects your hormonal energy levels and reduces injury risk.\n\n🩺 Listen to your body. Consult a physiotherapist for chronic pain or injuries.`;
  }

  if (msg.includes('sleep') || msg.includes('insomnia') || msg.includes('tired') || msg.includes('fatigue')) {
    return `Sleep changes throughout your cycle are normal:\n\n${phase === 'luteal' ? '😴 Luteal phase: progesterone makes you feel drowsier but reduces sleep quality. You may wake more.' : ''}\n${phase === 'menstrual' ? '😪 Period phase: iron loss can cause fatigue. Extra rest is totally valid!' : ''}\n${phase === 'follicular' ? '⚡ Follicular phase: estrogen rises, often improving energy and sleep quality.' : ''}\n\n🌙 Better sleep tips:\n⏰ Keep consistent sleep/wake times\n📵 No screens 1 hour before bed\n🌡️ Cool room (65-68°F / 18-20°C) is optimal\n🫖 Chamomile or ashwagandha tea\n🧘 5-min breathing exercise before bed\n\n🩺 If fatigue is severe and ongoing, check your iron and thyroid levels.`;
  }

  return `I'm here to support your wellness journey! 🌸\n\nYou're on Day ${cycleDay} of your cycle in the ${phase} phase.\n\n${phase === 'menstrual' ? '🩸 Menstrual phase: Rest, nourish, and be gentle with yourself.' : ''}${phase === 'follicular' ? '🌱 Follicular phase: Energy is rising! Great time for new beginnings.' : ''}${phase === 'ovulation' ? '✨ Ovulation phase: Peak energy and confidence. You\'re glowing!' : ''}${phase === 'luteal' ? '🍂 Luteal phase: Wind down and practice self-care.' : ''}\n\nI can help with:\n• Phase-specific nutrition & exercise\n• Cycle insights & predictions\n• PMS and symptom management\n• Fertility window guidance\n• Ayurvedic wellness tips\n\nWhat would you like to know? 💜\n\n🩺 I provide wellness guidance only. Always consult a doctor for medical advice.`;
}

export default function CoachPage() {
  const nav = useNavigate();
  const { cycleDay, phase, goal } = useCycleStore();
  const user = useAuthStore(s => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const welcome: Message = {
      id: 'welcome',
      role: 'ai',
      text: `Hi ${user?.fullName?.split(' ')[0] || 'there'}! I'm your VedaClue AI Wellness Coach 🌸\n\nI can see you're on Day ${cycleDay} of your cycle in the ${phase} phase — so I can give you truly personalized advice!\n\nAsk me anything about your cycle, nutrition, exercise, or wellness. 💜\n\n🩺 Note: I provide wellness guidance only. Always consult a doctor for medical concerns.`,
      timestamp: new Date(),
    };
    setMessages([welcome]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { id: 'u_' + Date.now(), role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const reply = generateAIResponse(text, { cycleDay, phase, goal });
      const aiMsg: Message = { id: 'a_' + Date.now(), role: 'ai', text: reply, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, delay);
  };

  const handleSend = () => sendMessage(input);
  const handleChip = (q: string) => { sendMessage(q); inputRef.current?.blur(); };

  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.95)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform text-sm font-bold">←</button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>🤖</div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900">AI Wellness Coach</h1>
            <p className="text-[9px] text-emerald-500 font-bold">● Online · Powered by VedaClue AI</p>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {QUICK_CHIPS.map(c => (
            <button key={c.q} onClick={() => handleChip(c.q)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-600 active:scale-95 transition-transform whitespace-nowrap">
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-extrabold ${
              msg.role === 'ai'
                ? 'text-white'
                : 'text-white'
            }`} style={{
              background: msg.role === 'ai' ? 'linear-gradient(135deg,#7C3AED,#EC4899)' : 'linear-gradient(135deg,#E11D48,#F43F5E)'
            }}>
              {msg.role === 'ai' ? '🤖' : (user?.fullName?.charAt(0) || 'U')}
            </div>
            {/* Bubble */}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'rounded-br-sm text-white'
                  : 'bg-white rounded-bl-sm text-gray-700 border border-gray-100'
              }`} style={msg.role === 'user' ? { background: 'linear-gradient(135deg,#E11D48,#F43F5E)' } : {}}>
                {msg.text}
              </div>
              <span className="text-[8px] text-gray-400 px-1">{fmt(msg.timestamp)}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs" style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>🤖</div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: i * 0.15 + 's' }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-200">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your health..."
            className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#E11D48,#F43F5E)' }}>
            <span className="text-white text-xs font-bold">→</span>
          </button>
        </div>
        <p className="text-center text-[8px] text-gray-400 mt-1.5">Not a substitute for medical advice 🩺</p>
      </div>
    </div>
  );
}
