// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const FAQ_SECTIONS = [
  {
    category: 'Account & Login',
    items: [
      { q: 'How do I create an account?', a: 'You can sign up using your email address or mobile number (OTP). Go to the Sign In page and choose "Sign Up" tab or use the Phone OTP option.' },
      { q: 'I forgot my password. How do I reset it?', a: 'On the Sign In page, click "Forgot password?" below the login button. Enter your registered email and we\'ll send you a password reset link.' },
      { q: 'Can I change my email or phone number?', a: 'Yes. Go to Profile \u2192 Settings \u2192 Edit Profile. You can update your email, phone, and other details.' },
      { q: 'How do I delete my account?', a: 'Go to Profile \u2192 Settings \u2192 Privacy \u2192 Delete Account. Your data will be removed within 30 days as per our Privacy Policy.' },
    ],
  },
  {
    category: 'Cycle Tracking',
    items: [
      { q: 'How do I log my period?', a: 'Go to the Tracker tab and tap the day your period started. You can also log flow intensity, symptoms, and mood daily.' },
      { q: 'How accurate are the predictions?', a: 'Predictions improve over time as you log more cycles. After 3 complete cycles, predictions become significantly more accurate with our Ayurvedic dosha-based algorithm.' },
      { q: 'Can I track pregnancy instead?', a: 'Yes! If you\'re pregnant, switch to Pregnancy mode from the Tracker page. You\'ll get week-by-week Ayurvedic guidance and milestone tracking.' },
    ],
  },
  {
    category: 'Doctor Consultations',
    items: [
      { q: 'How do I book a consultation?', a: 'Go to Doctors tab \u2192 Select a doctor \u2192 Choose a time slot \u2192 Complete payment. You\'ll receive a video meeting link via email and in-app.' },
      { q: 'How do video consultations work?', a: 'After booking, you\'ll get a Jitsi Meet video link. Click the link at your appointment time to join. No app download needed \u2014 works in your browser.' },
      { q: 'What is the cancellation policy?', a: 'Cancel 2+ hours before: full refund. Cancel within 2 hours: no refund. Doctor no-show: full refund within 5 business days.' },
      { q: 'Are the doctors verified?', a: 'Yes. All doctors on VedaClue are verified Ayurvedic practitioners with valid BAMS/MD degrees. Our team verifies qualifications before onboarding.' },
    ],
  },
  {
    category: 'Orders & Payments',
    items: [
      { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and wallets via Razorpay. COD is available on select pincodes for orders under \u20B92000.' },
      { q: 'How do I track my order?', a: 'Go to Profile \u2192 My Orders. You\'ll see tracking details once your order is dispatched. Tracking link is also sent via email and SMS.' },
      { q: 'How long does delivery take?', a: 'Standard delivery: 5-7 business days. Remote areas: 7-10 business days. Free shipping on orders above \u20B9499.' },
      { q: 'How do I return a product?', a: 'Email vedaclue@gmail.com within 48 hours of delivery with your order ID and photos. Damaged/wrong items get full refund or replacement.' },
      { q: 'When will I get my refund?', a: 'Refunds are processed within 5-7 business days to your original payment method. UPI refunds may be faster (1-3 days).' },
    ],
  },
  {
    category: 'Community',
    items: [
      { q: 'Can I post anonymously?', a: 'Yes. Toggle the anonymous option when creating a post. Your name will be hidden from other users. However, our moderation team can see your identity for safety.' },
      { q: 'How do I report inappropriate content?', a: 'Tap the report button on any post or reply. Choose a reason and submit. Our team reviews all reports within 24 hours.' },
      { q: 'Can I edit or delete my posts?', a: 'Yes, within 30 minutes of posting. After that, posts are permanent. Look for the edit/delete buttons on your own posts.' },
    ],
  },
  {
    category: 'Programs & Courses',
    items: [
      { q: 'Are program purchases refundable?', a: 'Program and course sales are final. If you face technical issues, contact support within 7 days and we\'ll resolve it or issue a refund.' },
      { q: 'Can I share my program access?', a: 'No. Program access is for personal use only. Sharing or redistributing content violates our Terms and may result in access revocation.' },
    ],
  },
  {
    category: 'Privacy & Security',
    items: [
      { q: 'Is my health data safe?', a: 'Yes. All health data is encrypted and stored securely. We never sell your data to third parties, advertisers, or insurers. See our Privacy Policy for details.' },
      { q: 'Do you share my data with anyone?', a: 'Only with services needed to operate (Razorpay for payments, doctors you book with). We never sell personal data. Full details in our Privacy Policy.' },
      { q: 'Can I export my data?', a: 'Yes. Go to Profile \u2192 Settings \u2192 Privacy \u2192 Export my data. You\'ll receive a CSV file of your health data.' },
    ],
  },
];

export default function HelpCenterPage() {
  const nav = useNavigate();
  const [openCat, setOpenCat] = useState<number>(0);
  const [openQ, setOpenQ] = useState<string | null>(null);

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50" style={{ fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">
            <span className="text-gray-600">&#8592;</span>
          </button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Help Center</h1>
            <p className="text-[9px] text-gray-400">Find answers to common questions</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Quick contact */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-5 text-center shadow-xl shadow-rose-200">
          <span className="text-3xl block mb-2">&#128172;</span>
          <p className="text-sm font-extrabold text-white">Need help?</p>
          <p className="text-[10px] text-rose-100 mt-1 leading-relaxed">
            Can't find your answer below? Reach out to us directly.
          </p>
          <a href="mailto:vedaclue@gmail.com"
            className="inline-block mt-3 px-6 py-2.5 bg-white text-rose-600 rounded-2xl font-bold text-xs active:scale-95 transition-all shadow-md">
            Email Support &#8594;
          </a>
          <p className="text-[9px] text-rose-200 mt-2">vedaclue@gmail.com &bull; Response within 24 hours</p>
        </div>

        {/* FAQ Categories */}
        {FAQ_SECTIONS.map((sec, ci) => (
          <div key={ci} className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <button
              onClick={() => setOpenCat(openCat === ci ? -1 : ci)}
              className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-bold text-gray-800">{sec.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">{sec.items.length}</span>
                <span className={'text-gray-300 text-lg transition-transform duration-300 ' + (openCat === ci ? 'rotate-180' : '')}>
                  &#8964;
                </span>
              </div>
            </button>
            {openCat === ci && (
              <div className="border-t border-gray-50">
                {sec.items.map((faq, qi) => {
                  const key = `${ci}-${qi}`;
                  return (
                    <div key={qi} className={qi < sec.items.length - 1 ? 'border-b border-gray-50' : ''}>
                      <button
                        onClick={() => setOpenQ(openQ === key ? null : key)}
                        className="w-full flex items-center justify-between px-5 py-3 text-left active:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-700 flex-1 pr-3">{faq.q}</span>
                        <span className={'text-rose-300 text-sm transition-transform duration-200 flex-shrink-0 ' + (openQ === key ? 'rotate-45' : '')}>+</span>
                      </button>
                      {openQ === key && (
                        <div className="px-5 pb-3">
                          <p className="text-[11px] text-gray-500 leading-relaxed bg-rose-50 rounded-xl p-3">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Quick links */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <p className="text-xs font-extrabold text-gray-800 mb-3">Quick Links</p>
          <div className="space-y-2">
            {[
              { label: 'Privacy Policy', path: '/privacy-policy', icon: '&#128274;' },
              { label: 'Terms & Conditions', path: '/terms-conditions', icon: '&#128220;' },
              { label: 'Shipping Policy', path: '/shipping-policy', icon: '&#128230;' },
              { label: 'Refund & Cancellation', path: '/refund-policy', icon: '&#128176;' },
              { label: 'About VedaClue', path: '/about-us', icon: '&#127800;' },
            ].map(link => (
              <button key={link.path} onClick={() => nav(link.path)}
                className="w-full flex items-center gap-3 py-2.5 text-left active:bg-gray-50 transition-colors rounded-xl">
                <span className="text-sm" dangerouslySetInnerHTML={{ __html: link.icon }} />
                <span className="flex-1 text-xs font-semibold text-gray-600">{link.label}</span>
                <span className="text-gray-300 text-sm">&#8250;</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400">
            VedaClue Support &bull; Bengaluru, Karnataka — 560100
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
