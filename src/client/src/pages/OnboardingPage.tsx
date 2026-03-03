import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const slides = [
  { emoji: '&#127800;', title: 'Track Your Cycle', desc: 'Predict periods, fertile windows, and ovulation with precision' },
  { emoji: '&#129328;', title: 'Pregnancy Journey', desc: 'Week-by-week tracking with expert-backed milestones' },
  { emoji: '&#128588;', title: 'Wellness Hub', desc: 'Meditation, yoga, and stress relief tailored to your phase' },
  { emoji: '&#128105;&#8205;&#9877;&#65039;', title: 'Find Doctors', desc: 'Book verified specialists with transparent pricing' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex flex-col p-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-7xl mb-6" dangerouslySetInnerHTML={{ __html: slides[step].emoji }} />
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{slides[step].title}</h2>
        <p className="text-gray-500 max-w-xs">{slides[step].desc}</p>
      </div>
      <div className="flex justify-center gap-2 mb-8">
        {slides.map((_, i) => (
          <div key={i} className={'w-2 h-2 rounded-full transition-all ' + (i === step ? 'w-8 bg-rose-500' : 'bg-gray-300')} />
        ))}
      </div>
      <button
        onClick={() => step < 3 ? setStep(step + 1) : navigate('/auth')}
        className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold text-lg shadow-lg"
      >
        {step < 3 ? 'Next' : 'Get Started'}
      </button>
      {step < 3 && (
        <button onClick={() => navigate('/auth')} className="mt-3 text-gray-400 text-sm">
          Skip
        </button>
      )}
    </div>
  );
}
