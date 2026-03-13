// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const SECTIONS = [
  {
    title: 'Delivery Coverage',
    content: `• We deliver across India
• Non-serviceable pincodes are blocked automatically at checkout
• International delivery: not available at this time`,
  },
  {
    title: 'Delivery Timeframes',
    content: `• Order processing: within 24 hours of payment confirmation
• Standard delivery: 5-7 business days
• Remote areas: may take 7-10 business days
• Delivery days: Monday to Saturday (excluding public holidays)`,
  },
  {
    title: 'Courier Partners',
    content: `• We ship via trusted courier partners including Delhivery, Shiprocket, and BlueDart
• Courier partner is assigned automatically based on your delivery pincode
• VedaClue is not responsible for courier delays beyond our control`,
  },
  {
    title: 'Order Tracking',
    content: `• Tracking link sent via SMS and email once order is dispatched
• Track your order at: vedaclue.com → Orders → Track
• If tracking not updated in 48 hours after dispatch, email: vedaclue@gmail.com`,
  },
  {
    title: 'Damaged or Wrong Item',
    content: `If item arrives damaged or incorrect:
• Email vedaclue@gmail.com within 48 hours of delivery
• Attach clear photo of the item and packaging
• Full refund or replacement issued within 5-7 business days
• Claims after 48 hours may not be accepted`,
  },
  {
    title: 'Shipping Charges',
    content: `• Free shipping on orders above ₹499
• Orders below ₹499: flat ₹49 shipping fee
• Shipping charges shown clearly at checkout before payment`,
  },
  {
    title: 'Failed Delivery',
    content: `If delivery fails due to wrong address or unavailability:
• 1 re-delivery attempt will be made
• If second attempt fails, order returned to us
• Refund issued minus ₹99 return shipping charge
• Please ensure correct address at checkout`,
  },
  {
    title: 'Cash on Delivery (COD)',
    content: `• COD available on select pincodes
• COD orders: payment collected at door
• COD not available for orders above ₹2000
• COD availability shown at checkout`,
  },
  {
    title: 'Contact for Shipping Issues',
    content: `Email: vedaclue@gmail.com
Response time: within 24 hours
Address: Bengaluru, Karnataka — 560100`,
  },
];

export default function ShippingPolicyPage() {
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
            <h1 className="text-base font-extrabold text-gray-900">Shipping Policy</h1>
            <p className="text-[9px] text-gray-400">Last updated: March 2026</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Intro card */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-xl shadow-md">
              <span className="text-white">&#128230;</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-800">Shipping & Delivery</p>
              <p className="text-[10px] text-gray-400">How we get your orders to you</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            We deliver Ayurvedic wellness products across India with trusted courier partners. Here's everything you need to know about shipping.
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
