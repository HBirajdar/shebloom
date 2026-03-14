// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { paymentAPI, financeAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

declare const window: any;

const EMPTY_ADDR = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total: subtotal, clearCart, updateQty, removeFromCart } = useCart();
  const user = useAuthStore(s => s.user);

  const [step, setStep] = useState<'cart' | 'address' | 'payment'>('cart');
  const [address, setAddress] = useState(EMPTY_ADDR);
  const [payMethod, setPayMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [payLoading, setPayLoading] = useState(false);
  const submittingRef = useRef(false);

  // Platform config (dynamic fees)
  const [config, setConfig] = useState<any>(null);
  useEffect(() => {
    financeAPI.getPublicConfig().then(r => setConfig(r.data?.data || r.data)).catch(() => {
      // Use safe defaults if config fails to load
      setConfig({ deliveryCharge: 49, freeDeliveryAbove: 499, platformFeeFlat: 0, platformFeePercent: 0, codEnabled: true, codExtraCharge: 0 });
    });
  }, []);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Load saved address
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sb_delivery_address') || '{}');
      if (saved.fullName) setAddress(prev => ({ ...prev, ...saved }));
    } catch {}
  }, []);

  // Dynamic fee calculation
  const deliveryCharge = config
    ? (subtotal >= (config.freeDeliveryAbove || 499) ? 0 : (config.deliveryCharge || 49))
    : (subtotal >= 499 ? 0 : 49);
  const platformFee = config
    ? Math.round(((config.platformFeeFlat || 0) + subtotal * ((config.platformFeePercent || 0) / 100)) * 100) / 100
    : 0;
  const codCharge = payMethod === 'cod' && config?.codExtraCharge ? config.codExtraCharge : 0;
  const afterDiscount = Math.max(0, subtotal - couponDiscount);
  const totalAmount = afterDiscount + deliveryCharge + platformFee + codCharge;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await financeAPI.validateCoupon({
        code: couponCode.trim(),
        applicableTo: 'PRODUCTS',
        amount: subtotal,
        productIds: items.map(i => i.productId),
      });
      const data = res.data?.data || res.data;
      if (data.valid) {
        setCouponDiscount(data.calculatedDiscount);
        setAppliedCoupon(data.code);
        toast.success(`Coupon applied! ₹${data.calculatedDiscount} off`);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Invalid coupon';
      setCouponError(msg);
      setCouponDiscount(0);
      setAppliedCoupon(null);
      toast.error(msg);
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponError('');
  };

  const validateAddress = () => {
    if (!address.fullName.trim()) { toast.error('Enter full name'); return false; }
    if (!address.phone.trim() || !/^[6-9]\d{9}$/.test(address.phone.trim().replace(/[\s-]/g, ''))) { toast.error('Enter valid 10-digit phone number'); return false; }
    if (!address.addressLine1.trim()) { toast.error('Enter address line 1'); return false; }
    if (!address.city.trim()) { toast.error('Enter city'); return false; }
    if (!address.state.trim()) { toast.error('Enter state'); return false; }
    if (!address.pincode.trim() || !/^\d{6}$/.test(address.pincode.trim())) { toast.error('Enter valid 6-digit pincode'); return false; }
    return true;
  };

  const goToAddress = () => {
    if (!items.length) { toast.error('Your cart is empty'); return; }
    setStep('address');
  };

  const goToPayment = () => {
    if (!validateAddress()) return;
    localStorage.setItem('sb_delivery_address', JSON.stringify(address));
    setStep('payment');
  };

  const handleRazorpayPayment = async () => {
    setPayLoading(true);
    try {
      const orderRes = await paymentAPI.createOrder({
        items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
        deliveryAddress: address,
        notes: '',
        couponCode: appliedCoupon || undefined,
      });
      const orderData = orderRes.data?.data || orderRes.data;
      if (!orderData?.keyId || !orderData?.razorpayOrderId) {
        toast.error('Failed to create payment order. Please try again.');
        setPayLoading(false);
        return;
      }

      if (!window.Razorpay) {
        toast.error('Payment gateway failed to load. Please refresh and try again.');
        setPayLoading(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpayOrderId,
        name: 'VedaClue',
        description: 'Ayurvedic Wellness Products',
        image: '/logo.png',
        handler: async (response: any) => {
          try {
            await paymentAPI.verifyPayment({
              orderId: orderData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            navigate('/order-success', {
              state: {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                totalAmount: orderData.amount / 100, // Use order data, not stale closure
                deliveryAddress: address,
              },
            });
          } catch {
            toast.error('Payment verification failed. Contact support.');
            setPayLoading(false);
          }
        },
        prefill: {
          name: address.fullName,
          contact: address.phone,
          email: user?.email || '',
        },
        theme: { color: '#f43f5e' },
        modal: { ondismiss: () => setPayLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to initiate payment');
      setPayLoading(false);
    }
  };

  const handleCOD = async () => {
    if (submittingRef.current) return; // Synchronous double-click guard
    if (config && !config.codEnabled) { toast.error('Cash on Delivery is not available'); return; }
    submittingRef.current = true;
    setPayLoading(true);
    try {
      const res = await paymentAPI.codOrder({
        items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
        deliveryAddress: address,
        notes: '',
        couponCode: appliedCoupon || undefined,
      });
      const data = res.data.data;
      clearCart();
      navigate('/order-success', {
        state: {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          totalAmount: data.breakdown?.total || totalAmount, // Use server total, not client
          deliveryAddress: address,
        },
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to place order');
      setPayLoading(false);
    } finally {
      submittingRef.current = false;
    }
  };

  const handlePlaceOrder = () => {
    if (payMethod === 'razorpay') handleRazorpayPayment();
    else handleCOD();
  };

  // Price summary component (reused in cart & payment steps)
  const PriceSummary = () => (
    <div className="bg-white rounded-3xl p-4 shadow-lg">
      <h4 className="text-xs font-extrabold text-gray-800 mb-2">Price Details</h4>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600"><span>Subtotal ({items.length} items)</span><span className="font-bold">₹{subtotal}</span></div>

        {/* Coupon discount */}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600">
            <span>Coupon ({appliedCoupon})</span><span className="font-bold">-₹{couponDiscount}</span>
          </div>
        )}

        {/* Platform fee */}
        {platformFee > 0 && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Platform fee</span><span className="font-bold">₹{platformFee}</span>
          </div>
        )}

        {/* Delivery */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>Delivery</span>
          <span className="font-bold">{deliveryCharge === 0 ? <span className="text-emerald-600">FREE</span> : <>₹{deliveryCharge}</>}</span>
        </div>
        {deliveryCharge > 0 && config && (
          <p className="text-[9px] text-rose-500">Add ₹{Math.max(0, (config.freeDeliveryAbove || 499) - subtotal)} more for free delivery</p>
        )}

        {/* COD charge */}
        {codCharge > 0 && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>COD charge</span><span className="font-bold">₹{codCharge}</span>
          </div>
        )}

        {/* Total savings */}
        {couponDiscount > 0 && (
          <div className="bg-emerald-50 rounded-xl px-3 py-1.5 mt-1">
            <p className="text-[10px] font-bold text-emerald-700">You save ₹{couponDiscount} on this order!</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm font-extrabold text-gray-900">
          <span>Total</span><span>₹{Math.round(totalAmount)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899,#8B5CF6)' }}>
        <button onClick={() => step === 'cart' ? navigate(-1) : setStep(step === 'payment' ? 'address' : 'cart')}
          className="absolute left-4 top-4 text-white/70 text-2xl active:scale-90 transition-transform">&#8249;</button>
        <h1 className="text-xl font-extrabold text-center">Checkout</h1>
        <div className="flex justify-center gap-2 mt-3">
          {['cart', 'address', 'payment'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s ? 'bg-white text-rose-600' : ((['cart','address','payment'].indexOf(step) > i) ? 'bg-white/40 text-white' : 'bg-white/20 text-white/50')
              }`}>{i + 1}</div>
              <span className={`text-[9px] font-bold ${step === s ? 'text-white' : 'text-white/50'}`}>
                {s === 'cart' ? 'Cart' : s === 'address' ? 'Address' : 'Payment'}
              </span>
              {i < 2 && <div className="w-6 h-0.5 bg-white/20 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ─── STEP 1: Cart Review ─── */}
        {step === 'cart' && (<>
          {items.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">🛒</span>
              <p className="text-lg font-extrabold text-gray-700">Your cart is empty</p>
              <p className="text-xs text-gray-400 mt-1">Add products from the Ayurveda Shop</p>
              <button onClick={() => navigate('/ayurveda')} className="mt-4 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform">
                Browse Shop
              </button>
            </div>
          ) : (<>
            <h3 className="text-sm font-extrabold text-gray-800">Your Cart ({items.length} items)</h3>
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-rose-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-2xl">🌿</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs font-extrabold text-rose-600 mt-0.5">₹{item.price}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center active:scale-90">-</button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center active:scale-90">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-gray-900">₹{item.price * item.qty}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-xs px-2 py-1 text-red-400 font-bold mt-1 active:scale-95">Remove</button>
                </div>
              </div>
            ))}

            {/* Coupon Input */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">🎟️ Have a coupon?</p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 font-mono">{appliedCoupon}</span>
                    <span className="text-[10px] text-emerald-600 ml-2">-₹{couponDiscount} off</span>
                  </div>
                  <button onClick={removeCoupon} className="text-[10px] font-bold text-red-500 active:scale-95">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="Enter coupon code" maxLength={20}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold focus:border-rose-400 focus:outline-none uppercase" />
                  <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-bold active:scale-95 disabled:opacity-40 transition-all">
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[9px] text-red-500 mt-1">{couponError}</p>}
            </div>

            {/* Price Summary */}
            <PriceSummary />

            <button onClick={goToAddress}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg">
              Proceed to Address
            </button>
          </>)}
        </>)}

        {/* ─── STEP 2: Delivery Address ─── */}
        {step === 'address' && (<>
          <h3 className="text-sm font-extrabold text-gray-800">Delivery Address</h3>
          <div className="bg-white rounded-3xl p-4 shadow-lg space-y-3">
            {[
              { key: 'fullName', label: 'Full Name *', type: 'text', placeholder: 'Enter full name' },
              { key: 'phone', label: 'Phone Number *', type: 'tel', placeholder: '+91 98765 43210' },
              { key: 'addressLine1', label: 'Address Line 1 *', type: 'text', placeholder: 'House/flat number, street' },
              { key: 'addressLine2', label: 'Address Line 2', type: 'text', placeholder: 'Landmark (optional)' },
              { key: 'city', label: 'City *', type: 'text', placeholder: 'City' },
              { key: 'state', label: 'State *', type: 'text', placeholder: 'State' },
              { key: 'pincode', label: 'Pincode *', type: 'text', placeholder: '6-digit pincode' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                <input type={f.type} value={(address as any)[f.key]} onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full mt-0.5 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
              </div>
            ))}
          </div>

          <button onClick={goToPayment}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg">
            Continue to Payment
          </button>
        </>)}

        {/* ─── STEP 3: Payment Method ─── */}
        {step === 'payment' && (<>
          <h3 className="text-sm font-extrabold text-gray-800">Payment Method</h3>

          {/* Address summary */}
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Delivering to</p>
            <p className="text-xs font-bold text-gray-800">{address.fullName}</p>
            <p className="text-[10px] text-gray-500">{address.addressLine1}{address.addressLine2 ? ', ' + address.addressLine2 : ''}, {address.city}, {address.state} - {address.pincode}</p>
            <p className="text-[10px] text-gray-500">Phone: {address.phone}</p>
            <button onClick={() => setStep('address')} className="text-[9px] text-rose-500 font-bold mt-1 active:scale-95">Change</button>
          </div>

          {/* Payment options */}
          <div className="space-y-3">
            <button onClick={() => setPayMethod('razorpay')}
              className={`w-full bg-white rounded-2xl p-4 shadow-sm text-left border-2 transition-all active:scale-[0.98] ${payMethod === 'razorpay' ? 'border-rose-400' : 'border-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === 'razorpay' ? 'border-rose-500' : 'border-gray-300'}`}>
                  {payMethod === 'razorpay' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Pay Online</p>
                  <p className="text-[10px] text-gray-500">UPI, Cards, Net Banking, Wallets</p>
                </div>
                <span className="ml-auto text-lg">💳</span>
              </div>
            </button>

            {(!config || config.codEnabled) && (
              <button onClick={() => setPayMethod('cod')}
                className={`w-full bg-white rounded-2xl p-4 shadow-sm text-left border-2 transition-all active:scale-[0.98] ${payMethod === 'cod' ? 'border-rose-400' : 'border-transparent'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === 'cod' ? 'border-rose-500' : 'border-gray-300'}`}>
                    {payMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Cash on Delivery {codCharge > 0 ? `(+₹${codCharge})` : ''}</p>
                    <p className="text-[10px] text-gray-500">Pay when your order arrives</p>
                  </div>
                  <span className="ml-auto text-lg">💰</span>
                </div>
              </button>
            )}
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h4 className="text-xs font-extrabold text-gray-800 mb-2">Order Summary</h4>
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-[10px] text-gray-600 py-1 border-b border-gray-50">
                <span className="truncate flex-1">{item.name} x{item.qty}</span>
                <span className="font-bold ml-2">₹{item.price * item.qty}</span>
              </div>
            ))}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-[10px] text-emerald-600 py-1 border-b border-gray-50">
                <span>Coupon ({appliedCoupon})</span><span className="font-bold">-₹{couponDiscount}</span>
              </div>
            )}
            {platformFee > 0 && (
              <div className="flex justify-between text-[10px] text-gray-600 py-1 border-b border-gray-50">
                <span>Platform fee</span><span className="font-bold">₹{platformFee}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-gray-600 py-1 border-b border-gray-50">
              <span>Delivery</span>
              <span className="font-bold">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
            </div>
            {codCharge > 0 && (
              <div className="flex justify-between text-[10px] text-gray-600 py-1 border-b border-gray-50">
                <span>COD charge</span><span className="font-bold">₹{codCharge}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2">
              <span>Total</span><span>₹{Math.round(totalAmount)}</span>
            </div>
          </div>

          <button onClick={handlePlaceOrder} disabled={payLoading}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg disabled:opacity-50">
            {payLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : payMethod === 'razorpay' ? `Pay ₹${Math.round(totalAmount)}` : `Place COD Order (₹${Math.round(totalAmount)})`}
          </button>
        </>)}
      </div>

      <BottomNav />
    </div>
  );
}
