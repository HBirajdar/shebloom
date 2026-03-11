// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { paymentAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

declare const window: any;

const DELIVERY_CHARGE = 49;
const FREE_DELIVERY_ABOVE = 499;

const EMPTY_ADDR = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total: subtotal, clearCart, updateQty, removeFromCart } = useCart();
  const user = useAuthStore(s => s.user);

  const [step, setStep] = useState<'cart' | 'address' | 'payment'>('cart');
  const [address, setAddress] = useState(EMPTY_ADDR);
  const [payMethod, setPayMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [payLoading, setPayLoading] = useState(false);

  // Load saved address
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sb_delivery_address') || '{}');
      if (saved.fullName) setAddress(prev => ({ ...prev, ...saved }));
    } catch {}
  }, []);

  const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
  const totalAmount = subtotal + deliveryCharge;

  const validateAddress = () => {
    if (!address.fullName.trim()) { toast.error('Enter full name'); return false; }
    if (!address.phone.trim() || address.phone.trim().length < 10) { toast.error('Enter valid phone number'); return false; }
    if (!address.addressLine1.trim()) { toast.error('Enter address line 1'); return false; }
    if (!address.city.trim()) { toast.error('Enter city'); return false; }
    if (!address.state.trim()) { toast.error('Enter state'); return false; }
    if (!address.pincode.trim() || address.pincode.trim().length < 6) { toast.error('Enter valid pincode'); return false; }
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
      });
      const orderData = orderRes.data.data;

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
                totalAmount,
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
      toast.error(e?.response?.data?.error || e.message || 'Failed to initiate payment');
      setPayLoading(false);
    }
  };

  const handleCOD = async () => {
    setPayLoading(true);
    try {
      const res = await paymentAPI.codOrder({
        items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
        deliveryAddress: address,
        notes: '',
      });
      const data = res.data.data;
      clearCart();
      navigate('/order-success', {
        state: {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          totalAmount,
          deliveryAddress: address,
        },
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to place order');
      setPayLoading(false);
    }
  };

  const handlePlaceOrder = () => {
    if (payMethod === 'razorpay') handleRazorpayPayment();
    else handleCOD();
  };

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
              <span className="text-5xl block mb-3">&#128722;</span>
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
                  {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-2xl">&#127807;</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs font-extrabold text-rose-600 mt-0.5">&#8377;{item.price}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center active:scale-90">-</button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center active:scale-90">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-gray-900">&#8377;{item.price * item.qty}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-[9px] text-red-400 font-bold mt-1 active:scale-95">Remove</button>
                </div>
              </div>
            ))}

            {/* Price Summary */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <h4 className="text-xs font-extrabold text-gray-800 mb-2">Price Details</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600"><span>Subtotal</span><span className="font-bold">&#8377;{subtotal}</span></div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Delivery</span>
                  <span className="font-bold">{deliveryCharge === 0 ? <span className="text-emerald-600">FREE</span> : <>&#8377;{deliveryCharge}</>}</span>
                </div>
                {deliveryCharge > 0 && <p className="text-[9px] text-rose-500">Add &#8377;{FREE_DELIVERY_ABOVE - subtotal} more for free delivery</p>}
                <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm font-extrabold text-gray-900">
                  <span>Total</span><span>&#8377;{totalAmount}</span>
                </div>
              </div>
            </div>

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
                <span className="ml-auto text-lg">&#128179;</span>
              </div>
            </button>

            <button onClick={() => setPayMethod('cod')}
              className={`w-full bg-white rounded-2xl p-4 shadow-sm text-left border-2 transition-all active:scale-[0.98] ${payMethod === 'cod' ? 'border-rose-400' : 'border-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === 'cod' ? 'border-rose-500' : 'border-gray-300'}`}>
                  {payMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Cash on Delivery</p>
                  <p className="text-[10px] text-gray-500">Pay when your order arrives</p>
                </div>
                <span className="ml-auto text-lg">&#128176;</span>
              </div>
            </button>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h4 className="text-xs font-extrabold text-gray-800 mb-2">Order Summary</h4>
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-[10px] text-gray-600 py-1 border-b border-gray-50">
                <span className="truncate flex-1">{item.name} x{item.qty}</span>
                <span className="font-bold ml-2">&#8377;{item.price * item.qty}</span>
              </div>
            ))}
            <div className="flex justify-between text-[10px] text-gray-600 py-1 border-b border-gray-50">
              <span>Delivery</span>
              <span className="font-bold">{deliveryCharge === 0 ? 'FREE' : `\u20B9${deliveryCharge}`}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2">
              <span>Total</span><span>&#8377;{totalAmount}</span>
            </div>
          </div>

          <button onClick={handlePlaceOrder} disabled={payLoading}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg disabled:opacity-50">
            {payLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : payMethod === 'razorpay' ? `Pay \u20B9${totalAmount}` : `Place COD Order (\u20B9${totalAmount})`}
          </button>
        </>)}
      </div>

      <BottomNav />
    </div>
  );
}
