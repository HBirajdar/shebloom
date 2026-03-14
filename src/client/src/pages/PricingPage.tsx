import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionAPI, financeAPI } from '../services/api';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useCycleStore } from '../stores/cycleStore';
import { useAuthStore } from '../stores/authStore';
import { trackEvent } from '../hooks/useTrackEvent';

declare global { interface Window { Razorpay: any } }

interface Plan {
  id: string; name: string; slug: string; description?: string;
  interval: string; basePrice: number; effectivePrice: number;
  finalPrice: number; promoDiscount: number; isFree: boolean;
  emoji: string; highlights: string[]; badge?: string;
  trialDays: number; goalPricing?: any;
  promotion?: { id: string; name: string; type: string; discountValue: number; discountType: string } | null;
}

const FREE_FEATURES = [
  'Basic cycle tracking (3 months)',
  'Quick dosha quiz',
  'Community access',
  'Browse articles',
  'Product browsing',
  'Mood & symptom logging',
];

const PREMIUM_FEATURES = [
  '12-month cycle predictions',
  'BBT & fertility tracking',
  'Cervical mucus & LH logging',
  'Personalized Ayurvedic insights',
  'Full dosha assessment',
  'Premium programs included',
  'Priority doctor booking',
  'Data export (CSV/PDF)',
  'Ad-free experience',
  'Advanced pregnancy features',
];

export default function PricingPage() {
  const nav = useNavigate();
  const { subscription, isPremium, fetchSubscription } = useSubscriptionStore();
  const goal = useCycleStore((s) => s.goal);
  const user = useAuthStore((s) => s.user);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [payLoading, setPayLoading] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pauseMessage, setPauseMessage] = useState('');

  useEffect(() => {
    loadPlans();
    fetchSubscription();
    trackEvent('subscription_page_viewed', { category: 'subscription', label: goal || 'none' });
  }, [goal]);

  const loadPlans = async () => {
    try {
      const res = await subscriptionAPI.getPlans(goal || undefined);
      const data = res.data?.data || res.data;
      // New response format: { plans, paused, pauseMessage, ... }
      if (data?.plans) {
        setPlans(Array.isArray(data.plans) ? data.plans.filter((p: Plan) => !p.isFree) : []);
        setPaused(!!data.paused);
        setPauseMessage(data.pauseMessage || '');
      } else {
        setPlans(Array.isArray(data) ? data.filter((p: Plan) => !p.isFree) : []);
      }
    } catch { setPlans([]); }
    finally { setLoading(false); }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(''); setCouponResult(null);
    try {
      const res = await financeAPI.validateCoupon({ code: couponCode.trim(), applicableTo: 'SUBSCRIPTION' });
      const d = res.data?.data || res.data;
      if (d?.valid) { setCouponResult(d); trackEvent('coupon_applied', { category: 'subscription', label: couponCode.trim() }); }
      else { setCouponError(d?.error || 'Invalid coupon'); trackEvent('coupon_failed', { category: 'subscription', label: couponCode.trim() }); }
    } catch (e: any) { setCouponError(e.message || 'Invalid coupon'); trackEvent('coupon_failed', { category: 'subscription', label: couponCode.trim() }); }
  };

  const handleSubscribe = async (plan: Plan) => {
    setPayLoading(plan.id);
    trackEvent('plan_selected', { category: 'subscription', label: plan.slug, value: plan.finalPrice, metadata: { planId: plan.id, interval: plan.interval } });
    trackEvent('checkout_started', { category: 'subscription', label: plan.slug, value: plan.finalPrice });
    try {
      const res = await subscriptionAPI.create({
        planId: plan.id,
        couponCode: couponResult?.code || undefined,
        goal: goal || undefined,
      });
      const data = res.data?.data || res.data;

      if (!data.paymentRequired) {
        // Free activation — force refresh subscription store
        useSubscriptionStore.getState().clearSubscription();
        await fetchSubscription();
        nav('/dashboard');
        return;
      }

      // Check Razorpay SDK is loaded
      if (typeof window.Razorpay !== 'function') {
        alert('Payment gateway is loading. Please try again in a moment.');
        setPayLoading('');
        return;
      }

      // Razorpay payment — only send Razorpay response fields to /verify
      // Server uses stored pending transaction for pricing (prevents tampering)
      const options: any = {
        key: data.keyId,
        name: 'VedaClue',
        description: `${plan.name} Subscription`,
        image: '/logo.png',
        theme: { color: '#f43f5e' },
        prefill: { email: user?.email || '' },
        modal: { ondismiss: () => { trackEvent('checkout_abandoned', { category: 'subscription', label: plan.slug, value: plan.finalPrice }); setPayLoading(''); } },
      };

      if (data.paymentType === 'one_time') {
        options.amount = data.amount;
        options.currency = data.currency;
        options.order_id = data.razorpayOrderId;
        options.handler = async (response: any) => {
          try {
            await subscriptionAPI.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentType: 'one_time',
            });
            trackEvent('checkout_completed', { category: 'subscription', label: plan.slug, value: plan.finalPrice, metadata: { paymentType: 'one_time' } });
            useSubscriptionStore.getState().clearSubscription();
            await fetchSubscription();
            nav('/dashboard');
          } catch { alert('Payment verification failed. Contact support.'); }
          finally { setPayLoading(''); }
        };
      } else {
        options.subscription_id = data.razorpaySubscriptionId;
        options.handler = async (response: any) => {
          try {
            await subscriptionAPI.verify({
              razorpaySubscriptionId: data.razorpaySubscriptionId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentType: 'subscription',
            });
            trackEvent('checkout_completed', { category: 'subscription', label: plan.slug, value: plan.finalPrice, metadata: { paymentType: 'subscription' } });
            useSubscriptionStore.getState().clearSubscription();
            await fetchSubscription();
            nav('/dashboard');
          } catch { alert('Payment verification failed. Contact support.'); }
          finally { setPayLoading(''); }
        };
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      alert(e.message || 'Failed to create subscription');
      setPayLoading('');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
      <div className="animate-spin w-8 h-8 border-4 border-rose-300 border-t-rose-600 rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 pb-24">
      <Helmet>
        <title>Plans & Pricing | VedaClue</title>
        <meta name="description" content="Choose your VedaClue plan — free and premium options for complete women's health tracking" />
      </Helmet>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <button onClick={() => nav(-1)} className="text-gray-500 text-sm mb-4">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900 text-center">Choose Your Plan</h1>
        <p className="text-sm text-gray-500 text-center mt-1">Unlock your full wellness journey</p>
      </div>

      {/* Current Plan Badge */}
      {isPremium && subscription && (
        <div className="mx-4 mb-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl p-4 text-center">
          <p className="text-xs opacity-80">Current Plan</p>
          <p className="text-lg font-bold">{subscription.plan.emoji} {subscription.plan.name}</p>
          <p className="text-xs opacity-80 mt-1">
            {subscription.status === 'TRIAL' ? `Trial ends ${new Date(subscription.trialEndDate!).toLocaleDateString()}` :
             subscription.status === 'CANCELLED' ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` :
             `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
          </p>
        </div>
      )}

      {/* Paused/Disabled Banner */}
      {paused && (
        <div className="mx-4 mb-4 bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">{'\u23F8\uFE0F'}</p>
          <p className="text-sm font-bold text-amber-800">Subscriptions Paused</p>
          <p className="text-xs text-amber-600 mt-1">{pauseMessage}</p>
        </div>
      )}

      {/* Plan Cards */}
      <div className="px-4 space-y-4">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan?.id === plan.id && isPremium;
          const hasPromo = plan.promoDiscount > 0;
          const discountPercent = plan.effectivePrice > 0
            ? Math.round((plan.promoDiscount / plan.effectivePrice) * 100)
            : 0;

          return (
            <div key={plan.id} className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all ${
              plan.badge === 'POPULAR' ? 'border-rose-400' : plan.badge === 'BEST VALUE' ? 'border-amber-400' : 'border-gray-100'
            }`}>
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase text-white rounded-bl-xl ${
                  plan.badge === 'POPULAR' ? 'bg-rose-500' : 'bg-amber-500'
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="p-5">
                {/* Plan name */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{plan.emoji}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-baseline gap-2 mb-1">
                  {hasPromo && (
                    <span className="text-gray-400 line-through text-sm">
                      {'\u20B9'}{plan.effectivePrice}
                    </span>
                  )}
                  <span className="text-3xl font-black text-gray-900">
                    {'\u20B9'}{plan.finalPrice}
                  </span>
                  <span className="text-xs text-gray-500">
                    {plan.interval === 'LIFETIME' ? 'one-time' : `/${plan.interval.toLowerCase()}`}
                  </span>
                </div>

                {/* Promo badge */}
                {hasPromo && plan.promotion && (
                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-2">
                    {discountPercent}% OFF &middot; {plan.promotion.name}
                  </div>
                )}

                {/* Trial */}
                {plan.trialDays > 0 && !isCurrentPlan && (
                  <p className="text-xs text-rose-600 font-medium mb-2">
                    Start with {plan.trialDays}-day free trial
                  </p>
                )}

                {/* Highlights */}
                <ul className="space-y-1.5 mb-4">
                  {plan.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-green-500 text-sm">&#10003;</span> {h}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrentPlan ? (
                  <div className="text-center py-2.5 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={!!payLoading || paused}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {paused ? 'Temporarily Unavailable' :
                     payLoading === plan.id ? 'Processing...' :
                     plan.trialDays > 0 ? 'Start Free Trial' : 'Subscribe Now'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coupon Code */}
      <div className="mx-4 mt-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-700 mb-2">Have a promo code?</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); setCouponResult(null); }}
            placeholder="Enter code"
            className="flex-1 px-3 py-2 border rounded-lg text-sm uppercase"
          />
          <button onClick={validateCoupon} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-semibold">
            Apply
          </button>
        </div>
        {couponResult && <p className="text-green-600 text-xs mt-2">Coupon applied: {couponResult.discountType === 'PERCENTAGE' ? `${couponResult.discountValue}% off` : `\u20B9${couponResult.discountValue} off`}</p>}
        {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
      </div>

      {/* Compare Features */}
      <div className="mx-4 mt-6">
        <button onClick={() => setShowCompare(!showCompare)} className="w-full text-center text-sm text-rose-600 font-semibold py-2">
          {showCompare ? 'Hide' : 'Compare'} Free vs Premium
        </button>

        {showCompare && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Free</h4>
                {FREE_FEATURES.map((f, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5 mb-1.5">
                    <span className="text-gray-400">&#10003;</span> {f}
                  </p>
                ))}
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase mb-2">Premium</h4>
                {PREMIUM_FEATURES.map((f, i) => (
                  <p key={i} className="text-xs text-gray-700 flex items-center gap-1.5 mb-1.5">
                    <span className="text-green-500">&#10003;</span> {f}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-gray-400 mt-6 px-8">
        Cancel anytime. Subscription continues until end of billing period.
        By subscribing, you agree to VedaClue Terms of Service.
      </p>
    </div>
  );
}
