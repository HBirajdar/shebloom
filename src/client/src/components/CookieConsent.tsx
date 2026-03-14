// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LS_KEY = 'vedaclue_cookie_consent';

export default function CookieConsent() {
  const nav = useNavigate();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) !== 'true') {
        setVisible(true);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try { localStorage.setItem(LS_KEY, 'true'); } catch {}
    setFading(true);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={'fixed bottom-24 left-0 right-0 z-[9999] flex justify-center transition-opacity duration-300 ' + (fading ? 'opacity-0' : 'opacity-100')}
      style={{ fontFamily: 'Nunito, sans-serif' }}
    >
      <div className="max-w-[430px] w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            We use cookies to enhance your experience on VedaClue. By continuing, you agree to our use of cookies.{' '}
            <button onClick={() => nav('/privacy-policy')} className="text-rose-500 font-bold underline">Privacy Policy</button>
          </p>
          <button
            onClick={handleAccept}
            className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-xs active:scale-95 transition-all shadow-md shadow-rose-200"
          >
            Got it {'\u2713'}
          </button>
        </div>
      </div>
    </div>
  );
}
