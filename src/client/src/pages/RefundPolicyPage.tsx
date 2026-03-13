// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const SECTIONS = [
  {
    title: 'Consultation Cancellation',
    content: `Doctor Consultation Cancellation Policy:
\u2022 Cancel 2+ hours before appointment: full refund
\u2022 Cancel within 2 hours of appointment: no refund
\u2022 Doctor no-show: full refund within 5 business days
\u2022 Technical issues preventing consultation: full refund

How to cancel:
\u2022 Go to Appointments \u2192 Select appointment \u2192 Cancel
\u2022 Or email: vedaclue@gmail.com with appointment ID`,
  },
  {
    title: 'Product Returns',
    content: `Return policy for Ayurvedic products:
\u2022 Damaged or wrong item received: full refund or replacement
\u2022 Change of mind: not accepted (health products, hygiene reasons)
\u2022 Item not as described: full refund

How to raise a return:
\u2022 Email vedaclue@gmail.com within 48 hours of delivery
\u2022 Include order ID and clear photos of the item and packaging
\u2022 Claims after 48 hours may not be accepted`,
  },
  {
    title: 'Refund Process',
    content: `\u2022 Refunds are processed within 5-7 business days
\u2022 Refund is credited to original payment method
\u2022 UPI refunds: 1-3 business days
\u2022 Card refunds: 5-7 business days
\u2022 Net banking refunds: 5-10 business days
\u2022 You will receive email confirmation once refund is initiated`,
  },
  {
    title: 'Platform Fee',
    content: `\u2022 Platform fee is non-refundable once the consultation service has been rendered
\u2022 If consultation is cancelled before it begins, platform fee is refunded
\u2022 Platform fee for product orders is included in the shipping charge`,
  },
  {
    title: 'Programs & Courses',
    content: `\u2022 All program and course purchases are final
\u2022 No refunds once access is granted
\u2022 Technical issues preventing access: contact support within 7 days for resolution
\u2022 If the issue cannot be resolved, a full refund will be issued`,
  },
  {
    title: 'COD Order Cancellation',
    content: `\u2022 COD orders can be cancelled before dispatch (within 24 hours of placing)
\u2022 Once dispatched, COD orders cannot be cancelled
\u2022 Refusing COD delivery: order returned, no charge applied
\u2022 Repeated COD refusals may result in COD being disabled for your account`,
  },
  {
    title: 'Coupon & Discount Refunds',
    content: `\u2022 If a coupon was applied to the order, refund amount is the actual amount paid (after discount)
\u2022 Coupon codes are not reissued on refund
\u2022 Free shipping benefit is not refunded separately`,
  },
  {
    title: 'Contact for Refunds',
    content: `For all refund-related queries:
Email: vedaclue@gmail.com
Response time: within 24 hours
Address: Bengaluru, Karnataka \u2014 560100

Consumer rights under Consumer Protection Act 2019 are fully applicable.`,
  },
];

export default function RefundPolicyPage() {
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
            <h1 className="text-base font-extrabold text-gray-900">Refund & Cancellation Policy</h1>
            <p className="text-[9px] text-gray-400">Last updated: March 2026</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Intro card */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-xl shadow-md">
              <span className="text-white">&#128176;</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-800">Refunds & Cancellations</p>
              <p className="text-[10px] text-gray-400">Fair and transparent refund process</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            We want you to be satisfied with every purchase. Here's our refund and cancellation policy for consultations, products, and programs.
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
