// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const SECTIONS = [
  {
    title: 'Who We Are',
    content: `VedaClue is an Ayurvedic women's wellness platform founded by Sugandhika Patil, operated by VedaClue, based in Bengaluru, Karnataka, India.

Website: vedaclue.com
Contact: vedaclue@gmail.com

Grievance Officer (as required under IT Act 2000):
Name: Sugandhika Patil
Designation: Founder, VedaClue
Email: vedaclue@gmail.com
Response time: within 24 hours of complaint`,
  },
  {
    title: 'Information We Collect',
    content: `Information you provide:
• Full name and profile photo
• Mobile number (for OTP login)
• Email address
• Date of birth
• Menstrual cycle data and health logs
• Health concerns and symptoms
• Appointment details and prescriptions
• Payment information (processed by Razorpay)
• Community posts and replies
• Product orders and delivery address
• GST number (if applicable for business orders)

Information collected automatically:
• Device type and browser information
• IP address and approximate location
• App usage patterns and feature interactions
• Push notification subscription data

Information we do NOT collect:
• We do not store payment card details (handled entirely by Razorpay)
• We do not sell your data to third parties
• We do not share health data with insurers`,
  },
  {
    title: 'How We Use Your Information',
    content: `• To provide personalised wellness tracking
• To connect you with Ayurvedic doctors
• To process product orders and payments
• To send appointment reminders and updates
• To improve our platform and features
• To send health tips (with your consent)
• To comply with legal obligations in India
• To prevent fraud and ensure platform security
• To issue GST-compliant invoices for orders`,
  },
  {
    title: 'Health Data — Special Protection',
    content: `Your menstrual cycle data, health logs, prescriptions and medical information are:
• Stored encrypted in our secure database
• Never shared with employers or insurers
• Never sold to advertisers
• Only shared with doctors you book with
• Deleted upon your account deletion request

Health Disclaimer:
Content on VedaClue is for wellness and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for serious medical conditions.`,
  },
  {
    title: 'Anonymous Community Posts',
    content: `When you post anonymously in our community:
• Your name is hidden from other users
• Our moderation team can see your identity for safety and legal compliance
• Anonymous does not mean untraceable — we may disclose identity if legally required`,
  },
  {
    title: 'Data Sharing',
    content: `We share your data only with:
• Razorpay — payment processing
• SendGrid — email delivery
• Cloudinary — image storage
• Railway — secure cloud hosting
• Doctors on VedaClue — only when you book an appointment with them
• Law enforcement — only when legally required

We never sell your personal data.`,
  },
  {
    title: 'Third Party Links',
    content: `VedaClue may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those external sites. Please review their privacy policies before sharing any data.`,
  },
  {
    title: 'Data Retention',
    content: `• Active account data: retained while account is active
• Order history: 7 years (legal requirement)
• Deleted accounts: data removed within 30 days except legal records
• Push notification tokens: deleted on unsubscribe or account deletion`,
  },
  {
    title: 'Your Rights (India — DPDP Act 2023)',
    content: `You have the right to:
• Access your personal data
• Correct inaccurate data
• Delete your account and data
• Withdraw consent for marketing emails
• Export your health data (CSV)
• Raise a grievance with our team
• Nominate a representative for your data in case of death or incapacity

To exercise any right:
Email: vedaclue@gmail.com
Response time: within 30 days`,
  },
  {
    title: 'Cookies',
    content: `We use minimal cookies for:
• Keeping you logged in (session)
• Remembering your preferences

We do not use advertising or tracking cookies.`,
  },
  {
    title: "Children's Privacy",
    content: `VedaClue is intended for users aged 18+. We do not knowingly collect data from anyone under 18. If you believe a minor has registered, contact us immediately at vedaclue@gmail.com.`,
  },
  {
    title: 'App Stores',
    content: `If you access VedaClue through Google Play or Apple App Store, their respective terms of service and privacy policies also apply. We are not responsible for practices of Google LLC or Apple Inc.`,
  },
  {
    title: 'Changes to This Policy',
    content: `We will notify you via email or in-app notification before making material changes to this Privacy Policy.`,
  },
  {
    title: 'Contact & Grievance Officer',
    content: `Grievance Officer (IT Act 2000):
Name: Sugandhika Patil
Designation: Founder, VedaClue
Email: vedaclue@gmail.com
Address: Bengaluru, Karnataka — 560100
Response time: within 24 hours

Complaints acknowledged within 24 hours and resolved within 30 days as per IT Act 2000 requirements.`,
  },
];

export default function PrivacyPolicyPage() {
  const nav = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50" style={{ fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">
            <span className="text-gray-600">&#8592;</span>
          </button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Privacy Policy</h1>
            <p className="text-[9px] text-gray-400">Last updated: March 2026</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Intro card */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-xl shadow-md">
              <span className="text-white">&#128274;</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-800">Your Privacy Matters</p>
              <p className="text-[10px] text-gray-400">We protect your data with care</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            This policy explains how VedaClue collects, uses, and protects your personal information in compliance with Indian data protection laws.
          </p>
        </div>

        {/* Accordion Sections */}
        {SECTIONS.map((sec, i) => (
          <div key={i} className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-[11px] font-extrabold text-rose-500">
                  {i + 1}
                </span>
                <span className="text-sm font-bold text-gray-800">{sec.title}</span>
              </div>
              <span className={'text-gray-300 text-lg transition-transform duration-300 ' + (open === i ? 'rotate-180' : '')}>
                &#8964;
              </span>
            </button>
            {open === i && (
              <div className="px-5 pb-4 border-t border-gray-50">
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line pt-3">{sec.content}</p>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-[10px] text-gray-400">
            Questions? Email us at{' '}
            <a href="mailto:vedaclue@gmail.com" className="text-rose-500 font-bold">vedaclue@gmail.com</a>
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
