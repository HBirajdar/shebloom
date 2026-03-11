// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  Processing: 'bg-amber-50 text-amber-700 border border-amber-200',
  Shipped: 'bg-blue-50 text-blue-700 border border-blue-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export default function ShopHistoryPage() {
  const nav = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sb_order_history');
      if (raw) setOrders(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalItems = orders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.qty || 1), 0) || 0), 0);

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
  };

  const fmtOrderId = (id: string) => {
    if (!id) return '';
    // Show last 7 chars for readability
    return '#' + id.slice(-7).toUpperCase();
  };

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">←</button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Shop History</h1>
            <p className="text-[9px] text-gray-400">Your orders</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-3xl shadow-lg p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total Orders', value: orders.length, color: 'text-gray-800' },
              { label: 'Total Spent', value: '₹' + totalSpent.toLocaleString('en-IN'), color: 'text-emerald-600' },
              { label: 'Items Purchased', value: totalItems, color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={'text-lg font-extrabold ' + s.color}>{s.value}</p>
                <p className="text-[9px] text-gray-400 font-bold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">🛍️</span>
            <p className="text-sm font-bold text-gray-400">No orders yet</p>
            <p className="text-xs text-gray-300 mt-1">Browse our Ayurveda shop and place your first order</p>
            <button onClick={() => nav('/ayurveda')}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-rose-200">
              Go to Shop →
            </button>
          </div>
        ) : (
          orders.map((order, idx) => (
            <div key={order.id || idx} className="bg-white rounded-3xl shadow-lg p-4">
              {/* Order header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-extrabold text-gray-800">Order {fmtOrderId(order.id)}</p>
                  <p className="text-[10px] text-gray-400">{fmtDate(order.date)}</p>
                </div>
                <span className={'text-[9px] font-bold px-2.5 py-1 rounded-full ' + (STATUS_STYLES[order.status] || STATUS_STYLES.Processing)}>
                  {order.status || 'Processing'}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2 border-t border-gray-100 pt-2">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji || '🌿'}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{item.name}</p>
                        <p className="text-[10px] text-gray-400">×{item.qty || 1}</p>
                      </div>
                    </div>
                    <p className="text-xs font-extrabold text-gray-800">₹{(item.price * (item.qty || 1)).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-gray-100 mt-2 pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Total</span>
                <span className="text-sm font-extrabold text-emerald-700">₹{(order.total || 0).toLocaleString('en-IN')}</span>
              </div>

              {/* Address */}
              {order.address && (
                <p className="text-[10px] text-gray-400 mt-1.5">📦 Delivered to: {order.address}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
