// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-orange-100 text-orange-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PENDING_COD: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    paymentAPI.myOrders()
      .then(res => {
        const data = res.data?.data || res.data || [];
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899,#8B5CF6)' }}>
        <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-white/70 text-2xl active:scale-90 transition-transform">&#8249;</button>
        <h1 className="text-xl font-extrabold text-center">My Orders</h1>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">&#128230;</span>
            <p className="text-lg font-extrabold text-gray-700">No orders yet</p>
            <p className="text-xs text-gray-400 mt-1">Your order history will appear here</p>
            <button onClick={() => navigate('/ayurveda')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform">
              Start Shopping
            </button>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl p-4 shadow-lg">
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-extrabold text-gray-800">{order.orderNumber}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-1.5">
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {order.orderStatus}
                  </span>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${PAYMENT_COLORS[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {order.paymentMethod === 'COD' ? 'COD' : order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-2">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-[10px] text-gray-600 py-0.5">
                    <span className="truncate flex-1">{item.productName} x{item.quantity}</span>
                    <span className="font-bold ml-2">&#8377;{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <div className="text-xs">
                  <span className="text-gray-500">Total: </span>
                  <span className="font-extrabold text-gray-900">&#8377;{order.totalAmount}</span>
                  {order.deliveryCharge > 0 && <span className="text-[9px] text-gray-400 ml-1">(incl. &#8377;{order.deliveryCharge} delivery)</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
