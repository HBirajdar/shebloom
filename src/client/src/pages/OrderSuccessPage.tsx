// @ts-nocheck
import { useLocation, useNavigate, Navigate } from 'react-router-dom';

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state?.orderId && !state?.orderNumber) return <Navigate to="/my-orders" replace />;

  const orderNumber = state?.orderNumber || 'N/A';
  const totalAmount = state?.totalAmount || 0;
  const address = state?.deliveryAddress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-[380px] w-full">
        {/* Success animation */}
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <span className="text-4xl">&#10003;</span>
        </div>

        <h1 className="text-xl font-extrabold text-gray-900">Order Placed!</h1>
        <p className="text-sm text-gray-500 mt-1">Thank you for your purchase</p>

        {/* Order details */}
        <div className="mt-6 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Order Number</span>
              <span className="font-extrabold text-emerald-700">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-extrabold text-gray-900">&#8377;{totalAmount}</span>
            </div>
            {address && (
              <div className="text-left pt-2 border-t border-emerald-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Delivering to</p>
                <p className="text-xs text-gray-700 mt-0.5">{address.fullName}</p>
                <p className="text-[10px] text-gray-500">{address.addressLine1}, {address.city}, {address.state} - {address.pincode}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-4">
          We'll send you an email confirmation with order details and tracking info.
        </p>

        <div className="mt-6 space-y-3">
          <button onClick={() => navigate('/my-orders')}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform">
            View My Orders
          </button>
          <button onClick={() => navigate('/ayurveda')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition-transform">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
