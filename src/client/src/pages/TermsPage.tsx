// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    content: `By using VedaClue, you agree to these Terms. If you do not agree, please do not use our platform. These terms are governed by the laws of India. Use of this app via Google Play or Apple App Store is additionally subject to their respective store policies.`,
  },
  {
    title: 'About VedaClue',
    content: `VedaClue is an Ayurvedic wellness platform providing:
• Menstrual cycle and health tracking
• Ayurvedic doctor consultations
• Wellness programs and courses
• Ayurvedic product marketplace
• Women's health community

All Ayurvedic products sold on VedaClue are sourced from AYUSH-compliant sellers. Products are not intended to diagnose, treat, cure, or prevent any disease as per AYUSH Ministry guidelines.

Medical Disclaimer:
VedaClue is a wellness platform, NOT a substitute for emergency medical care. Content is for informational purposes only. Always consult a qualified medical professional for serious conditions. For emergencies call 112.`,
  },
  {
    title: 'Eligibility',
    content: `• You must be 18 years or older
• You must provide accurate information
• One account per person only
• Accounts are non-transferable`,
  },
  {
    title: 'User Accounts',
    content: `You are responsible for:
• Maintaining confidentiality of your login
• All activity under your account
• Notifying us of unauthorised access at vedaclue@gmail.com

We may suspend accounts that violate these terms.`,
  },
  {
    title: 'Community Rules',
    content: `You agree NOT to post:
• Medical misinformation
• Harassment or bullying
• Spam or promotional content
• Personal information of others
• Explicit or offensive content
• Content promoting self-harm

Violations may result in:
• Content removal
• Account suspension
• Permanent ban
• Legal action if required`,
  },
  {
    title: 'Doctor Consultations',
    content: `• Doctors on VedaClue are independent Ayurvedic practitioners
• VedaClue is a platform connecting you with doctors — not a medical provider
• Prescriptions are the doctor's professional responsibility
• For medical emergencies call 112

Cancellation policy:
• Cancel 2+ hours before: full refund
• Cancel within 2 hours: no refund
• Doctor no-show: full refund within 5 days`,
  },
  {
    title: 'Products and Orders',
    content: `• Prices are in Indian Rupees (INR)
• All prices include applicable GST
• GST invoices issued for every order
• Orders confirmed only after payment
• Delivery: 5-7 business days
• All Ayurvedic products are AYUSH-compliant sourced items
• See our full Shipping Policy at /shipping-policy

Return policy:
• Damaged/wrong item: full refund
• Change of mind: not accepted (health products for hygiene reasons)
• Raise return within 48 hours of delivery
• Email: vedaclue@gmail.com

Consumer rights under Consumer Protection Act 2019 are fully applicable.`,
  },
  {
    title: 'Payments',
    content: `• All payments via Razorpay (secure)
• We do not store card details
• Refunds: 5-7 business days to source
• COD available on select pincodes
• Platform fee non-refundable once service is rendered
• GST charged as per applicable rates`,
  },
  {
    title: 'Programs and Courses',
    content: `• All program and course sales are final
• No refunds once purchase is completed
• Technical issues: contact support within 7 days — we will resolve the issue
• Program content is copyrighted — do not share or redistribute
• Access is granted for personal use only
• VedaClue reserves the right to revoke access if terms are violated`,
  },
  {
    title: 'Intellectual Property',
    content: `All content on VedaClue including text, images, logos, programs, and features are owned by VedaClue. You may not:
• Copy or reproduce our content
• Use our brand without permission
• Reverse engineer our platform`,
  },
  {
    title: 'Force Majeure',
    content: `VedaClue is not liable for failure to perform obligations due to events beyond our reasonable control, including:
• Natural disasters or pandemics
• Government actions or regulations
• Internet or infrastructure outages
• Third-party service failures (Razorpay, Railway, Cloudinary, etc.)
• Strikes or civil disturbances

We will resume normal service as soon as reasonably possible.`,
  },
  {
    title: 'Limitation of Liability',
    content: `VedaClue is not liable for:
• Health outcomes from using our content
• Doctor advice or prescriptions
• Third party product quality issues
• Service interruptions
• Indirect or consequential damages

Maximum liability is limited to the amount you paid for the specific service.`,
  },
  {
    title: 'Dispute Resolution',
    content: `Step 1 — Contact us first:
Email: vedaclue@gmail.com
We aim to resolve within 15 business days

Step 2 — If unresolved:
Disputes shall be resolved by arbitration under the Arbitration and Conciliation Act, 1996 (India)
Arbitration seat: Bengaluru, Karnataka

Step 3 — Governing Law:
Laws of India apply
Courts of Bengaluru, Karnataka have exclusive jurisdiction`,
  },
  {
    title: 'Grievance Officer',
    content: `As required under Consumer Protection Act 2019 and IT Act 2000:

Name: Sugandhika Patil
Designation: Founder, VedaClue
Email: vedaclue@gmail.com
Address: Bengaluru, Karnataka — 560100
Response time: within 24 hours`,
  },
];

export default function TermsPage() {
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
            <h1 className="text-base font-extrabold text-gray-900">Terms & Conditions</h1>
            <p className="text-[9px] text-gray-400">Last updated: March 2026</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Intro card */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-xl shadow-md">
              <span className="text-white">&#128220;</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-800">Terms of Service</p>
              <p className="text-[10px] text-gray-400">Please read carefully before using VedaClue</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            These terms govern your use of VedaClue platform, services, and products in compliance with Indian consumer protection and IT laws.
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
