// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { adminAPI, doshaAPI, financeAPI } from '../services/api';
import ImageUpload from '../components/ImageUpload';

// Adapter: normalises axios { data: { success, data: X } } → { success, data: X }
// so all existing res.data access patterns work unchanged.
const wrap = (p: Promise<any>) => p.then((r: any) => r.data);
const apiService = {
  getDashboard:              ()              => wrap(adminAPI.dashboard()),
  getAdminUsers:             (p?: any)       => wrap(adminAPI.users(p)),
  getAdminAppointments:      (p?: any)       => wrap(adminAPI.appointments(p)),
  getAnalytics:              ()              => wrap(adminAPI.analytics()),
  adminGetCallbacks:         ()              => wrap(adminAPI.getCallbacks()),
  adminUpdateCallback:       (id: string, d: any) => wrap(adminAPI.updateCallback(id, d)),
  adminDeleteCallback:       (id: string)    => wrap(adminAPI.deleteCallback(id)),
  getAdminProductAnalytics:  ()              => wrap(adminAPI.productAnalytics()),
  getAdminDoctorAnalytics:   ()              => wrap(adminAPI.doctorAnalytics()),
  getAdminPrescriptions:     ()              => wrap(adminAPI.getPrescriptions()),
  adminGetOrders:            (p?: any)       => wrap(adminAPI.adminOrders(p)),
  adminUpdateOrderStatus:    (id: string, status: string) => wrap(adminAPI.adminUpdateOrderStatus(id, status)),
  adminCreateProduct:        (d: any)        => wrap(adminAPI.createProduct(d)),
  adminUpdateProduct:        (id: string, d: any) => wrap(adminAPI.updateProduct(id, d)),
  adminToggleProductPublish: (id: string)    => wrap(adminAPI.toggleProductPublish(id)),
  adminDeleteProduct:        (id: string)    => wrap(adminAPI.deleteProduct(id)),
  adminCreateArticle:        (d: any)        => wrap(adminAPI.createArticle(d)),
  adminUpdateArticle:        (id: string, d: any) => wrap(adminAPI.updateArticle(id, d)),
  adminToggleArticlePublish: (id: string)    => wrap(adminAPI.toggleArticlePublish(id)),
  adminDeleteArticle:        (id: string)    => wrap(adminAPI.deleteArticle(id)),
  adminCreateDoctor:         (d: any)        => wrap(adminAPI.createDoctor(d)),
  adminUpdateDoctor:         (id: string, d: any) => wrap(adminAPI.updateDoctor(id, d)),
  adminToggleDoctorPublish:  (id: string)    => wrap(adminAPI.toggleDoctorPublish(id)),
  adminToggleDoctorPromote:  (id: string)    => wrap(adminAPI.toggleDoctorPromote(id)),
  adminDeleteDoctor:         (id: string)    => wrap(adminAPI.deleteDoctor(id)),
  updateUser:                (id: string, d: any) => wrap(adminAPI.updateUser(id, d)),
  adminUpdateAppointment:    (id: string, d: any) => wrap(adminAPI.updateAppointment(id, d)),
  // Payouts
  getPayoutSummary:          ()              => wrap(adminAPI.payoutSummary()),
  getPayoutList:             (p?: any)       => wrap(adminAPI.payoutList(p)),
  generatePayout:            (d: any)        => wrap(adminAPI.generatePayout(d)),
  updatePayout:              (id: string, d: any) => wrap(adminAPI.updatePayout(id, d)),
  deletePayout:              (id: string)    => wrap(adminAPI.deletePayout(id)),
  // Wellness
  getWellness:               ()              => wrap(adminAPI.getWellness()),
  createWellness:            (d: any)        => wrap(adminAPI.createWellness(d)),
  updateWellness:            (id: string, d: any) => wrap(adminAPI.updateWellness(id, d)),
  toggleWellnessPublish:     (id: string)    => wrap(adminAPI.toggleWellnessPublish(id)),
  deleteWellness:            (id: string)    => wrap(adminAPI.deleteWellness(id)),
  // Programs
  getPrograms:               ()              => wrap(adminAPI.getPrograms()),
  createProgram:             (d: any)        => wrap(adminAPI.createProgram(d)),
  updateProgram:             (id: string, d: any) => wrap(adminAPI.updateProgram(id, d)),
  toggleProgramPublish:      (id: string)    => wrap(adminAPI.toggleProgramPublish(id)),
  deleteProgram:             (id: string)    => wrap(adminAPI.deleteProgram(id)),
  getProgramContents:        (id: string)    => wrap(adminAPI.getProgramContents(id)),
  addProgramContent:         (id: string, d: any) => wrap(adminAPI.addProgramContent(id, d)),
  updateProgramContent:      (cId: string, d: any) => wrap(adminAPI.updateProgramContent(cId, d)),
  deleteProgramContent:      (cId: string)   => wrap(adminAPI.deleteProgramContent(cId)),
};
import MultiImageUpload from '../components/MultiImageUpload';
import toast from 'react-hot-toast';

// ─── Local types ────────────────────────────────────
type ProductCategory = 'hair_oil' | 'body_lotion' | 'face_wash' | 'body_wash' | 'hair_treatment' | 'supplement' | 'skincare';
type TargetAudience = 'all' | 'periods' | 'fertility' | 'pregnancy' | 'wellness';

interface AdminProduct {
  id: string; name: string; category: ProductCategory; price: number; discountPrice?: number;
  description: string; ingredients: string[]; benefits: string[]; howToUse: string;
  size: string; emoji: string; rating: number; reviews: number; inStock: boolean;
  isPublished: boolean; isFeatured: boolean; targetAudience: TargetAudience[]; tags: string[];
  preparationMethod?: string; doctorNote?: string; imageUrl?: string; galleryImages?: string[];
  status?: string; publishedAt?: string | null; approvedBy?: string | null; approvedAt?: string | null;
  stock?: number; unit?: string; createdAt: string;
}
interface AdminArticle {
  id: string; title: string; content: string; category: string; readTime: string;
  readTimeMinutes?: number; excerpt?: string;
  emoji: string; isPublished: boolean; isFeatured: boolean; targetAudience: TargetAudience[];
  tags?: string[]; imageUrl?: string; status?: string; publishedAt?: string | null;
  approvedBy?: string | null; approvedAt?: string | null; authorName?: string;
  viewCount?: number; createdAt: string;
}
interface AdminDoctor {
  id: string; name: string; specialization: string; experience: number; rating: number;
  reviews: number; fee: number; feeFreeForPoor: boolean; qualification: string;
  tags: string[]; languages: string[]; about: string; isChief: boolean; isPublished: boolean;
  isPromoted?: boolean; avatarUrl?: string; hospitalName?: string; location?: string;
  status?: string; approvedBy?: string | null; approvedAt?: string | null;
  publishedAt?: string | null; createdAt?: string;
}

// ─── Admin PIN stored in localStorage ───────────────
const ADMIN_PIN_KEY = 'sb_admin_pin';
const DEFAULT_PIN = 'VedaClue@2024#Admin';
function getStoredPin() { return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN; }
function setStoredPin(pin: string) { localStorage.setItem(ADMIN_PIN_KEY, pin); }

const targetOpts: { k: TargetAudience; l: string }[] = [
  { k: 'all', l: '\u{1F310} All' }, { k: 'periods', l: '\u{1F33A} Periods' },
  { k: 'fertility', l: '\u{1F495} TTC' }, { k: 'pregnancy', l: '\u{1F930} Pregnancy' }, { k: 'wellness', l: '\u{1F9D8} Wellness' },
];
const catOpts: { k: ProductCategory; l: string }[] = [
  { k: 'hair_oil', l: 'Hair Oil' }, { k: 'skincare', l: 'Skincare' }, { k: 'face_wash', l: 'Face Wash' },
  { k: 'body_lotion', l: 'Lotion' }, { k: 'body_wash', l: 'Body Wash' }, { k: 'hair_treatment', l: 'Treatment' }, { k: 'supplement', l: 'Supplement' },
];


// ─── Reusable form components ───────────────────────
const AdminSearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u{1F50D}'}</span>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all bg-white"
    />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">{'\u2715'}</button>
    )}
  </div>
);

const FormField = ({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }) => (
  <div>
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none resize-none transition-all" rows={3} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
    )}
  </div>
);
const FormNumField = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>
    <input type="number" value={value || ''} onChange={e => onChange(+e.target.value)}
      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
  </div>
);
const FormTargetPicker = ({ value, onChange, opts }: { value: TargetAudience[]; onChange: (v: TargetAudience[]) => void; opts: { k: TargetAudience; l: string }[] }) => (
  <div>
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Visible To</label>
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {opts.map(t => (
        <button key={t.k} onClick={() => onChange(value.includes(t.k) ? value.filter(x => x !== t.k) : [...value, t.k])}
          className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (value.includes(t.k) ? 'bg-rose-100 text-rose-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>{t.l}</button>
      ))}
    </div>
  </div>
);

const FormCheckbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
    <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-800 transition-colors">{label}</span>
  </label>
);
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'NO_SHOW' | 'CANCELLED';

type TabId = 'overview' | 'users' | 'products' | 'articles' | 'doctors' | 'appointments' | 'analytics' | 'settings' | 'callbacks' | 'add_product' | 'add_article' | 'add_doctor' | 'edit_product' | 'edit_article' | 'edit_doctor' | 'analytics_products' | 'analytics_doctors' | 'prescriptions' | 'orders' | 'ayurveda' | 'payouts' | 'finance' | 'audit_log' | 'wellness' | 'add_wellness' | 'edit_wellness' | 'programs' | 'add_program' | 'edit_program' | 'program_content';

// ─── Finance Admin Tab ──────────────────────────────────
// Platform config, coupons, revenue analytics — like Practo/Zomato/Amazon admin
function FinanceTab() {
  const [view, setView] = useState<'overview' | 'config' | 'coupons' | 'add_coupon' | 'edit_coupon'>('overview');
  const [config, setConfig] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCoupon, setEditCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({
    code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxDiscountAmount: '',
    minOrderAmount: '0', applicableTo: 'ALL', maxUses: '', maxUsesPerUser: '1',
    validFrom: '', validUntil: '', isActive: true, firstOrderOnly: false,
    specificDoctorIds: '' as string, specificProductIds: '' as string,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, analyticsRes, couponsRes] = await Promise.all([
        financeAPI.getConfig().then(r => r.data),
        financeAPI.getAnalytics().then(r => r.data),
        financeAPI.getCoupons().then(r => r.data),
      ]);
      setConfig(configRes.data || configRes);
      setAnalytics(analyticsRes.data || analyticsRes);
      setCoupons(couponsRes.data || couponsRes || []);
    } catch { toast.error('Failed to load finance data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveConfig = async () => {
    try {
      await financeAPI.updateConfig(config);
      toast.success('Config saved');
      fetchAll();
    } catch { toast.error('Failed to save'); }
  };

  const saveCoupon = async () => {
    try {
      const data = {
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        maxDiscountAmount: couponForm.maxDiscountAmount ? Number(couponForm.maxDiscountAmount) : null,
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
        maxUsesPerUser: Number(couponForm.maxUsesPerUser) || 1,
        specificDoctorIds: couponForm.specificDoctorIds ? couponForm.specificDoctorIds.split(',').map(s => s.trim()).filter(Boolean) : [],
        specificProductIds: couponForm.specificProductIds ? couponForm.specificProductIds.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (editCoupon) {
        await financeAPI.updateCoupon(editCoupon.id, data);
        toast.success('Coupon updated');
      } else {
        await financeAPI.createCoupon(data);
        toast.success('Coupon created');
      }
      setView('coupons');
      setCouponForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxDiscountAmount: '', minOrderAmount: '0', applicableTo: 'ALL', maxUses: '', maxUsesPerUser: '1', validFrom: '', validUntil: '', isActive: true, firstOrderOnly: false, specificDoctorIds: '', specificProductIds: '' });
      setEditCoupon(null);
      fetchAll();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try { await financeAPI.deleteCoupon(id); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="text-center py-10 text-gray-400 text-xs">Loading finance data...</div>;

  const a = analytics;
  const cfgFields = [
    { key: 'defaultDoctorCommission', label: 'Doctor Commission %', desc: 'Platform keeps this % from appointments (like Practo 15-25%)' },
    { key: 'defaultProductCommission', label: 'Product Commission %', desc: 'Platform keeps this % from product sales (like Amazon 5-20%)' },
    { key: 'platformFeePercent', label: 'Platform Fee %', desc: 'Convenience fee charged to customer (like Zomato 2-5%)' },
    { key: 'platformFeeFlat', label: 'Platform Fee Flat ₹', desc: 'Fixed convenience fee per order' },
    { key: 'deliveryCharge', label: 'Delivery Charge ₹', desc: 'Standard delivery fee' },
    { key: 'freeDeliveryAbove', label: 'Free Delivery Above ₹', desc: 'Orders above this get free delivery' },
    { key: 'gstRate', label: 'GST Rate %', desc: 'Goods & Services Tax' },
    { key: 'codExtraCharge', label: 'COD Extra Charge ₹', desc: 'Extra fee for Cash on Delivery' },
    { key: 'minOrderAmount', label: 'Min Order Amount ₹', desc: 'Minimum cart value to place order' },
    { key: 'cancellationWindowHours', label: 'Free Cancel Window (hrs)', desc: 'Hours within which free cancellation allowed' },
    { key: 'cancellationPenalty', label: 'Cancel Penalty %', desc: '% deducted on late cancellation' },
    { key: 'refundProcessingDays', label: 'Refund Processing Days', desc: 'Days to process refund' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', icon: '📊', label: 'Revenue' },
          { id: 'config', icon: '⚙️', label: 'Config' },
          { id: 'coupons', icon: '🎟️', label: 'Coupons' },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id as any)}
            className={'px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 ' + (view === t.id || (view === 'add_coupon' && t.id === 'coupons') || (view === 'edit_coupon' && t.id === 'coupons') ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-gray-600 shadow-sm')}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── Revenue Analytics ─── */}
      {view === 'overview' && a && (
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-gray-900">🏦 Revenue Dashboard</h3>

          {/* Platform Total */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <p className="text-xs text-white/70 font-bold">Total Platform Revenue</p>
            <p className="text-3xl font-extrabold mt-1">₹{(a.platformTotal?.total || 0).toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/15 rounded-xl p-2.5">
                <p className="text-[9px] text-white/60">Dr Commissions</p>
                <p className="text-sm font-bold">₹{(a.platformTotal?.fromDoctorCommissions || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-2.5">
                <p className="text-[9px] text-white/60">Product Fees</p>
                <p className="text-sm font-bold">₹{(a.platformTotal?.fromProductFees || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-2.5">
                <p className="text-[9px] text-white/60">Platform Fees</p>
                <p className="text-sm font-bold">₹{(a.platformTotal?.fromAppointmentFees || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-2.5">
                <p className="text-[9px] text-white/60">Delivery Charges</p>
                <p className="text-sm font-bold">₹{(a.platformTotal?.fromDeliveryCharges || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Product & Appointment Revenue */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase">Product Sales</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">₹{(a.productRevenue?.totalSales || 0).toLocaleString()}</p>
              <p className="text-[9px] text-gray-500 mt-1">{a.productRevenue?.orderCount || 0} orders</p>
              <p className="text-[9px] text-emerald-600 font-bold">Discounts: ₹{(a.productRevenue?.totalDiscounts || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase">Consultations</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">₹{(a.appointmentRevenue?.totalEarned || 0).toLocaleString()}</p>
              <p className="text-[9px] text-gray-500 mt-1">{a.appointmentRevenue?.appointmentCount || 0} completed</p>
              <p className="text-[9px] text-emerald-600 font-bold">Discounts: ₹{(a.appointmentRevenue?.totalDiscounts || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Payout Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-3">Payout Summary</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-extrabold text-emerald-600">₹{(a.payoutSummary?.totalSettled || 0).toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">Settled</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-amber-500">₹{(a.payoutSummary?.totalPending || 0).toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-purple-600">₹{(a.payoutSummary?.totalPlatformCommission || 0).toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">Commission</p>
              </div>
            </div>
          </div>

          {/* Coupon Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Coupon Impact</p>
              <p className="text-sm font-extrabold text-gray-900 mt-1">{a.coupons?.totalRedemptions || 0} redemptions</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold text-red-500">-₹{(a.coupons?.totalDiscountGiven || 0).toLocaleString()}</p>
              <p className="text-[9px] text-gray-500">Total discount given</p>
            </div>
          </div>

          {/* Current Rates */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Active Rates</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Dr Commission', v: `${a.config?.doctorCommission || 0}%` },
                { l: 'Product Fee', v: `${a.config?.productCommission || 0}%` },
                { l: 'Platform Fee', v: `${a.config?.platformFeePercent || 0}%` },
                { l: 'Delivery', v: `₹${a.config?.deliveryCharge || 0}` },
                { l: 'Free Above', v: `₹${a.config?.freeDeliveryAbove || 0}` },
                { l: 'Flat Fee', v: `₹${a.config?.platformFeeFlat || 0}` },
              ].map(r => (
                <div key={r.l} className="bg-white rounded-xl p-2 text-center">
                  <p className="text-[8px] text-gray-400">{r.l}</p>
                  <p className="text-xs font-extrabold text-gray-800">{r.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Platform Config ─── */}
      {view === 'config' && config && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-extrabold text-gray-900">⚙️ Platform Configuration</h3>
            <button onClick={saveConfig} className="text-[10px] font-bold bg-emerald-500 text-white px-4 py-2 rounded-xl active:scale-95 shadow-md">Save Changes</button>
          </div>
          <p className="text-[10px] text-gray-500">Configure fees, commissions, and delivery charges. Changes apply to all new orders & appointments.</p>

          <div className="space-y-3">
            {cfgFields.map(f => (
              <div key={f.key} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">{f.label}</label>
                  <input type="number" step="any" value={config[f.key] ?? ''}
                    onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm text-right font-bold focus:border-emerald-400 focus:outline-none" />
                </div>
                <p className="text-[9px] text-gray-400">{f.desc}</p>
              </div>
            ))}

            {/* Boolean toggles */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              {[
                { key: 'codEnabled', label: 'Cash on Delivery Enabled' },
                { key: 'includeGstInPrice', label: 'GST Included in Price' },
              ].map(t => (
                <div key={t.key} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">{t.label}</span>
                  <button onClick={() => setConfig({ ...config, [t.key]: !config[t.key] })}
                    className={'w-12 h-6 rounded-full transition-all ' + (config[t.key] ? 'bg-emerald-500' : 'bg-gray-300')}>
                    <div className={'w-5 h-5 rounded-full bg-white shadow-md transition-transform ' + (config[t.key] ? 'translate-x-6' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Coupons List ─── */}
      {view === 'coupons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-extrabold text-gray-900">🎟️ Coupons ({coupons.length})</h3>
            <button onClick={() => { setEditCoupon(null); setCouponForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxDiscountAmount: '', minOrderAmount: '0', applicableTo: 'ALL', maxUses: '', maxUsesPerUser: '1', validFrom: '', validUntil: '', isActive: true, firstOrderOnly: false, specificDoctorIds: '', specificProductIds: '' }); setView('add_coupon'); }}
              className="text-[10px] font-bold bg-emerald-500 text-white px-4 py-2 rounded-xl active:scale-95 shadow-md">+ New Coupon</button>
          </div>

          {coupons.length === 0 && <p className="text-center text-gray-400 text-xs py-10">No coupons yet. Create your first!</p>}

          {coupons.map((c: any) => (
            <div key={c.id} className={'bg-white rounded-2xl p-4 shadow-sm border-l-4 ' + (c.isActive ? 'border-emerald-400' : 'border-gray-300')}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-gray-900 font-mono tracking-wider">{c.code}</span>
                    <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{c.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                    {c.firstOrderOnly && <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">1st Order</span>}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">{c.description || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-emerald-600">
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                  </p>
                  {c.maxDiscountAmount && <p className="text-[9px] text-gray-400">Max ₹{c.maxDiscountAmount}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.applicableTo}</span>
                <span className="text-[9px] text-gray-400">Min ₹{c.minOrderAmount}</span>
                <span className="text-[9px] text-gray-400">Used: {c.currentUses || 0}{c.maxUses ? `/${c.maxUses}` : ''}</span>
                {c.validUntil && <span className="text-[9px] text-gray-400">Expires: {new Date(c.validUntil).toLocaleDateString()}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setEditCoupon(c); setCouponForm({ code: c.code, description: c.description || '', discountType: c.discountType, discountValue: String(c.discountValue), maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : '', minOrderAmount: String(c.minOrderAmount || 0), applicableTo: c.applicableTo, maxUses: c.maxUses ? String(c.maxUses) : '', maxUsesPerUser: String(c.maxUsesPerUser || 1), validFrom: c.validFrom ? c.validFrom.split('T')[0] : '', validUntil: c.validUntil ? c.validUntil.split('T')[0] : '', isActive: c.isActive, firstOrderOnly: c.firstOrderOnly, specificDoctorIds: (c.specificDoctorIds || []).join(', '), specificProductIds: (c.specificProductIds || []).join(', ') }); setView('edit_coupon'); }}
                  className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl active:scale-95">Edit</button>
                <button onClick={() => deleteCoupon(c.id)}
                  className="text-[10px] font-bold bg-red-50 text-red-500 px-3 py-1.5 rounded-xl active:scale-95">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Coupon Form ─── */}
      {(view === 'add_coupon' || view === 'edit_coupon') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('coupons')} className="text-gray-400 text-sm font-bold active:scale-95">←</button>
            <h3 className="text-base font-extrabold text-gray-900">{editCoupon ? 'Edit Coupon' : 'New Coupon'}</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Code *</label>
                <input value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="FIRST50" disabled={!!editCoupon}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono font-bold focus:border-emerald-400 focus:outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description</label>
                <input value={couponForm.description} onChange={e => setCouponForm({ ...couponForm, description: e.target.value })} placeholder="50% off on first order"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Discount</p>
              <div className="flex gap-2">
                {['PERCENTAGE', 'FLAT'].map(t => (
                  <button key={t} onClick={() => setCouponForm({ ...couponForm, discountType: t })}
                    className={'flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ' + (couponForm.discountType === t ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600')}>
                    {t === 'PERCENTAGE' ? '% Percent' : '₹ Flat'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-500">Value *</label>
                  <input type="number" value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })} placeholder={couponForm.discountType === 'PERCENTAGE' ? '20' : '100'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500">Max Discount ₹</label>
                  <input type="number" value={couponForm.maxDiscountAmount} onChange={e => setCouponForm({ ...couponForm, maxDiscountAmount: e.target.value })} placeholder="200"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-gray-500">Min Order Amount ₹</label>
                <input type="number" value={couponForm.minOrderAmount} onChange={e => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Scope & Limits</p>
              <div className="flex gap-2">
                {['ALL', 'CONSULTATION', 'PRODUCTS'].map(s => (
                  <button key={s} onClick={() => setCouponForm({ ...couponForm, applicableTo: s })}
                    className={'flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ' + (couponForm.applicableTo === s ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600')}>
                    {s === 'ALL' ? '🌐 All' : s === 'CONSULTATION' ? '👩‍⚕️ Doctor' : '📦 Products'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-500">Max Uses (total)</label>
                  <input type="number" value={couponForm.maxUses} onChange={e => setCouponForm({ ...couponForm, maxUses: e.target.value })} placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500">Max Uses/User</label>
                  <input type="number" value={couponForm.maxUsesPerUser} onChange={e => setCouponForm({ ...couponForm, maxUsesPerUser: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-500">Valid From</label>
                  <input type="date" value={couponForm.validFrom} onChange={e => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500">Valid Until</label>
                  <input type="date" value={couponForm.validUntil} onChange={e => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">First Order Only</span>
                <button onClick={() => setCouponForm({ ...couponForm, firstOrderOnly: !couponForm.firstOrderOnly })}
                  className={'w-12 h-6 rounded-full transition-all ' + (couponForm.firstOrderOnly ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <div className={'w-5 h-5 rounded-full bg-white shadow-md transition-transform ' + (couponForm.firstOrderOnly ? 'translate-x-6' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Active</span>
                <button onClick={() => setCouponForm({ ...couponForm, isActive: !couponForm.isActive })}
                  className={'w-12 h-6 rounded-full transition-all ' + (couponForm.isActive ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <div className={'w-5 h-5 rounded-full bg-white shadow-md transition-transform ' + (couponForm.isActive ? 'translate-x-6' : 'translate-x-0.5')} />
                </button>
              </div>
              {/* Targeting: specific doctors / products (optional, comma-separated IDs) */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Specific Doctor IDs (optional, comma-separated)</label>
                <input value={couponForm.specificDoctorIds} onChange={e => setCouponForm({ ...couponForm, specificDoctorIds: e.target.value })}
                  placeholder="Leave blank for all doctors" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Specific Product IDs (optional, comma-separated)</label>
                <input value={couponForm.specificProductIds} onChange={e => setCouponForm({ ...couponForm, specificProductIds: e.target.value })}
                  placeholder="Leave blank for all products" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" />
              </div>
            </div>

            <button onClick={saveCoupon} disabled={!couponForm.code || !couponForm.discountValue}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-sm active:scale-95 transition-transform shadow-lg disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
              {editCoupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Tab ──────────────────────────────────────
// Immutable payment ledger — revenue summary, filterable events, CSV export
function AuditLogTab() {
  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const eventTypes = ['ALL', 'ORDER_CREATED', 'ORDER_PAID', 'ORDER_COD', 'WEBHOOK_CAPTURED', 'APPOINTMENT_ORDER_CREATED', 'APPOINTMENT_PAID'];
  const periods = [
    { k: 'today', l: 'Today' }, { k: 'week', l: 'This Week' },
    { k: 'month', l: 'This Month' }, { k: 'year', l: 'This Year' }, { k: '', l: 'All Time' },
  ];

  const loadSummary = useCallback(async () => {
    try {
      const r = await financeAPI.getAuditSummary();
      setSummary(r.data?.data || r.data);
    } catch {}
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await financeAPI.getAuditLog({ eventType: eventFilter, period: periodFilter, page, limit: 25 });
      const d = r.data?.data || r.data;
      setLogs(d.logs || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    } catch {}
    setLoading(false);
  }, [eventFilter, periodFilter, page]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { setPage(1); }, [eventFilter, periodFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await financeAPI.exportAuditCsv({ eventType: eventFilter, period: periodFilter });
      const blob = new Blob([r.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  const fmt = (n: number) => '\u20B9' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const eventLabel: Record<string, { color: string; short: string }> = {
    ORDER_CREATED: { color: 'bg-blue-100 text-blue-700', short: 'Created' },
    ORDER_PAID: { color: 'bg-emerald-100 text-emerald-700', short: 'Paid' },
    ORDER_COD: { color: 'bg-amber-100 text-amber-700', short: 'COD' },
    WEBHOOK_CAPTURED: { color: 'bg-purple-100 text-purple-700', short: 'Webhook' },
    APPOINTMENT_ORDER_CREATED: { color: 'bg-sky-100 text-sky-700', short: 'Appt Order' },
    APPOINTMENT_PAID: { color: 'bg-teal-100 text-teal-700', short: 'Appt Paid' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4CB}'} Payment Audit Log</h3>
        <button onClick={handleExport} disabled={exporting}
          className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-95 shadow-sm transition-all disabled:opacity-50">
          {exporting ? 'Exporting...' : '\u{1F4E5} Export CSV'}
        </button>
      </div>

      {/* Revenue Summary Cards */}
      {summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([
              { label: 'Today Revenue', val: summary.today?.revenue, sub: `${summary.today?.count || 0} txns`, color: 'from-emerald-500 to-teal-500' },
              { label: 'This Week', val: summary.week?.revenue, sub: `${summary.week?.count || 0} txns`, color: 'from-blue-500 to-indigo-500' },
              { label: 'This Month', val: summary.month?.revenue, sub: `${summary.month?.count || 0} txns`, color: 'from-violet-500 to-purple-500' },
              { label: 'All Time', val: summary.allTime?.revenue, sub: `${summary.allTime?.count || 0} txns`, color: 'from-rose-500 to-pink-500' },
            ] as const).map((c, i) => (
              <div key={i} className={`bg-gradient-to-br ${c.color} rounded-2xl p-4 text-white shadow-sm`}>
                <p className="text-[9px] font-bold uppercase opacity-80">{c.label}</p>
                <p className="text-lg font-extrabold mt-0.5">{fmt(c.val)}</p>
                <p className="text-[9px] opacity-70">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Platform Fees & Coupon Cost */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-[9px] text-gray-500 font-bold">Platform Fees</p>
              <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{fmt(summary.month?.platformFees)}</p>
              <p className="text-[8px] text-gray-400">this month</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-[9px] text-gray-500 font-bold">Coupon Cost</p>
              <p className="text-sm font-extrabold text-red-500 mt-0.5">{fmt(summary.month?.couponDiscounts)}</p>
              <p className="text-[8px] text-gray-400">this month</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-[9px] text-gray-500 font-bold">Delivery</p>
              <p className="text-sm font-extrabold text-blue-600 mt-0.5">{fmt(summary.month?.deliveryCharges)}</p>
              <p className="text-[8px] text-gray-400">this month</p>
            </div>
          </div>

          {/* Event Breakdown */}
          {summary.eventBreakdown && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Event Breakdown (All Time)</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.eventBreakdown).map(([evt, count]) => (
                  <span key={evt} className={`px-2 py-1 rounded-full text-[9px] font-bold ${eventLabel[evt]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {eventLabel[evt]?.short || evt}: {count as number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-[10px] font-bold text-gray-500 uppercase">Filters</p>
        <div className="flex flex-wrap gap-1.5">
          {periods.map(p => (
            <button key={p.k} onClick={() => setPeriodFilter(p.k)}
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${periodFilter === p.k ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p.l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {eventTypes.map(e => (
            <button key={e} onClick={() => setEventFilter(e)}
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${eventFilter === e ? 'bg-indigo-500 text-white shadow-sm' : (eventLabel[e]?.color || 'bg-gray-100 text-gray-600') + ' hover:opacity-80'}`}>
              {e === 'ALL' ? 'All Events' : eventLabel[e]?.short || e}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-500">{total} records</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="px-2 py-1 rounded text-[10px] font-bold bg-gray-100 disabled:opacity-30">{'\u2190'}</button>
            <span className="text-[10px] text-gray-500">{page}/{totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="px-2 py-1 rounded text-[10px] font-bold bg-gray-100 disabled:opacity-30">{'\u2192'}</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No audit logs found</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log: any) => (
              <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${eventLabel[log.eventType]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {eventLabel[log.eventType]?.short || log.eventType}
                  </span>
                  <span className="text-[9px] text-gray-400">{new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-1.5">
                  <div>
                    <p className="text-[8px] text-gray-400">Total</p>
                    <p className="text-[11px] font-bold text-gray-800">{fmt(log.totalAmount)}</p>
                  </div>
                  {log.platformFee > 0 && (
                    <div>
                      <p className="text-[8px] text-gray-400">Platform Fee</p>
                      <p className="text-[11px] font-bold text-emerald-600">{fmt(log.platformFee)}</p>
                    </div>
                  )}
                  {log.couponCode && (
                    <div>
                      <p className="text-[8px] text-gray-400">Coupon</p>
                      <p className="text-[11px] font-bold text-red-500">{log.couponCode} (-{fmt(log.couponDiscount)})</p>
                    </div>
                  )}
                  {log.paymentMethod && (
                    <div>
                      <p className="text-[8px] text-gray-400">Method</p>
                      <p className="text-[11px] font-bold text-gray-600">{log.paymentMethod}</p>
                    </div>
                  )}
                  {log.orderNumber && (
                    <div>
                      <p className="text-[8px] text-gray-400">Order</p>
                      <p className="text-[11px] font-bold text-gray-600">{log.orderNumber}</p>
                    </div>
                  )}
                  {log.razorpayPaymentId && (
                    <div>
                      <p className="text-[8px] text-gray-400">Payment ID</p>
                      <p className="text-[11px] font-bold text-gray-500 truncate">{log.razorpayPaymentId}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ayurveda Admin Sub-Tab ────────────────────────────
function AyurvedaAdminTab() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'analytics' | 'profiles' | 'questions'>('analytics');
  const [loading, setLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    if (subTab === 'analytics') {
      wrap(adminAPI.getDoshaAnalytics()).then(r => { setAnalytics(r.data); setLoading(false); }).catch(() => setLoading(false));
    } else if (subTab === 'profiles') {
      const params: any = { page: 1, limit: 50 };
      if (profileFilter) params.dosha = profileFilter;
      if (verifiedFilter) params.verified = verifiedFilter;
      wrap(adminAPI.getDoshaProfiles(params)).then(r => { setProfiles(r.data?.profiles || []); setLoading(false); }).catch(() => setLoading(false));
    } else {
      wrap(adminAPI.getDoshaQuestions()).then(r => { setQuestions(r.data || []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [subTab, profileFilter, verifiedFilter]);

  const doshaEmoji = (d: string) => d?.includes('VATA') ? '🌬️' : d?.includes('PITTA') ? '🔥' : d?.includes('KAPHA') ? '🌿' : '☯️';

  return (<>
    <h3 className="text-base font-extrabold text-gray-900 mb-3">☯️ Ayurveda Management</h3>
    {/* Sub-tabs */}
    <div className="flex gap-2 mb-4">
      {(['analytics', 'profiles', 'questions'] as const).map(t => (
        <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${subTab === t ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          {t === 'analytics' ? '📊 Analytics' : t === 'profiles' ? '👥 Dosha Profiles' : '❓ Questions'}
        </button>
      ))}
    </div>

    {loading ? (
      <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full" /></div>
    ) : subTab === 'analytics' && analytics ? (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Users', value: analytics.totalUsers, emoji: '👥' },
            { label: 'Assessed', value: analytics.assessedUsers, emoji: '☯️' },
            { label: 'Verified (Dr/Admin)', value: analytics.verifiedUsers, emoji: '✅' },
            { label: 'Unassessed', value: analytics.unassessedUsers, emoji: '❓' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <span className="text-xl">{s.emoji}</span>
              <p className="text-lg font-extrabold text-gray-800 mt-1">{s.value}</p>
              <p className="text-[9px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-2">Dosha Distribution</p>
          {analytics.doshaDistribution?.map((d: any) => (
            <div key={d.dosha} className="flex items-center gap-2 mb-2">
              <span>{doshaEmoji(d.dosha)}</span>
              <span className="text-[11px] font-medium text-gray-700 w-24">{d.dosha}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${d.percentage}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 w-16 text-right">{d.count} ({d.percentage}%)</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-2">Assessment Types</p>
          {analytics.assessmentTypeDistribution?.map((a: any) => (
            <div key={a.type} className="flex justify-between text-[11px] text-gray-600 mb-1">
              <span>{a.type === 'SELF_QUICK' ? '🔹 Quick Quiz' : a.type === 'SELF_FULL' ? '🔸 Full Assessment' : a.type === 'DOCTOR_CLINICAL' ? '🩺 Doctor Clinical' : '🔧 Admin Override'}</span>
              <span className="font-bold">{a.count}</span>
            </div>
          ))}
        </div>
      </div>
    ) : subTab === 'profiles' ? (
      <div className="space-y-3">
        <div className="flex gap-2 mb-2">
          <select value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 bg-white">
            <option value="">All Doshas</option>
            <option value="VATA">Vata</option><option value="PITTA">Pitta</option><option value="KAPHA">Kapha</option>
            <option value="VATA_PITTA">Vata-Pitta</option><option value="PITTA_KAPHA">Pitta-Kapha</option><option value="VATA_KAPHA">Vata-Kapha</option>
          </select>
          <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)} className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 bg-white">
            <option value="">All</option><option value="true">Verified</option><option value="false">Unverified</option>
          </select>
        </div>
        {profiles.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No profiles found</p>
        ) : profiles.map((p: any) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">{p.user?.fullName || 'Unknown'}</p>
                <p className="text-[10px] text-gray-500">{p.user?.email || p.user?.phone || ''}</p>
              </div>
              <div className="text-right">
                <span className="text-lg">{doshaEmoji(p.doshaType)}</span>
                <p className="text-[10px] font-bold text-gray-700">{p.dosha || 'Not set'}</p>
                {p.doshaVerified ? (
                  <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">✅ Verified</span>
                ) : (
                  <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">Unverified</span>
                )}
              </div>
            </div>
            {p.vataScore != null && (
              <div className="flex gap-2 mt-2">
                {[{ n: 'V', s: p.vataScore, c: 'bg-indigo-200' }, { n: 'P', s: p.pittaScore, c: 'bg-orange-200' }, { n: 'K', s: p.kaphaScore, c: 'bg-emerald-200' }].map(d => (
                  <div key={d.n} className="flex-1">
                    <div className="flex justify-between text-[8px] text-gray-500"><span>{d.n}</span><span>{d.s}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`${d.c} h-1.5 rounded-full`} style={{ width: `${d.s}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
            {p.doshaAssessments?.[0] && (
              <p className="text-[9px] text-gray-400 mt-1">Last: {p.doshaAssessments[0].assessmentType} • {new Date(p.doshaAssessments[0].createdAt).toLocaleDateString()}</p>
            )}
          </div>
        ))}
      </div>
    ) : subTab === 'questions' ? (
      <div className="space-y-3">
        <p className="text-[10px] text-gray-500">{questions.length} questions in quiz bank</p>
        {questions.map((q: any, i: number) => (
          <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-[10px] text-amber-600 font-bold uppercase">{q.questionCategory} • Weight: {q.weight}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{q.questionText}</p>
              </div>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${q.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {q.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {(q.options || []).map((opt: any, j: number) => (
                <div key={j} className="flex items-center gap-2 text-[10px] text-gray-600 bg-gray-50 rounded-lg px-2 py-1">
                  <span className="flex-1">{opt.label}</span>
                  <span className="text-indigo-500">V:{opt.vataScore}</span>
                  <span className="text-orange-500">P:{opt.pittaScore}</span>
                  <span className="text-emerald-500">K:{opt.kaphaScore}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ) : null}
  </>);
}

export default function AdminPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // Must be logged in to access admin
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }
  // Must have ADMIN role
  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Auth state (PIN is additional security layer on top of JWT auth)
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('sb_admin_unlocked') === '1');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');

  // CMS data
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Appointments state
  const [appts, setAppts] = useState<any[]>([]);
  const [apptsTotal, setApptsTotal] = useState(0);
  const [apptsPage, setApptsPage] = useState(1);
  const [apptsTotalPages, setApptsTotalPages] = useState(1);
  const [apptsStatusFilter, setApptsStatusFilter] = useState('');
  const [apptsLoading, setApptsLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Tab + UI
  const [tab, setTab] = useState<TabId>('overview');
  const [confirmDel, setConfirmDel] = useState<{ id: string; type: string } | null>(null);

  // Edit states
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [editArticle, setEditArticle] = useState<AdminArticle | null>(null);
  const [editDoctor, setEditDoctor] = useState<AdminDoctor | null>(null);

  // Form states
  const emptyProduct = { name: '', category: 'hair_oil' as ProductCategory, price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', targetAudience: ['all'] as TargetAudience[], doctorNote: '', preparationMethod: '', imageUrl: '', galleryImages: [] as string[], isFeatured: false, stock: 0, unit: 'piece', tags: '', ownerEmail: '', ownerPhone: '' };
  const emptyArticle = { title: '', content: '', category: '', readTime: '5 min', emoji: '\u{1F4DD}', targetAudience: ['all'] as TargetAudience[], imageUrl: '', excerpt: '', isFeatured: false, authorName: 'VedaClue Team', tags: '' };
  const emptyDoctor = { name: '', specialization: '', experience: 0, fee: 0, qualification: '', about: '', tags: '', languages: '', avatarUrl: '', isChief: false, isPromoted: false, hospitalName: '', location: '', commissionRate: '' };

  const [np, setNp] = useState(emptyProduct);
  const [na, setNa] = useState(emptyArticle);
  const [nd, setNd] = useState(emptyDoctor);

  // Edit form states
  const [ep, setEp] = useState(emptyProduct);
  const [ea, setEa] = useState(emptyArticle);
  const [ed, setEd] = useState(emptyDoctor);

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Settings state
  const [emailWhitelist, setEmailWhitelist] = useState<string[]>(() => JSON.parse(localStorage.getItem('sb_email_whitelist') || '[]'));
  const [newEmail, setNewEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(() => localStorage.getItem('sb_maintenance') === 'true');
  const [registrationsOpen, setRegistrationsOpen] = useState(() => localStorage.getItem('sb_registrations_off') !== 'true');

  // Callbacks state (API-backed)
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [callbacksLoading, setCallbacksLoading] = useState(false);

  // Product/Doctor Analytics & Prescriptions state
  const [productAnalytics, setProductAnalytics] = useState<any>(null);
  const [doctorAnalytics, setDoctorAnalytics] = useState<any>(null);
  const [productAnalyticsLoading, setProductAnalyticsLoading] = useState(false);
  const [doctorAnalyticsLoading, setDoctorAnalyticsLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [expandedPrescription, setExpandedPrescription] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTotal, setOrdersTotal] = useState(0);

  // Loading states for actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Payouts state
  const [payoutSummary, setPayoutSummary] = useState<any>(null);
  const [payoutList, setPayoutList] = useState<any[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [showPayoutModal, setShowPayoutModal] = useState<any>(null); // doctor object to generate payout for
  const [payoutCommission, setPayoutCommission] = useState('20');
  const [markPaidModal, setMarkPaidModal] = useState<any>(null); // payout to mark as paid
  const [payoutTxnId, setPayoutTxnId] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('UPI');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Wellness Activities state
  const [wellnessActivities, setWellnessActivities] = useState<any[]>([]);
  const [wellnessLoading, setWellnessLoading] = useState(false);
  const [wellnessSearch, setWellnessSearch] = useState('');
  const [wellnessCatFilter, setWellnessCatFilter] = useState('');
  const [editWellness, setEditWellness] = useState<any>(null);
  // Add/Edit wellness form
  const [wfTitle, setWfTitle] = useState('');
  const [wfDescription, setWfDescription] = useState('');
  const [wfCategory, setWfCategory] = useState('yoga');
  const [wfDuration, setWfDuration] = useState('10');
  const [wfDifficulty, setWfDifficulty] = useState('beginner');
  const [wfPhases, setWfPhases] = useState<string[]>([]);
  const [wfImageUrl, setWfImageUrl] = useState('');
  const [wfVideoUrl, setWfVideoUrl] = useState('');
  const [wfAudioUrl, setWfAudioUrl] = useState('');
  const [wfInstructions, setWfInstructions] = useState('');
  const [wfSaving, setWfSaving] = useState(false);

  // Programs state
  const [adminPrograms, setAdminPrograms] = useState<any[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [programCatFilter, setProgramCatFilter] = useState('');
  const [editProgram, setEditProgram] = useState<any>(null);
  const [programContents, setProgramContents] = useState<any[]>([]);
  const [contentProgramId, setContentProgramId] = useState('');
  // Program form
  const [pfTitle, setPfTitle] = useState('');
  const [pfSubtitle, setPfSubtitle] = useState('');
  const [pfDescription, setPfDescription] = useState('');
  const [pfEmoji, setPfEmoji] = useState('🌸');
  const [pfImageUrl, setPfImageUrl] = useState('');
  const [pfCategory, setPfCategory] = useState('pcod');
  const [pfDuration, setPfDuration] = useState('30 days');
  const [pfDurationDays, setPfDurationDays] = useState('30');
  const [pfIsFree, setPfIsFree] = useState(true);
  const [pfPrice, setPfPrice] = useState('0');
  const [pfDiscountPrice, setPfDiscountPrice] = useState('');
  const [pfDifficulty, setPfDifficulty] = useState('beginner');
  const [pfHighlights, setPfHighlights] = useState('');
  const [pfWhatYouGet, setPfWhatYouGet] = useState('');
  const [pfPrerequisites, setPfPrerequisites] = useState('');
  const [pfDoctorName, setPfDoctorName] = useState('');
  const [pfSaving, setPfSaving] = useState(false);
  // Content form
  const [cfTitle, setCfTitle] = useState('');
  const [cfDescription, setCfDescription] = useState('');
  const [cfType, setCfType] = useState('video');
  const [cfWeek, setCfWeek] = useState('1');
  const [cfDay, setCfDay] = useState('');
  const [cfSort, setCfSort] = useState('0');
  const [cfVideoUrl, setCfVideoUrl] = useState('');
  const [cfAudioUrl, setCfAudioUrl] = useState('');
  const [cfImageUrl, setCfImageUrl] = useState('');
  const [cfBody, setCfBody] = useState('');
  const [cfDuration, setCfDuration] = useState('');
  const [cfIsFree, setCfIsFree] = useState(false);
  const [cfSaving, setCfSaving] = useState(false);

  // Search states for all tabs (client-side filtering)
  const [doctorSearch, setDoctorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [articleSearch, setArticleSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [callbackSearch, setCallbackSearch] = useState('');
  const [prescriptionSearch, setPrescriptionSearch] = useState('');

  // ─── Helpers ────────────────────────────────────────
  // Verify token exists before any admin API call; redirect to login if missing
  const ensureToken = (): boolean => {
    const token = localStorage.getItem('sb_token');
    if (!token) {
      toast.error('Session expired — please log in again');
      sessionStorage.removeItem('sb_admin_unlocked');
      nav('/auth');
      return false;
    }
    return true;
  };

  // ─── Data fetchers ──────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!ensureToken()) return;
    setDashLoading(true);
    try {
      const res = await apiService.getDashboard();
      const data = res.data;
      setProducts(data.products || []);
      setArticles(data.articles || []);
      setDoctors(data.doctors || []);
    } catch (e: any) {
      console.error('[Admin] fetchDashboard failed:', e.message, e.response?.status, e.code);
      toast.error(e.message || 'Failed to load dashboard');
    } finally {
      setDashLoading(false);
    }
  }, []);

  const fetchUsers = async (page = 1, search = usersSearch, role = usersRoleFilter) => {
    if (!ensureToken()) return;
    setUsersLoading(true);
    try {
      const params: any = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (role) params.role = role;
      const res = await apiService.getAdminUsers(params);
      const d = res.data;
      setUsers(d.users);
      setUsersTotal(d.total);
      setUsersPage(d.page);
      setUsersTotalPages(d.totalPages);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAppointments = async (page = 1, status = apptsStatusFilter) => {
    if (!ensureToken()) return;
    setApptsLoading(true);
    try {
      const params: any = { page: String(page) };
      if (status) params.status = status;
      const res = await apiService.getAdminAppointments(params);
      const d = res.data;
      setAppts(d.appointments);
      setApptsTotal(d.total);
      setApptsPage(d.page);
      setApptsTotalPages(d.totalPages);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load appointments');
    } finally {
      setApptsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!ensureToken()) return;
    setAnalyticsLoading(true);
    try {
      const res = await apiService.getAnalytics();
      setAnalytics(res.data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchCallbacks = async () => {
    if (!ensureToken()) return;
    setCallbacksLoading(true);
    try {
      const res = await apiService.adminGetCallbacks();
      setCallbacks(res.data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load callbacks');
    } finally {
      setCallbacksLoading(false);
    }
  };

  const handleUpdateCallback = async (id: string, status: string, adminNotes?: string) => {
    try {
      const res = await apiService.adminUpdateCallback(id, { status, adminNotes });
      setCallbacks(prev => prev.map(c => c.id === id ? res.data : c));
      toast.success('Callback updated');
    } catch (e: any) { toast.error(e.message || 'Failed to update callback'); }
  };

  const handleDeleteCallback = async (id: string) => {
    try {
      await apiService.adminDeleteCallback(id);
      setCallbacks(prev => prev.filter(c => c.id !== id));
      toast.success('Callback deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete callback'); }
  };

  const fetchProductAnalytics = async () => {
    if (!ensureToken()) return;
    setProductAnalyticsLoading(true);
    try {
      const res = await apiService.getAdminProductAnalytics();
      setProductAnalytics(res.data);
    } catch (e: any) { toast.error('Failed to load product analytics'); }
    finally { setProductAnalyticsLoading(false); }
  };

  const fetchDoctorAnalytics = async () => {
    if (!ensureToken()) return;
    setDoctorAnalyticsLoading(true);
    try {
      const res = await apiService.getAdminDoctorAnalytics();
      setDoctorAnalytics(res.data);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e.message || 'Network error';
      toast.error('Doctor analytics: ' + msg);
    }
    finally { setDoctorAnalyticsLoading(false); }
  };

  const fetchPrescriptions = async () => {
    if (!ensureToken()) return;
    setPrescriptionsLoading(true);
    try {
      const res = await apiService.getAdminPrescriptions();
      setPrescriptions(res.data || []);
    } catch (e: any) { toast.error('Failed to load prescriptions'); }
    finally { setPrescriptionsLoading(false); }
  };

  const fetchOrders = async (page = 1) => {
    if (!ensureToken()) return;
    setOrdersLoading(true);
    try {
      const res = await apiService.adminGetOrders({ page, limit: 20 });
      setOrders(res.data?.orders || []);
      setOrdersTotal(res.data?.total || 0);
    } catch (e: any) { toast.error('Failed to load orders'); }
    finally { setOrdersLoading(false); }
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      await apiService.adminUpdateOrderStatus(id, status);
      toast.success('Order status updated');
      fetchOrders();
    } catch (e: any) { toast.error('Failed to update order status'); }
  };

  // Payout fetchers
  const fetchPayoutSummary = async () => {
    if (!ensureToken()) return;
    setPayoutsLoading(true);
    try {
      const res = await apiService.getPayoutSummary();
      setPayoutSummary(res.data);
    } catch { toast.error('Failed to load payout summary'); }
    finally { setPayoutsLoading(false); }
  };
  const fetchPayoutList = async (status = payoutStatusFilter) => {
    if (!ensureToken()) return;
    try {
      const res = await apiService.getPayoutList(status ? { status } : {});
      setPayoutList(res.data || []);
    } catch { toast.error('Failed to load payouts'); }
  };
  const handleGeneratePayout = async (doctorId: string) => {
    try {
      await apiService.generatePayout({ doctorId, commissionRate: parseFloat(payoutCommission) || 20 });
      toast.success('Settlement generated!');
      setShowPayoutModal(null);
      fetchPayoutSummary();
      fetchPayoutList();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to generate settlement'); }
  };
  const handleMarkPaid = async (payoutId: string) => {
    try {
      await apiService.updatePayout(payoutId, { status: 'PAID', transactionId: payoutTxnId, paymentMethod: payoutMethod, adminNotes: payoutNotes });
      toast.success('Payout marked as paid!');
      setMarkPaidModal(null);
      setPayoutTxnId(''); setPayoutMethod('UPI'); setPayoutNotes('');
      fetchPayoutSummary();
      fetchPayoutList();
    } catch { toast.error('Failed to update payout'); }
  };
  const handleDeletePayout = async (id: string) => {
    if (!confirm('Delete this pending payout?')) return;
    try {
      await apiService.deletePayout(id);
      toast.success('Payout deleted');
      fetchPayoutSummary();
      fetchPayoutList();
    } catch { toast.error('Failed to delete payout'); }
  };

  // ─── Wellness fetcher ─────────────────────────────────
  const fetchWellness = async () => {
    if (!ensureToken()) return;
    setWellnessLoading(true);
    try {
      const res = await apiService.getWellness();
      setWellnessActivities(res.data || []);
    } catch { toast.error('Failed to load wellness activities'); }
    finally { setWellnessLoading(false); }
  };
  const resetWellnessForm = () => {
    setWfTitle(''); setWfDescription(''); setWfCategory('yoga'); setWfDuration('10');
    setWfDifficulty('beginner'); setWfPhases([]); setWfImageUrl(''); setWfVideoUrl('');
    setWfAudioUrl(''); setWfInstructions(''); setEditWellness(null);
  };
  const handleSaveWellness = async () => {
    if (!wfTitle.trim()) { toast.error('Title is required'); return; }
    setWfSaving(true);
    try {
      const payload = {
        title: wfTitle.trim(), description: wfDescription.trim(), category: wfCategory,
        durationMinutes: parseInt(wfDuration) || 10, difficulty: wfDifficulty,
        cyclePhases: wfPhases, imageUrl: wfImageUrl || null, videoUrl: wfVideoUrl || null,
        audioUrl: wfAudioUrl || null, instructions: wfInstructions ? wfInstructions.split('\n').filter(Boolean) : null,
      };
      if (editWellness) {
        await apiService.updateWellness(editWellness.id, payload);
        toast.success('Activity updated!');
      } else {
        await apiService.createWellness(payload);
        toast.success('Activity created!');
      }
      resetWellnessForm();
      setTab('wellness');
      fetchWellness();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Save failed'); }
    finally { setWfSaving(false); }
  };

  // ─── Programs fetcher ───────────────────────────────────
  const fetchPrograms = async () => {
    if (!ensureToken()) return;
    setProgramsLoading(true);
    try {
      const res = await apiService.getPrograms();
      setAdminPrograms(res.data || []);
    } catch { toast.error('Failed to load programs'); }
    finally { setProgramsLoading(false); }
  };
  const fetchProgramContents = async (programId: string) => {
    try {
      const res = await apiService.getProgramContents(programId);
      setProgramContents(res.data || []);
      setContentProgramId(programId);
    } catch { toast.error('Failed to load content'); }
  };
  const resetProgramForm = () => {
    setPfTitle(''); setPfSubtitle(''); setPfDescription(''); setPfEmoji('🌸');
    setPfImageUrl(''); setPfCategory('pcod'); setPfDuration('30 days');
    setPfDurationDays('30'); setPfIsFree(true); setPfPrice('0'); setPfDiscountPrice('');
    setPfDifficulty('beginner'); setPfHighlights(''); setPfWhatYouGet('');
    setPfPrerequisites(''); setPfDoctorName(''); setEditProgram(null);
  };
  const resetContentForm = () => {
    setCfTitle(''); setCfDescription(''); setCfType('video'); setCfWeek('1');
    setCfDay(''); setCfSort('0'); setCfVideoUrl(''); setCfAudioUrl('');
    setCfImageUrl(''); setCfBody(''); setCfDuration(''); setCfIsFree(false);
  };
  const handleSaveProgram = async () => {
    if (!pfTitle.trim()) { toast.error('Title is required'); return; }
    setPfSaving(true);
    try {
      const payload = {
        title: pfTitle.trim(), subtitle: pfSubtitle.trim(), description: pfDescription.trim(),
        emoji: pfEmoji, imageUrl: pfImageUrl || null, category: pfCategory,
        duration: pfDuration, durationDays: parseInt(pfDurationDays) || 30,
        isFree: pfIsFree, price: parseFloat(pfPrice) || 0,
        discountPrice: pfDiscountPrice ? parseFloat(pfDiscountPrice) : null,
        difficulty: pfDifficulty,
        highlights: pfHighlights ? pfHighlights.split('\n').filter(Boolean) : [],
        whatYouGet: pfWhatYouGet ? pfWhatYouGet.split('\n').filter(Boolean) : [],
        prerequisites: pfPrerequisites || null, doctorName: pfDoctorName || null,
      };
      if (editProgram) {
        await apiService.updateProgram(editProgram.id, payload);
        toast.success('Program updated!');
      } else {
        await apiService.createProgram(payload);
        toast.success('Program created!');
      }
      resetProgramForm();
      setTab('programs');
      fetchPrograms();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Save failed'); }
    finally { setPfSaving(false); }
  };
  const handleSaveContent = async () => {
    if (!cfTitle.trim() || !contentProgramId) { toast.error('Title is required'); return; }
    setCfSaving(true);
    try {
      await apiService.addProgramContent(contentProgramId, {
        title: cfTitle.trim(), description: cfDescription.trim(), contentType: cfType,
        weekNumber: parseInt(cfWeek) || 1, dayNumber: cfDay ? parseInt(cfDay) : null,
        sortOrder: parseInt(cfSort) || 0, videoUrl: cfVideoUrl || null,
        audioUrl: cfAudioUrl || null, imageUrl: cfImageUrl || null,
        body: cfBody || null, duration: cfDuration || null, isFree: cfIsFree,
      });
      toast.success('Content added!');
      resetContentForm();
      fetchProgramContents(contentProgramId);
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Save failed'); }
    finally { setCfSaving(false); }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!isUnlocked) return;
    if (tab === 'overview' || tab === 'doctors' || tab === 'products' || tab === 'articles') fetchDashboard();
    if (tab === 'users') fetchUsers(1, usersSearch, usersRoleFilter);
    if (tab === 'appointments') fetchAppointments(1, apptsStatusFilter);
    if (tab === 'analytics') fetchAnalytics();
    if (tab === 'orders') fetchOrders();
    if (tab === 'callbacks') fetchCallbacks();
    if (tab === 'analytics_products') fetchProductAnalytics();
    if (tab === 'analytics_doctors') fetchDoctorAnalytics();
    if (tab === 'prescriptions') fetchPrescriptions();
    if (tab === 'payouts') { fetchPayoutSummary(); fetchPayoutList(); }
    if (tab === 'wellness') fetchWellness();
    if (tab === 'programs') fetchPrograms();
  }, [tab, isUnlocked]);

  // ─── Auth ───────────────────────────────────────────
  const handleUnlock = async () => {
    if (password !== getStoredPin()) {
      setPassError('Incorrect password. Access denied.');
      setPassword('');
      return;
    }
    // Verify server connectivity + token validity before unlocking
    if (!ensureToken()) return;
    try {
      await apiService.getDashboard();
    } catch (e: any) {
      const msg = e.message || 'Connection failed';
      if (msg.includes('Authentication') || msg.includes('Token') || msg.includes('Access denied')) {
        toast.error('Your session expired. Please log in again.');
        sessionStorage.removeItem('sb_admin_unlocked');
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_refresh');
        nav('/auth');
        return;
      }
      // Non-auth errors — still unlock but warn
      toast.error(msg);
    }
    setIsUnlocked(true);
    sessionStorage.setItem('sb_admin_unlocked', '1');
    setPassword('');
    setPassError('');
    toast.success('Welcome, Admin!');
    await fetchDashboard();
  };

  const handleLock = () => { setIsUnlocked(false); sessionStorage.removeItem('sb_admin_unlocked'); nav('/profile'); };

  // ─── LOGIN SCREEN ───────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%)', backgroundSize: '50px 50px' }} />
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full border border-white/20">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-3xl text-white shadow-lg mb-6 animate-pulse">
            {'\u{1F6E1}\uFE0F'}
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin Console</h2>
          <p className="text-sm text-gray-400 mt-1 font-medium">VedaClue Control Panel</p>
          <p className="text-[10px] text-gray-300 mb-6">Authorized personnel only</p>
          <div className="relative mb-4">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setPassError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && password) handleUnlock(); }}
              placeholder="Enter admin password"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-rose-400 focus:ring-4 focus:ring-rose-100 focus:outline-none transition-all pr-12"
              autoFocus
            />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm hover:text-gray-600 transition-colors">
              {showPass ? '\u{1F441}\uFE0F' : '\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F'}
            </button>
          </div>
          {passError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-600 font-bold">{'\u26D4'} {passError}</p>
            </div>
          )}
          <button onClick={handleUnlock} disabled={!password}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all shadow-lg hover:shadow-xl bg-gradient-to-r from-rose-500 to-pink-500">
            {'\u{1F513}'} Authenticate
          </button>
          <button onClick={() => nav('/profile')} className="mt-5 text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors">
            {'\u2190'} Back to Profile
          </button>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-300">This panel is restricted. Unauthorized access attempts are logged.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ──────────────────────────────────────
  const pubProducts = products.filter(p => p.isPublished).length;
  const pubArticles = articles.filter(a => a.isPublished).length;
  const reviewArticles = articles.filter(a => a.status === 'REVIEW').length;
  const pubDoctors = doctors.filter(d => d.isPublished).length;

  // ─── CRUD Handlers ──────────────────────────────────
  const handleAddProduct = async () => {
    if (!np.name || np.price <= 0) { toast.error('Name and price required'); return; }
    setActionLoading('add_product');
    try {
      const res = await apiService.adminCreateProduct({
        ...np,
        discountPrice: np.discountPrice > 0 ? np.discountPrice : undefined,
        ingredients: np.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        benefits: np.benefits.split(',').map(s => s.trim()).filter(Boolean),
        tags: np.tags ? np.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        preparationMethod: np.preparationMethod || undefined,
        doctorNote: np.doctorNote || undefined,
        imageUrl: np.imageUrl || undefined,
        galleryImages: np.galleryImages || [],
        stock: np.stock || 0,
        unit: np.unit || 'piece',
        ownerEmail: np.ownerEmail || undefined,
        ownerPhone: np.ownerPhone || undefined,
      });
      setProducts(prev => [res.data, ...prev]);
      toast.success('Product added as draft!');
      setNp(emptyProduct);
      setTab('products');
    } catch (e: any) { toast.error(e.message || 'Failed to add product'); }
    finally { setActionLoading(null); }
  };

  const handleUpdateProduct = async () => {
    if (!editProduct) return;
    setActionLoading('edit_product');
    try {
      const res = await apiService.adminUpdateProduct(editProduct.id, {
        name: ep.name, category: ep.category, price: ep.price,
        discountPrice: ep.discountPrice > 0 ? ep.discountPrice : null,
        description: ep.description,
        ingredients: ep.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        benefits: ep.benefits.split(',').map(s => s.trim()).filter(Boolean),
        howToUse: ep.howToUse, size: ep.size, emoji: ep.emoji,
        targetAudience: ep.targetAudience,
        tags: ep.tags ? ep.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        imageUrl: ep.imageUrl || null,
        galleryImages: ep.galleryImages || [],
        isFeatured: ep.isFeatured, stock: ep.stock, unit: ep.unit,
        ownerEmail: ep.ownerEmail || null,
        ownerPhone: ep.ownerPhone || null,
      });
      setProducts(prev => prev.map(p => p.id === editProduct.id ? res.data : p));
      toast.success('Product updated!');
      setEditProduct(null);
      setTab('products');
    } catch (e: any) { toast.error(e.message || 'Failed to update product'); }
    finally { setActionLoading(null); }
  };

  const handleToggleProductPublish = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiService.adminToggleProductPublish(id);
      setProducts(prev => prev.map(p => p.id === id ? res.data : p));
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteProduct = async (id: string) => {
    setActionLoading(id);
    try {
      await apiService.adminDeleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
    finally { setActionLoading(null); }
  };

  const handleAddArticle = async () => {
    if (!na.title || !na.content) { toast.error('Title and content required'); return; }
    setActionLoading('add_article');
    try {
      const res = await apiService.adminCreateArticle({
        ...na,
        author: 'chief',
        imageUrl: na.imageUrl || undefined,
        tags: na.tags ? na.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        authorName: na.authorName || 'VedaClue Team',
      });
      setArticles(prev => [res.data, ...prev]);
      toast.success('Article saved as draft!');
      setNa(emptyArticle);
      setTab('articles');
    } catch (e: any) { toast.error(e.message || 'Failed to add article'); }
    finally { setActionLoading(null); }
  };

  const handleUpdateArticle = async () => {
    if (!editArticle) return;
    setActionLoading('edit_article');
    try {
      const res = await apiService.adminUpdateArticle(editArticle.id, {
        title: ea.title, content: ea.content, excerpt: ea.excerpt,
        category: ea.category, emoji: ea.emoji,
        targetAudience: ea.targetAudience,
        tags: ea.tags ? ea.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        imageUrl: ea.imageUrl || null,
        readTime: ea.readTime,
        isFeatured: ea.isFeatured,
        authorName: ea.authorName || 'VedaClue Team',
      });
      setArticles(prev => prev.map(a => a.id === editArticle.id ? res.data : a));
      toast.success('Article updated!');
      setEditArticle(null);
      setTab('articles');
    } catch (e: any) { toast.error(e.message || 'Failed to update article'); }
    finally { setActionLoading(null); }
  };

  const handleToggleArticlePublish = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiService.adminToggleArticlePublish(id);
      setArticles(prev => prev.map(a => a.id === id ? res.data : a));
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteArticle = async (id: string) => {
    setActionLoading(id);
    try {
      await apiService.adminDeleteArticle(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
    finally { setActionLoading(null); }
  };

  const handleAddDoctor = async () => {
    if (!nd.name) { toast.error('Name required'); return; }
    setActionLoading('add_doctor');
    try {
      const res = await apiService.adminCreateDoctor({
        name: nd.name, specialization: nd.specialization, experience: nd.experience,
        fee: nd.fee, qualification: nd.qualification, about: nd.about,
        tags: nd.tags.split(',').map(s => s.trim()).filter(Boolean),
        languages: nd.languages.split(',').map(s => s.trim()).filter(Boolean),
        avatarUrl: nd.avatarUrl || undefined,
        isChief: nd.isChief, isPromoted: nd.isPromoted,
        hospitalName: nd.hospitalName || undefined, location: nd.location || undefined,
        commissionRate: nd.commissionRate ? Number(nd.commissionRate) : null,
      });
      setDoctors(prev => [res.data, ...prev]);
      toast.success('Doctor added!');
      setNd(emptyDoctor);
      setTab('doctors');
    } catch (e: any) { toast.error(e.message || 'Failed to add doctor'); }
    finally { setActionLoading(null); }
  };

  const handleUpdateDoctor = async () => {
    if (!editDoctor) return;
    setActionLoading('edit_doctor');
    try {
      const res = await apiService.adminUpdateDoctor(editDoctor.id, {
        name: ed.name, specialization: ed.specialization, experience: ed.experience,
        fee: ed.fee, qualification: ed.qualification, about: ed.about,
        tags: ed.tags.split(',').map(s => s.trim()).filter(Boolean),
        languages: ed.languages.split(',').map(s => s.trim()).filter(Boolean),
        avatarUrl: ed.avatarUrl || undefined,
        isChief: ed.isChief, isPromoted: ed.isPromoted,
        hospitalName: ed.hospitalName || undefined, location: ed.location || undefined,
        commissionRate: ed.commissionRate ? Number(ed.commissionRate) : null,
      });
      setDoctors(prev => prev.map(d => d.id === editDoctor.id ? res.data : d));
      toast.success('Doctor updated!');
      setEditDoctor(null);
      setTab('doctors');
    } catch (e: any) { toast.error(e.message || 'Failed to update doctor'); }
    finally { setActionLoading(null); }
  };

  const handleToggleDoctorPublish = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiService.adminToggleDoctorPublish(id);
      setDoctors(prev => prev.map(d => d.id === id ? res.data : d));
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleToggleDoctorPromote = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiService.adminToggleDoctorPromote(id);
      setDoctors(prev => prev.map(d => d.id === id ? res.data : d));
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteDoctor = async (id: string) => {
    setActionLoading(id);
    try {
      await apiService.adminDeleteDoctor(id);
      setDoctors(prev => prev.filter(d => d.id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
    finally { setActionLoading(null); }
  };

  // Edit openers
  const openEditProduct = (p: AdminProduct) => {
    setEditProduct(p);
    setEp({
      name: p.name, category: p.category, price: p.price,
      discountPrice: p.discountPrice || 0, description: p.description,
      ingredients: (p.ingredients || []).join(', '), benefits: (p.benefits || []).join(', '),
      howToUse: p.howToUse || '', size: p.size || '', emoji: p.emoji || '\u{1F33F}',
      targetAudience: p.targetAudience || ['all'],
      doctorNote: '', preparationMethod: '',
      imageUrl: p.imageUrl || '', galleryImages: p.galleryImages || [],
      isFeatured: p.isFeatured || false,
      stock: p.stock || 0, unit: p.unit || 'piece',
      tags: (p.tags || []).join(', '),
      ownerEmail: (p as any).ownerEmail || '', ownerPhone: (p as any).ownerPhone || '',
    });
    setTab('edit_product');
  };

  const openEditArticle = (a: AdminArticle) => {
    setEditArticle(a);
    setEa({
      title: a.title, content: a.content, category: a.category,
      readTime: a.readTime || '5 min', emoji: a.emoji || '\u{1F4DD}',
      targetAudience: a.targetAudience || ['all'],
      imageUrl: a.imageUrl || '', excerpt: a.excerpt || '',
      isFeatured: a.isFeatured || false,
      authorName: a.authorName || 'VedaClue Team',
      tags: (a.tags || []).join(', '),
    });
    setTab('edit_article');
  };

  const openEditDoctor = (d: AdminDoctor) => {
    setEditDoctor(d);
    setEd({
      name: d.name, specialization: d.specialization,
      experience: d.experience, fee: d.fee,
      qualification: d.qualification || '',
      about: d.about || '',
      tags: (d.tags || []).join(', '),
      languages: (d.languages || []).join(', '),
      avatarUrl: d.avatarUrl || '',
      isChief: d.isChief || false, isPromoted: d.isPromoted || false,
      hospitalName: d.hospitalName || '', location: d.location || '',
      commissionRate: (d as any).commissionRate != null ? String((d as any).commissionRate) : '',
    });
    setTab('edit_doctor');
  };

  // User management handlers
  const handleUpdateUserRole = async (id: string, role: string) => {
    try {
      const res = await apiService.updateUser(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? res.data : u));
      toast.success('Role updated');
    } catch (e: any) { toast.error(e.message || 'Failed to update role'); }
  };

  const handleToggleUserActive = async (id: string, currentlyActive: boolean) => {
    try {
      const res = await apiService.updateUser(id, { isActive: !currentlyActive });
      setUsers(prev => prev.map(u => u.id === id ? res.data : u));
      toast.success(currentlyActive ? 'User banned' : 'User activated');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  // Appointment status handler
  const handleUpdateApptStatus = async (id: string, status: string) => {
    try {
      const res = await apiService.adminUpdateAppointment(id, { status });
      setAppts(prev => prev.map(a => a.id === id ? res.data : a));
      toast.success('Status updated');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  // Settings handlers
  const handleAddWhitelistEmail = () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    const updated = [...emailWhitelist, newEmail.trim()];
    setEmailWhitelist(updated);
    localStorage.setItem('sb_email_whitelist', JSON.stringify(updated));
    setNewEmail('');
    toast.success('Email added');
  };

  const handleRemoveWhitelistEmail = (email: string) => {
    const updated = emailWhitelist.filter(e => e !== email);
    setEmailWhitelist(updated);
    localStorage.setItem('sb_email_whitelist', JSON.stringify(updated));
    toast.success('Email removed');
  };

  const toggleMaintenance = () => {
    const v = !maintenanceMode;
    setMaintenanceMode(v);
    localStorage.setItem('sb_maintenance', String(v));
    toast.success(v ? 'Maintenance mode ON' : 'Maintenance mode OFF');
  };

  const toggleRegistrations = () => {
    const v = !registrationsOpen;
    setRegistrationsOpen(v);
    localStorage.setItem('sb_registrations_off', String(!v));
    toast.success(v ? 'Registrations enabled' : 'Registrations disabled');
  };

  // ─── Tab config ─────────────────────────────────────
  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'overview', icon: '\u{1F4CA}', label: 'Home' },
    { id: 'users', icon: '\u{1F465}', label: 'Users' },
    { id: 'products', icon: '\u{1F4E6}', label: 'Products' },
    { id: 'articles', icon: '\u{1F4DD}', label: 'Articles' },
    { id: 'doctors', icon: '\u{1F469}\u200D\u2695\uFE0F', label: 'Doctors' },
    { id: 'appointments', icon: '\u{1F4C5}', label: 'Appts' },
    { id: 'analytics', icon: '\u{1F4C8}', label: 'Stats' },
    { id: 'settings', icon: '\u2699\uFE0F', label: 'Settings' },
    { id: 'callbacks', icon: '\u{1F4DE}', label: 'Callbacks' },
    { id: 'analytics_products', icon: '\u{1F4CA}', label: 'Prod Stats' },
    { id: 'analytics_doctors', icon: '\u{1FA7A}', label: 'Doc Stats' },
    { id: 'orders', icon: '\u{1F6D2}', label: 'Orders' },
    { id: 'prescriptions', icon: '\u{1F48A}', label: 'Rx' },
    { id: 'ayurveda', icon: '☯️', label: 'Ayurveda' },
    { id: 'payouts', icon: '\u{1F4B0}', label: 'Payouts' },
    { id: 'wellness', icon: '🧘', label: 'Wellness' },
    { id: 'programs', icon: '🎓', label: 'Programs' },
    { id: 'finance', icon: '🏦', label: 'Finance' },
    { id: 'audit_log', icon: '\u{1F4CB}', label: 'Audit Log' },
  ];

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = { USER: 'bg-blue-100 text-blue-700', DOCTOR: 'bg-emerald-100 text-emerald-700', ADMIN: 'bg-red-100 text-red-700' };
    return <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (colors[role] || 'bg-gray-100 text-gray-600')}>{role}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-orange-100 text-orange-700',
      REJECTED: 'bg-red-100 text-red-700', NO_SHOW: 'bg-gray-200 text-gray-600',
      DRAFT: 'bg-gray-100 text-gray-600', REVIEW: 'bg-amber-100 text-amber-700', PUBLISHED: 'bg-emerald-100 text-emerald-700',
      ARCHIVED: 'bg-red-100 text-red-600',
      draft: 'bg-gray-100 text-gray-600', published: 'bg-emerald-100 text-emerald-700',
      archived: 'bg-red-100 text-red-600',
      pending: 'bg-orange-100 text-orange-700', active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-red-100 text-red-600',
    };
    return <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (colors[status] || 'bg-gray-100 text-gray-600')}>{status}</span>;
  };

  const initials = (name: string) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';


  return (
    <div className="min-h-screen pb-8 bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center text-lg">
              {'\u{1F6E1}\uFE0F'}
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight">VedaClue Admin</h1>
              <p className="text-[9px] text-white/60 font-medium">Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDashboard} className="text-[10px] font-bold bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2 rounded-full active:scale-95 transition-all">
              {'\u{1F504}'} Refresh
            </button>
            <button onClick={handleLock} className="text-[10px] font-bold bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2 rounded-full active:scale-95 transition-all">
              {'\u{1F512}'} Lock
            </button>
          </div>
        </div>
        <div className="px-3 pb-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ' + (tab === t.id ? 'bg-white text-rose-600 shadow-sm' : 'text-white/60 hover:text-white/90 hover:bg-white/10')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4 max-w-[430px] mx-auto">

        {/* Loading spinner */}
        {dashLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-rose-400 border-t-transparent rounded-full" />
          </div>
        )}

        {!dashLoading && (<>

          {/* ════════ OVERVIEW ════════ */}
          {tab === 'overview' && (<>
            {/* Welcome greeting */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-5 text-white shadow-md">
              <p className="text-sm font-medium text-white/80">Welcome back, Admin</p>
              <p className="text-xl font-extrabold mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="text-[10px] text-white/60 mt-1">Here is your dashboard overview</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Products', v: products.length, p: pubProducts, c: '#059669', border: 'border-l-emerald-500' },
                { l: 'Articles', v: articles.length, p: pubArticles, c: '#2563EB', border: 'border-l-blue-500', review: reviewArticles },
                { l: 'Doctors', v: doctors.length, p: pubDoctors, c: '#7C3AED', border: 'border-l-purple-500' },
                { l: 'Callbacks', v: callbacks.length, p: callbacks.filter((c: any) => c.status === 'PENDING').length, c: '#EA580C', border: 'border-l-orange-500' },
                ...(analytics ? [
                  { l: 'Users', v: analytics.totalUsers, p: analytics.activeUsers, c: '#0891B2', border: 'border-l-cyan-500' },
                  { l: 'Appointments', v: analytics.totalAppointments, p: 0, c: '#BE185D', border: 'border-l-pink-500' },
                ] : []),
              ].map(s => (
                <div key={s.l} className={"bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md transition-all " + s.border}>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: s.c }}>{s.l}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.v}</p>
                  <p className="text-[9px] text-gray-500">{s.p > 0 ? s.p + ' active' : ''}{(s as any).review > 0 ? ' \u2022 ' + (s as any).review + ' pending review' : ''}</p>
                </div>
              ))}
            </div>

            {/* Recent items preview */}
            {articles.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Recent Articles</h3>
                {articles.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">{a.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 truncate">{a.title}</p>
                      <p className="text-[9px] text-gray-400">{a.category} - {a.status || (a.isPublished ? 'PUBLISHED' : 'DRAFT')}</p>
                    </div>
                    {statusBadge(a.status || (a.isPublished ? 'PUBLISHED' : 'DRAFT'))}
                  </div>
                ))}
              </div>
            )}

            {doctors.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Recent Doctors</h3>
                {doctors.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {d.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 truncate">{d.name}</p>
                      <p className="text-[9px] text-gray-400">{d.specialization}</p>
                    </div>
                    {statusBadge(d.status || (d.isPublished ? 'active' : 'pending'))}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
              {[
                { l: 'Add Product', t: 'add_product' as TabId, e: '\u{1F4E6}', c: 'bg-emerald-50 text-emerald-700' },
                { l: 'Write Article', t: 'add_article' as TabId, e: '\u{1F4DD}', c: 'bg-blue-50 text-blue-700' },
                { l: 'Add Doctor', t: 'add_doctor' as TabId, e: '\u{1F469}\u200D\u2695\uFE0F', c: 'bg-purple-50 text-purple-700' },
                { l: 'Manage Users', t: 'users' as TabId, e: '\u{1F465}', c: 'bg-cyan-50 text-cyan-700' },
                { l: 'View Analytics', t: 'analytics' as TabId, e: '\u{1F4C8}', c: 'bg-rose-50 text-rose-700' },
              ].map(a => (
                <button key={a.l} onClick={() => setTab(a.t)} className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all">
                  <span className={'w-10 h-10 rounded-xl flex items-center justify-center text-base ' + a.c}>{a.e}</span>
                  <span className="text-sm font-bold text-gray-700 flex-1 text-left">{a.l}</span>
                  <span className="text-gray-300 text-lg">{'\u203A'}</span>
                </button>
              ))}
              </div>
            </div>
          </>)}

          {/* ════════ USERS ════════ */}
          {tab === 'users' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F465}'} Users ({usersTotal})</h3>
            </div>
            <input
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchUsers(1, usersSearch, usersRoleFilter); }}
              placeholder="Search by name, email, phone..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all"
            />
            <div className="flex gap-1.5 flex-wrap">
              {['', 'USER', 'DOCTOR', 'ADMIN'].map(r => (
                <button key={r} onClick={() => { setUsersRoleFilter(r); fetchUsers(1, usersSearch, r); }}
                  className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (usersRoleFilter === r ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                  {r || 'ALL'}
                </button>
              ))}
              <button onClick={() => fetchUsers(1, usersSearch, usersRoleFilter)} className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all">Refresh</button>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No users found</p>
            ) : (
              <>
                <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" /> : initials(u.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-800 truncate">{u.fullName}</p>
                          {roleBadge(u.role)}
                          {!u.isActive && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">BANNED</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{u.email || u.phone || 'No contact'}</p>
                        <p className="text-[9px] text-gray-400">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 border-t border-gray-100 pt-3 items-center">
                      <select
                        value={u.role}
                        onChange={e => handleUpdateUserRole(u.id, e.target.value)}
                        className="flex-1 py-2 px-3 rounded-xl text-[10px] font-bold bg-gray-50 border border-gray-200 focus:outline-none focus:border-rose-400 transition-all"
                      >
                        <option value="USER">USER</option>
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button
                        onClick={() => handleToggleUserActive(u.id, u.isActive)}
                        className={'px-3 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all ' + (u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                      >
                        {u.isActive ? 'Ban' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => fetchUsers(usersPage - 1, usersSearch, usersRoleFilter)} disabled={usersPage <= 1}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold bg-white text-gray-600 shadow-sm disabled:opacity-30 hover:shadow transition-all">Prev</button>
                  <span className="text-[10px] text-gray-500 font-bold">Page {usersPage} of {usersTotalPages}</span>
                  <button onClick={() => fetchUsers(usersPage + 1, usersSearch, usersRoleFilter)} disabled={usersPage >= usersTotalPages}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold bg-white text-gray-600 shadow-sm disabled:opacity-30 hover:shadow transition-all">Next</button>
                </div>
              </>
            )}
          </>)}

          {/* ════════ PRODUCTS LIST ════════ */}
          {tab === 'products' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4E6}'} Products ({products.length})</h3>
              <button onClick={() => setTab('add_product')} className="text-[11px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">+ Add</button>
            </div>
            <AdminSearchBar value={productSearch} onChange={setProductSearch} placeholder="Search by name, category..." />
            {products.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No products yet. Click + Add to create one.</p>}
            <div className="space-y-3">
            {products.filter(p => {
              if (!productSearch.trim()) return true;
              const q = productSearch.toLowerCase();
              return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
            }).map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">{p.emoji}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {statusBadge(p.status || (p.isPublished ? 'published' : 'draft'))}
                      <span className="text-[8px] text-gray-400">{'\u20B9'}{p.discountPrice || p.price}</span>
                      <span className="text-[8px] text-gray-400">{p.category}</span>
                      {p.isFeatured && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2B50'}</span>}
                      {p.stock !== undefined && <span className="text-[8px] text-gray-400">Stock: {p.stock}</span>}
                    </div>
                    {p.approvedBy && <p className="text-[8px] text-gray-400">Approved by: {p.approvedBy}</p>}
                    {p.publishedAt && <p className="text-[8px] text-gray-400">Published: {new Date(p.publishedAt).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 border-t border-gray-100 pt-3">
                  <button onClick={() => openEditProduct(p)}
                    className="flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                    disabled={actionLoading === p.id}>{'\u270F\uFE0F'} Edit</button>
                  <button onClick={() => handleToggleProductPublish(p.id)}
                    className={'flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all ' + (p.isPublished ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                    disabled={actionLoading === p.id}>
                    {actionLoading === p.id ? '...' : (p.isPublished ? 'Unpublish' : 'Publish')}
                  </button>
                  <button onClick={() => setConfirmDel({ id: p.id, type: 'product' })} className="px-3 py-2 rounded-xl bg-red-50 text-red-400 text-[10px] font-bold active:scale-95 hover:bg-red-100 transition-all">{'\u{1F5D1}'}</button>
                </div>
              </div>
            ))}
            </div>
          </>)}

          {/* ════════ ARTICLES LIST ════════ */}
          {tab === 'articles' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4DD}'} Articles ({articles.length})</h3>
              <button onClick={() => setTab('add_article')} className="text-[11px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">+ Write</button>
            </div>
            <AdminSearchBar value={articleSearch} onChange={setArticleSearch} placeholder="Search by title, category, author..." />
            {articles.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No articles yet. Click + Write to create one.</p>}
            <div className="space-y-3">
            {articles.filter(a => {
              if (!articleSearch.trim()) return true;
              const q = articleSearch.toLowerCase();
              return a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || (a.authorName || '').toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q);
            }).map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">{a.emoji}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{a.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {statusBadge(a.status || (a.isPublished ? 'PUBLISHED' : 'DRAFT'))}
                      <span className="text-[8px] text-gray-400">{a.category} {'\u2022'} {a.readTime}</span>
                      {a.isFeatured && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2B50'}</span>}
                    </div>
                    <p className="text-[8px] text-gray-400">By: {a.authorName || 'VedaClue Team'}</p>
                    {a.approvedBy && <p className="text-[8px] text-gray-400">Approved by: {a.approvedBy}</p>}
                    {a.publishedAt && <p className="text-[8px] text-gray-400">Published: {new Date(a.publishedAt).toLocaleDateString()}</p>}
                    {a.viewCount !== undefined && a.viewCount > 0 && <p className="text-[8px] text-gray-400">Views: {a.viewCount}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 border-t border-gray-100 pt-3">
                  <button onClick={() => openEditArticle(a)}
                    className="flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                    disabled={actionLoading === a.id}>{'\u270F\uFE0F'} Edit</button>
                  {a.status === 'REVIEW' ? (
                    <button onClick={() => handleToggleArticlePublish(a.id)}
                      className="flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                      disabled={actionLoading === a.id}>
                      {actionLoading === a.id ? '...' : '\u2705 Approve & Publish'}
                    </button>
                  ) : (
                    <button onClick={() => handleToggleArticlePublish(a.id)}
                      className={'flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all ' + (a.isPublished ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                      disabled={actionLoading === a.id}>
                      {actionLoading === a.id ? '...' : (a.isPublished ? 'Unpublish' : 'Publish')}
                    </button>
                  )}
                  <button onClick={() => setConfirmDel({ id: a.id, type: 'article' })} className="px-3 py-2 rounded-xl bg-red-50 text-red-400 text-[10px] font-bold active:scale-95 hover:bg-red-100 transition-all">{'\u{1F5D1}'}</button>
                </div>
              </div>
            ))}
            </div>
          </>)}

          {/* ════════ DOCTORS LIST ════════ */}
          {tab === 'doctors' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F469}\u200D\u2695\uFE0F'} Doctors ({doctors.length})</h3>
              <button onClick={() => setTab('add_doctor')} className="text-[11px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">+ Add</button>
            </div>
            <AdminSearchBar value={doctorSearch} onChange={setDoctorSearch} placeholder="Search by name, specialization, hospital..." />
            {doctors.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No doctors yet. Click + Add to create one.</p>}
            <div className="space-y-3">
            {doctors.filter(d => {
              if (!doctorSearch.trim()) return true;
              const q = doctorSearch.toLowerCase();
              return d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q) || (d.hospitalName || '').toLowerCase().includes(q) || (d.location || '').toLowerCase().includes(q) || d.qualification.toLowerCase().includes(q);
            }).map(d => (
              <div key={d.id} className={'bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ' + (d.isChief ? 'ring-2 ring-emerald-300' : d.isPromoted ? 'border-l-4 border-amber-400' : '')}>
                <div className="flex items-center gap-3">
                  {d.avatarUrl ? (
                    <img src={d.avatarUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base ' + (d.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>{d.name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-800 truncate">{d.name}</p>
                      {d.isChief && <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F451}'} CHIEF</span>}
                      {d.isPromoted && !d.isChief && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2B50'} FEATURED</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">{d.specialization} {d.hospitalName ? '@ ' + d.hospitalName : ''}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {statusBadge(d.status || (d.isPublished ? 'active' : 'pending'))}
                      <span className="text-[8px] text-gray-400">{d.experience}yr exp</span>
                    </div>
                    {d.approvedBy && <p className="text-[8px] text-gray-400">Approved by: {d.approvedBy}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 border-t border-gray-100 pt-3">
                  <button onClick={() => openEditDoctor(d)}
                    className="py-2 px-3 rounded-xl text-[10px] font-bold active:scale-95 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                    disabled={actionLoading === d.id}>{'\u270F\uFE0F'} Edit</button>
                  <button onClick={() => handleToggleDoctorPublish(d.id)}
                    className={'flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all ' + (d.isPublished ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                    disabled={actionLoading === d.id}>
                    {actionLoading === d.id ? '...' : (d.isPublished ? 'Hide' : 'Show')}
                  </button>
                  {!d.isChief && (
                    <button
                      onClick={() => handleToggleDoctorPromote(d.id)}
                      className={'px-3 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 ' +
                        (d.isPromoted ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200')}
                      disabled={actionLoading === d.id}
                    >
                      {d.isPromoted ? '\u2B50' : '\u2606'}
                    </button>
                  )}
                  {!d.isChief && <button onClick={() => setConfirmDel({ id: d.id, type: 'doctor' })} className="px-3 py-2 rounded-xl bg-red-50 text-red-400 text-[10px] font-bold active:scale-95 hover:bg-red-100 transition-all">{'\u{1F5D1}'}</button>}
                </div>
              </div>
            ))}
            </div>
          </>)}

          {/* ════════ APPOINTMENTS ════════ */}
          {tab === 'appointments' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4C5}'} Appointments ({apptsTotal})</h3>
            </div>
            <AdminSearchBar value={appointmentSearch} onChange={setAppointmentSearch} placeholder="Search by patient, doctor name..." />
            <div className="flex gap-1.5 flex-wrap">
              {['', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'NO_SHOW', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => { setApptsStatusFilter(s); fetchAppointments(1, s); }}
                  className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (apptsStatusFilter === s ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                  {s || 'ALL'}
                </button>
              ))}
            </div>

            {apptsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : appts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No appointments found</p>
            ) : (
              <>
                <div className="space-y-3">
                {appts.filter(a => {
                  if (!appointmentSearch.trim()) return true;
                  const q = appointmentSearch.toLowerCase();
                  return (a.user?.fullName || '').toLowerCase().includes(q) || (a.doctor?.fullName || a.doctorName || '').toLowerCase().includes(q) || (a.notes || '').toLowerCase().includes(q);
                }).map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{a.user?.fullName || 'Unknown User'}</p>
                        <p className="text-[10px] text-gray-500">{a.doctor?.fullName || a.doctorName || 'No doctor assigned'} {a.doctor?.specialization ? '(' + a.doctor.specialization + ')' : ''}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(a.scheduledAt).toLocaleString()}</p>
                        {a.notes && <p className="text-[10px] text-gray-400 italic mt-0.5">"{a.notes}"</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        {statusBadge(a.status)}
                        <span className="text-[9px] text-gray-400">{a.type}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 border-t border-gray-100 pt-3 items-center">
                      <select
                        value={a.status}
                        onChange={e => handleUpdateApptStatus(a.id, e.target.value)}
                        className="flex-1 py-2 px-3 rounded-xl text-[10px] font-bold bg-gray-50 border border-gray-200 focus:outline-none focus:border-rose-400 transition-all"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="NO_SHOW">NO_SHOW</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>
                ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => fetchAppointments(apptsPage - 1, apptsStatusFilter)} disabled={apptsPage <= 1}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold bg-white text-gray-600 shadow-sm disabled:opacity-30 hover:shadow transition-all">Prev</button>
                  <span className="text-[10px] text-gray-500 font-bold">Page {apptsPage} of {apptsTotalPages}</span>
                  <button onClick={() => fetchAppointments(apptsPage + 1, apptsStatusFilter)} disabled={apptsPage >= apptsTotalPages}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold bg-white text-gray-600 shadow-sm disabled:opacity-30 hover:shadow transition-all">Next</button>
                </div>
              </>
            )}
          </>)}

          {/* ════════ ANALYTICS ════════ */}
          {tab === 'analytics' && (<>
            <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4C8}'} Analytics & Stats</h3>
            {analyticsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : !analytics ? (
              <p className="text-center text-gray-400 text-sm py-8">Failed to load analytics</p>
            ) : (<>
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Total Users', v: analytics.totalUsers, c: '#0891B2', border: 'border-l-cyan-500', icon: '\u{1F465}' },
                  { l: 'Active Users', v: analytics.activeUsers, c: '#059669', border: 'border-l-emerald-500', icon: '\u{1F7E2}' },
                  { l: 'Total Cycles', v: analytics.totalCycles, c: '#7C3AED', border: 'border-l-purple-500', icon: '\u{1F504}' },
                  { l: 'Appointments', v: analytics.totalAppointments, c: '#BE185D', border: 'border-l-pink-500', icon: '\u{1F4C5}' },
                  { l: 'Published Articles', v: analytics.publishedArticles || 0, c: '#2563EB', border: 'border-l-blue-500', icon: '\u{1F4DD}' },
                  { l: 'Active Products', v: analytics.activeProducts || 0, c: '#059669', border: 'border-l-emerald-500', icon: '\u{1F4E6}' },
                ].map(s => (
                  <div key={s.l} className={"bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md transition-all " + s.border}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{s.icon}</span>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: s.c }}>{s.l}</p>
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.v}</p>
                  </div>
                ))}
              </div>

              {/* Avg cycle length */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-gray-700">Avg Cycle Length</h4>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-1">{analytics.avgCycleLength} days</p>
              </div>

              {/* Mood distribution */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-gray-700 mb-4">Mood Distribution</h4>
                {(() => {
                  const moods = [
                    { key: 'GREAT', emoji: '\u{1F929}', color: 'from-emerald-400 to-emerald-500' },
                    { key: 'GOOD', emoji: '\u{1F60A}', color: 'from-blue-400 to-blue-500' },
                    { key: 'OKAY', emoji: '\u{1F610}', color: 'from-yellow-400 to-yellow-500' },
                    { key: 'LOW', emoji: '\u{1F614}', color: 'from-orange-400 to-orange-500' },
                    { key: 'BAD', emoji: '\u{1F62D}', color: 'from-red-400 to-red-500' },
                  ];
                  return moods.map(m => {
                    const pct = analytics.moodDistribution?.[m.key] || 0;
                    return (
                      <div key={m.key} className="flex items-center gap-2.5 mb-3">
                        <span className="text-base w-7">{m.emoji}</span>
                        <span className="text-[10px] font-bold text-gray-500 w-12">{m.key}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={'bg-gradient-to-r ' + m.color + ' h-full rounded-full transition-all duration-500'} style={{ width: pct + '%' }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 w-10 text-right">{pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Users by role */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-gray-700 mb-4">Users by Role</h4>
                <div className="flex gap-3 justify-center">
                  {[
                    { role: 'USER', color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50' },
                    { role: 'DOCTOR', color: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-50' },
                    { role: 'ADMIN', color: 'from-red-400 to-red-600', bg: 'bg-red-50' },
                  ].map(r => {
                    const count = analytics.usersByRole?.[r.role] || 0;
                    const total = analytics.totalUsers || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={r.role} className={r.bg + ' rounded-2xl p-4 flex-1 text-center'}>
                        <div className={'w-14 h-14 mx-auto rounded-full bg-gradient-to-br ' + r.color + ' flex items-center justify-center shadow-md'}>
                          <span className="text-white font-extrabold text-base">{count}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-600 mt-2">{r.role}</p>
                        <p className="text-[9px] text-gray-400">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent signups */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Recent Signups (7 days)</h4>
                {analytics.recentSignups?.length === 0 && <p className="text-[11px] text-gray-400">No recent signups</p>}
                {analytics.recentSignups?.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
                      {initials(u.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 truncate">{u.fullName}</p>
                      <p className="text-[9px] text-gray-400">{u.email || 'No email'}</p>
                    </div>
                    {roleBadge(u.role)}
                    <span className="text-[9px] text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>)}
          </>)}

          {/* ════════ PRODUCT ANALYTICS ════════ */}
          {tab === 'analytics_products' && (<>
            <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4CA}'} Product Analytics</h3>
            {productAnalyticsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : !productAnalytics ? (
              <p className="text-center text-gray-400 text-sm py-8">Failed to load product analytics</p>
            ) : (<>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-blue-500">
                  <p className="text-[9px] font-bold text-blue-600 uppercase">Total</p>
                  <p className="text-xl font-extrabold text-gray-900">{productAnalytics.total}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-emerald-500">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">Published</p>
                  <p className="text-xl font-extrabold text-gray-900">{productAnalytics.published}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-red-500">
                  <p className="text-[9px] font-bold text-red-600 uppercase">Out of Stock</p>
                  <p className="text-xl font-extrabold text-gray-900">{productAnalytics.outOfStock}</p>
                </div>
              </div>

              {/* Low stock alerts */}
              {productAnalytics.lowStock && productAnalytics.lowStock.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-red-600 mb-3">{'\u26A0\uFE0F'} Low Stock Alerts</h4>
                  {productAnalytics.lowStock.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-[11px] font-bold text-gray-700 truncate flex-1">{p.name}</span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">{p.stock} left</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Top 5 products bar chart */}
              {productAnalytics.top5 && productAnalytics.top5.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 mb-4">Top 5 Products (by reviews)</h4>
                  {(() => {
                    const maxReviews = Math.max(...productAnalytics.top5.map((p: any) => p.reviews), 1);
                    return productAnalytics.top5.map((p: any) => (
                      <div key={p.id} className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-gray-700 truncate flex-1 mr-2">{p.name}</span>
                          <span className="text-[9px] text-gray-500">{p.reviews} reviews</span>
                        </div>
                        <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: Math.max((p.reviews / maxReviews) * 100, 5) + '%' }}>
                            <span className="text-[8px] font-bold text-white">{'\u20B9'}{p.revenue}</span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Category breakdown */}
              {productAnalytics.categoryBreakdown && Object.keys(productAnalytics.categoryBreakdown).length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Category Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(productAnalytics.categoryBreakdown).map(([cat, count]: [string, any]) => (
                      <span key={cat} className="text-[10px] font-bold bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full">
                        {cat}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>)}
          </>)}

          {/* ════════ DOCTOR ANALYTICS ════════ */}
          {tab === 'analytics_doctors' && (<>
            <h3 className="text-base font-extrabold text-gray-900">{'\u{1FA7A}'} Doctor Analytics</h3>
            {doctorAnalyticsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : !doctorAnalytics ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-3">Failed to load doctor analytics</p>
                <button onClick={fetchDoctorAnalytics} className="text-[11px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 rounded-full active:scale-95">Retry</button>
              </div>
            ) : (<>
              {/* Most booked highlight */}
              {doctorAnalytics.mostBooked && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100 shadow-sm">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Most Booked Doctor</p>
                  <p className="text-base font-extrabold text-gray-900 mt-1">{doctorAnalytics.mostBooked.name}</p>
                  <p className="text-[11px] text-gray-500">{doctorAnalytics.mostBooked.specialization}</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-bold text-rose-600">{doctorAnalytics.mostBooked.totalBookings} bookings</span>
                    <span className="text-[10px] font-bold text-emerald-600">{'\u20B9'}{doctorAnalytics.mostBooked.revenue} revenue</span>
                  </div>
                </div>
              )}

              {/* Completion rate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-blue-500">
                  <p className="text-[9px] font-bold text-blue-600 uppercase">Total Appts</p>
                  <p className="text-xl font-extrabold text-gray-900">{doctorAnalytics.totalAppointments}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-emerald-500">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">Completion Rate</p>
                  <p className="text-xl font-extrabold text-gray-900">{doctorAnalytics.completionRate}%</p>
                </div>
              </div>

              {/* Doctor table */}
              {doctorAnalytics.doctors && doctorAnalytics.doctors.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Doctor Performance</h4>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 pr-2">Doctor</th>
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 px-1 text-center">Booked</th>
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 px-1 text-center">Done</th>
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 px-1 text-center">Rej</th>
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 px-1 text-center">No-Show</th>
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 px-1 text-center">Cancel%</th>
                        <th className="text-[8px] font-bold text-gray-500 uppercase py-2 pl-1 text-right">Rev</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorAnalytics.doctors.map((d: any) => (
                        <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-2 pr-2">
                            <p className="text-[10px] font-bold text-gray-800 truncate max-w-[80px]">{d.name}</p>
                            <p className="text-[8px] text-gray-400">{d.specialization}</p>
                          </td>
                          <td className="text-[10px] font-bold text-gray-700 text-center px-1">{d.totalBookings}</td>
                          <td className="text-[10px] font-bold text-emerald-600 text-center px-1">{d.completed}</td>
                          <td className="text-[10px] font-bold text-red-600 text-center px-1">{d.rejected}</td>
                          <td className="text-[10px] font-bold text-gray-500 text-center px-1">{d.noShow}</td>
                          <td className="text-[10px] font-bold text-center px-1">
                            <span className={d.cancellationRate > 20 ? 'text-red-600' : 'text-gray-600'}>{d.cancellationRate}%</span>
                          </td>
                          <td className="text-[10px] font-bold text-gray-700 text-right pl-1">{'\u20B9'}{d.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>)}
          </>)}

          {/* ════════ ORDERS ════════ */}
          {tab === 'orders' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F6D2}'} Orders ({ordersTotal})</h3>
              <button onClick={() => fetchOrders()} className="text-[10px] font-bold bg-white text-gray-600 px-3 py-1.5 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">Refresh</button>
            </div>
            <AdminSearchBar value={orderSearch} onChange={setOrderSearch} placeholder="Search by order number, customer name..." />
            {ordersLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10"><span className="text-4xl">{'\u{1F4E6}'}</span><p className="text-sm text-gray-400 mt-2">No orders yet</p></div>
            ) : (<>
              <div className="space-y-3">
              {orders.filter((order: any) => {
                if (!orderSearch.trim()) return true;
                const q = orderSearch.toLowerCase();
                return (order.orderNumber || '').toLowerCase().includes(q) || (order.user?.fullName || '').toLowerCase().includes(q) || (order.user?.email || '').toLowerCase().includes(q) || (order.items || []).some((it: any) => (it.productName || '').toLowerCase().includes(q));
              }).map((order: any) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{order.orderNumber}</p>
                      <p className="text-[10px] text-gray-500">{order.user?.fullName || 'Unknown'} &middot; {order.user?.email || order.user?.phone || ''}</p>
                      <p className="text-[9px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-gray-900">{'\u20B9'}{order.totalAmount}</p>
                      <span className={"text-[8px] font-bold px-2 py-0.5 rounded-full " + (
                        order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        order.paymentStatus === 'PENDING_COD' ? 'bg-amber-100 text-amber-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}>{order.paymentMethod === 'COD' ? 'COD' : order.paymentStatus}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {order.items?.map((item: any) => (
                      <span key={item.id} className="inline-block mr-2 bg-gray-50 px-2 py-0.5 rounded-full">{item.productName} x{item.quantity}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500">Status:</span>
                    <select value={order.orderStatus}
                      onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="text-[10px] font-bold border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-rose-400 transition-all">
                      {['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <span className={"ml-auto text-[8px] font-bold px-2 py-0.5 rounded-full " + (
                      order.orderStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                      order.orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      order.orderStatus === 'SHIPPED' ? 'bg-purple-100 text-purple-700' :
                      order.orderStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                      order.orderStatus === 'PROCESSING' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    )}>{order.orderStatus}</span>
                  </div>
                </div>
              ))}
              </div>
            </>)}
          </>)}

          {/* ════════ PRESCRIPTIONS ════════ */}
          {tab === 'prescriptions' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F48A}'} Prescriptions</h3>
              <button onClick={fetchPrescriptions} className="text-[10px] font-bold bg-white text-gray-600 px-3 py-1.5 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">Refresh</button>
            </div>
            <AdminSearchBar value={prescriptionSearch} onChange={setPrescriptionSearch} placeholder="Search by patient, doctor, diagnosis..." />
            {prescriptionsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-10"><span className="text-4xl">{'\u{1F48A}'}</span><p className="text-sm text-gray-400 mt-2">No prescriptions yet</p></div>
            ) : (<>
              <div className="space-y-3">
              {prescriptions.filter((rx: any) => {
                if (!prescriptionSearch.trim()) return true;
                const q = prescriptionSearch.toLowerCase();
                return (rx.appointment?.user?.fullName || '').toLowerCase().includes(q) || (rx.appointment?.doctor?.fullName || rx.appointment?.doctorName || '').toLowerCase().includes(q) || (rx.diagnosis || '').toLowerCase().includes(q);
              }).map((rx: any) => (
                <div key={rx.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedPrescription(expandedPrescription === rx.id ? null : rx.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{rx.appointment?.user?.fullName || 'Unknown Patient'}</p>
                      <p className="text-[10px] text-gray-500">{rx.appointment?.doctor?.fullName || rx.appointment?.doctorName || 'N/A'} {rx.appointment?.doctor?.specialization ? '(' + rx.appointment.doctor.specialization + ')' : ''}</p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Dx: {rx.diagnosis}</p>
                      <p className="text-[9px] text-gray-400">{new Date(rx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-gray-400 text-sm ml-2">{expandedPrescription === rx.id ? '\u25B2' : '\u25BC'}</span>
                  </div>
                  {expandedPrescription === rx.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                      {/* Medicines */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-600 uppercase mb-1.5">Medicines</p>
                        {Array.isArray(rx.medicines) && rx.medicines.length > 0 ? (
                          rx.medicines.map((m: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-3 mb-1.5">
                              <p className="text-[11px] font-bold text-gray-800">{m.name || 'Unnamed'}</p>
                              <div className="flex gap-3 flex-wrap mt-1">
                                {m.dosage && <span className="text-[9px] text-gray-500">Dosage: {m.dosage}</span>}
                                {m.frequency && <span className="text-[9px] text-gray-500">Freq: {m.frequency}</span>}
                                {m.duration && <span className="text-[9px] text-gray-500">Duration: {m.duration}</span>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-gray-400">No medicines listed</p>
                        )}
                      </div>
                      {/* Instructions */}
                      {rx.instructions && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-600 uppercase">Instructions</p>
                          <p className="text-[11px] text-gray-700 bg-blue-50 rounded-xl p-3 mt-1">{rx.instructions}</p>
                        </div>
                      )}
                      {/* Follow-up */}
                      {rx.followUpDate && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-600 uppercase">Follow-up Date</p>
                          <p className="text-[11px] text-purple-600 font-bold">{new Date(rx.followUpDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {/* Appointment date */}
                      {rx.appointment?.scheduledAt && (
                        <p className="text-[9px] text-gray-400">Appointment: {new Date(rx.appointment.scheduledAt).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              </div>
            </>)}
          </>)}

          {/* ════════ AYURVEDA MANAGEMENT ════════ */}
          {tab === 'ayurveda' && (<AyurvedaAdminTab />)}

          {/* ════════ ADD PRODUCT ════════ */}
          {tab === 'add_product' && (<>
            <div className="flex items-center gap-3 mb-2"><button onClick={() => setTab('products')} className="text-gray-400 text-lg hover:text-gray-600 transition-colors">{'\u2190'}</button><h3 className="text-base font-extrabold text-gray-900">New Product</h3></div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <ImageUpload label="Product Image" value={np.imageUrl} onChange={url => setNp({...np, imageUrl: url})} />
            <MultiImageUpload label="Gallery Images" values={np.galleryImages} onChange={urls => setNp({...np, galleryImages: urls})} maxImages={5} />
            <FormField label="Name *" value={np.name} onChange={v => setNp({...np, name: v})} placeholder="Bhringraj Hair Oil" />
            <FormField label="Description *" value={np.description} onChange={v => setNp({...np, description: v})} placeholder="Product description..." multiline />
            <div className="grid grid-cols-2 gap-3"><FormNumField label="Price *" value={np.price} onChange={v => setNp({...np, price: v})} /><FormNumField label="Sale Price" value={np.discountPrice} onChange={v => setNp({...np, discountPrice: v})} /></div>
            <div className="grid grid-cols-2 gap-3"><FormNumField label="Stock" value={np.stock} onChange={v => setNp({...np, stock: v})} /><FormField label="Unit" value={np.unit} onChange={v => setNp({...np, unit: v})} placeholder="piece" /></div>
            <div className="grid grid-cols-2 gap-3"><FormField label="Size" value={np.size} onChange={v => setNp({...np, size: v})} placeholder="200ml" /><FormField label="Emoji" value={np.emoji} onChange={v => setNp({...np, emoji: v})} placeholder="\u{1F33F}" /></div>
            <FormField label="Ingredients (comma-sep)" value={np.ingredients} onChange={v => setNp({...np, ingredients: v})} placeholder="Bhringraj, Amla..." multiline />
            <FormField label="Benefits (comma-sep)" value={np.benefits} onChange={v => setNp({...np, benefits: v})} placeholder="Reduces hairfall..." multiline />
            <FormField label="Tags (comma-sep)" value={np.tags} onChange={v => setNp({...np, tags: v})} placeholder="ayurveda, natural..." />
            <FormField label="How to Use" value={np.howToUse} onChange={v => setNp({...np, howToUse: v})} placeholder="Instructions..." multiline />
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Owner Email (for callback notifications)</label>
              <input type="email" value={np.ownerEmail || ''} onChange={e => setNp({...np, ownerEmail: e.target.value})} placeholder="owner@example.com"
                className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Owner WhatsApp/Phone (for callback notifications)</label>
              <input type="tel" value={np.ownerPhone || ''} onChange={e => setNp({...np, ownerPhone: e.target.value})} placeholder="+91 9405424185"
                className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
            </div>
            <FormCheckbox label="Featured Product" checked={np.isFeatured} onChange={v => setNp({...np, isFeatured: v})} />
            <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Category</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">{catOpts.map(c => (<button key={c.k} onClick={() => setNp({...np, category: c.k})} className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (np.category === c.k ? 'bg-rose-100 text-rose-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>{c.l}</button>))}</div></div>
            <FormTargetPicker opts={targetOpts} value={np.targetAudience} onChange={v => setNp({...np, targetAudience: v})} />
            </div>
            <button onClick={handleAddProduct} disabled={actionLoading === 'add_product'}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-rose-500 to-pink-500">
              {actionLoading === 'add_product' ? 'Adding...' : 'Add as Draft'}
            </button>
          </>)}

          {/* ════════ EDIT PRODUCT ════════ */}
          {tab === 'edit_product' && editProduct && (<>
            <div className="flex items-center gap-3 mb-2"><button onClick={() => { setEditProduct(null); setTab('products'); }} className="text-gray-400 text-lg hover:text-gray-600 transition-colors">{'\u2190'}</button><h3 className="text-base font-extrabold text-gray-900">Edit Product</h3></div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <ImageUpload label="Product Image" value={ep.imageUrl} onChange={url => setEp({...ep, imageUrl: url})} />
            <MultiImageUpload label="Gallery Images" values={ep.galleryImages} onChange={urls => setEp({...ep, galleryImages: urls})} maxImages={5} />
            <FormField label="Name *" value={ep.name} onChange={v => setEp({...ep, name: v})} placeholder="Product Name" />
            <FormField label="Description *" value={ep.description} onChange={v => setEp({...ep, description: v})} placeholder="Description..." multiline />
            <div className="grid grid-cols-2 gap-3"><FormNumField label="Price *" value={ep.price} onChange={v => setEp({...ep, price: v})} /><FormNumField label="Sale Price" value={ep.discountPrice} onChange={v => setEp({...ep, discountPrice: v})} /></div>
            <div className="grid grid-cols-2 gap-3"><FormNumField label="Stock" value={ep.stock} onChange={v => setEp({...ep, stock: v})} /><FormField label="Unit" value={ep.unit} onChange={v => setEp({...ep, unit: v})} placeholder="piece" /></div>
            <div className="grid grid-cols-2 gap-3"><FormField label="Size" value={ep.size} onChange={v => setEp({...ep, size: v})} placeholder="200ml" /><FormField label="Emoji" value={ep.emoji} onChange={v => setEp({...ep, emoji: v})} placeholder="\u{1F33F}" /></div>
            <FormField label="Ingredients (comma-sep)" value={ep.ingredients} onChange={v => setEp({...ep, ingredients: v})} placeholder="Bhringraj, Amla..." multiline />
            <FormField label="Benefits (comma-sep)" value={ep.benefits} onChange={v => setEp({...ep, benefits: v})} placeholder="Reduces hairfall..." multiline />
            <FormField label="Tags (comma-sep)" value={ep.tags} onChange={v => setEp({...ep, tags: v})} placeholder="ayurveda, natural..." />
            <FormField label="How to Use" value={ep.howToUse} onChange={v => setEp({...ep, howToUse: v})} placeholder="Instructions..." multiline />
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Owner Email (for callback notifications)</label>
              <input type="email" value={ep.ownerEmail || ''} onChange={e => setEp({...ep, ownerEmail: e.target.value})} placeholder="owner@example.com"
                className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Owner WhatsApp/Phone (for callback notifications)</label>
              <input type="tel" value={ep.ownerPhone || ''} onChange={e => setEp({...ep, ownerPhone: e.target.value})} placeholder="+91 9405424185"
                className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
            </div>
            <FormCheckbox label="Featured Product" checked={ep.isFeatured} onChange={v => setEp({...ep, isFeatured: v})} />
            <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Category</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">{catOpts.map(c => (<button key={c.k} onClick={() => setEp({...ep, category: c.k})} className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (ep.category === c.k ? 'bg-rose-100 text-rose-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>{c.l}</button>))}</div></div>
            <FormTargetPicker opts={targetOpts} value={ep.targetAudience} onChange={v => setEp({...ep, targetAudience: v})} />
            </div>
            <button onClick={handleUpdateProduct} disabled={actionLoading === 'edit_product'}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-rose-500 to-pink-500">
              {actionLoading === 'edit_product' ? 'Saving...' : 'Save Changes'}
            </button>
          </>)}

          {/* ════════ ADD ARTICLE ════════ */}
          {tab === 'add_article' && (<>
            <div className="flex items-center gap-3 mb-2"><button onClick={() => setTab('articles')} className="text-gray-400 text-lg hover:text-gray-600 transition-colors">{'\u2190'}</button><h3 className="text-base font-extrabold text-gray-900">Write Article</h3></div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <ImageUpload label="Cover Image" value={na.imageUrl} onChange={url => setNa({...na, imageUrl: url})} />
            <FormField label="Title *" value={na.title} onChange={v => setNa({...na, title: v})} placeholder="Understanding PCOD..." />
            <FormField label="Excerpt" value={na.excerpt} onChange={v => setNa({...na, excerpt: v})} placeholder="Short summary..." />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category" value={na.category} onChange={v => setNa({...na, category: v})} placeholder="PCOD, Wellness..." />
              <FormField label="Read Time" value={na.readTime} onChange={v => setNa({...na, readTime: v})} placeholder="5 min" />
            </div>
            <FormField label="Author Name" value={na.authorName} onChange={v => setNa({...na, authorName: v})} placeholder="VedaClue Team" />
            <FormField label="Tags (comma-sep)" value={na.tags} onChange={v => setNa({...na, tags: v})} placeholder="health, periods..." />
            <FormField label="Content *" value={na.content} onChange={v => setNa({...na, content: v})} placeholder="Write your article..." multiline />
            <FormCheckbox label="Featured Article" checked={na.isFeatured} onChange={v => setNa({...na, isFeatured: v})} />
            <FormTargetPicker opts={targetOpts} value={na.targetAudience} onChange={v => setNa({...na, targetAudience: v})} />
            </div>
            <button onClick={handleAddArticle} disabled={actionLoading === 'add_article'}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-rose-500 to-pink-500">
              {actionLoading === 'add_article' ? 'Saving...' : 'Save as Draft'}
            </button>
          </>)}

          {/* ════════ EDIT ARTICLE ════════ */}
          {tab === 'edit_article' && editArticle && (<>
            <div className="flex items-center gap-3 mb-2"><button onClick={() => { setEditArticle(null); setTab('articles'); }} className="text-gray-400 text-lg hover:text-gray-600 transition-colors">{'\u2190'}</button><h3 className="text-base font-extrabold text-gray-900">Edit Article</h3></div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <ImageUpload label="Cover Image" value={ea.imageUrl} onChange={url => setEa({...ea, imageUrl: url})} />
            <FormField label="Title *" value={ea.title} onChange={v => setEa({...ea, title: v})} placeholder="Title" />
            <FormField label="Excerpt" value={ea.excerpt} onChange={v => setEa({...ea, excerpt: v})} placeholder="Short summary..." />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category" value={ea.category} onChange={v => setEa({...ea, category: v})} placeholder="Category" />
              <FormField label="Read Time" value={ea.readTime} onChange={v => setEa({...ea, readTime: v})} placeholder="5 min" />
            </div>
            <FormField label="Author Name" value={ea.authorName} onChange={v => setEa({...ea, authorName: v})} placeholder="VedaClue Team" />
            <FormField label="Tags (comma-sep)" value={ea.tags} onChange={v => setEa({...ea, tags: v})} placeholder="health, periods..." />
            <FormField label="Content *" value={ea.content} onChange={v => setEa({...ea, content: v})} placeholder="Article content..." multiline />
            <FormCheckbox label="Featured Article" checked={ea.isFeatured} onChange={v => setEa({...ea, isFeatured: v})} />
            <FormTargetPicker opts={targetOpts} value={ea.targetAudience} onChange={v => setEa({...ea, targetAudience: v})} />
            </div>
            <button onClick={handleUpdateArticle} disabled={actionLoading === 'edit_article'}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-rose-500 to-pink-500">
              {actionLoading === 'edit_article' ? 'Saving...' : 'Save Changes'}
            </button>
          </>)}

          {/* ════════ ADD DOCTOR ════════ */}
          {tab === 'add_doctor' && (<>
            <div className="flex items-center gap-3 mb-2"><button onClick={() => setTab('doctors')} className="text-gray-400 text-lg hover:text-gray-600 transition-colors">{'\u2190'}</button><h3 className="text-base font-extrabold text-gray-900">Add Doctor</h3></div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <ImageUpload label="Doctor Photo" value={nd.avatarUrl} onChange={url => setNd({...nd, avatarUrl: url})} />
            <FormField label="Full Name *" value={nd.name} onChange={v => setNd({...nd, name: v})} placeholder="Dr. Shruthi R" />
            <FormField label="Specialization *" value={nd.specialization} onChange={v => setNd({...nd, specialization: v})} placeholder="Gynecologist" />
            <FormField label="Qualification" value={nd.qualification} onChange={v => setNd({...nd, qualification: v})} placeholder="MBBS, MS" />
            <div className="grid grid-cols-3 gap-3"><FormNumField label="Experience (yrs)" value={nd.experience} onChange={v => setNd({...nd, experience: v})} /><FormNumField label="Fee ₹" value={nd.fee} onChange={v => setNd({...nd, fee: v})} /><FormField label="Commission %" value={nd.commissionRate} onChange={v => setNd({...nd, commissionRate: v})} placeholder="Default" /></div>
            <FormField label="Hospital" value={nd.hospitalName} onChange={v => setNd({...nd, hospitalName: v})} placeholder="Hospital name" />
            <FormField label="Location" value={nd.location} onChange={v => setNd({...nd, location: v})} placeholder="City, State" />
            <FormField label="Tags (comma-sep)" value={nd.tags} onChange={v => setNd({...nd, tags: v})} placeholder="PCOD, IVF..." />
            <FormField label="Languages (comma-sep)" value={nd.languages} onChange={v => setNd({...nd, languages: v})} placeholder="English, Hindi..." />
            <FormField label="About" value={nd.about} onChange={v => setNd({...nd, about: v})} placeholder="Brief description..." multiline />
            <FormCheckbox label="Chief Doctor" checked={nd.isChief} onChange={v => setNd({...nd, isChief: v})} />
            <FormCheckbox label="Promoted / Featured" checked={nd.isPromoted} onChange={v => setNd({...nd, isPromoted: v})} />
            </div>
            <button onClick={handleAddDoctor} disabled={actionLoading === 'add_doctor'}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-rose-500 to-pink-500">
              {actionLoading === 'add_doctor' ? 'Adding...' : 'Add Doctor'}
            </button>
          </>)}

          {/* ════════ EDIT DOCTOR ════════ */}
          {tab === 'edit_doctor' && editDoctor && (<>
            <div className="flex items-center gap-3 mb-2"><button onClick={() => { setEditDoctor(null); setTab('doctors'); }} className="text-gray-400 text-lg hover:text-gray-600 transition-colors">{'\u2190'}</button><h3 className="text-base font-extrabold text-gray-900">Edit Doctor</h3></div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <ImageUpload label="Doctor Photo" value={ed.avatarUrl} onChange={url => setEd({...ed, avatarUrl: url})} />
            <FormField label="Full Name *" value={ed.name} onChange={v => setEd({...ed, name: v})} placeholder="Dr. Shruthi R" />
            <FormField label="Specialization *" value={ed.specialization} onChange={v => setEd({...ed, specialization: v})} placeholder="Gynecologist" />
            <FormField label="Qualification" value={ed.qualification} onChange={v => setEd({...ed, qualification: v})} placeholder="MBBS, MS" />
            <div className="grid grid-cols-3 gap-3"><FormNumField label="Experience (yrs)" value={ed.experience} onChange={v => setEd({...ed, experience: v})} /><FormNumField label="Fee ₹" value={ed.fee} onChange={v => setEd({...ed, fee: v})} /><FormField label="Commission %" value={ed.commissionRate} onChange={v => setEd({...ed, commissionRate: v})} placeholder="Default" /></div>
            <FormField label="Hospital" value={ed.hospitalName} onChange={v => setEd({...ed, hospitalName: v})} placeholder="Hospital name" />
            <FormField label="Location" value={ed.location} onChange={v => setEd({...ed, location: v})} placeholder="City, State" />
            <FormField label="Tags (comma-sep)" value={ed.tags} onChange={v => setEd({...ed, tags: v})} placeholder="PCOD, IVF..." />
            <FormField label="Languages (comma-sep)" value={ed.languages} onChange={v => setEd({...ed, languages: v})} placeholder="English, Hindi..." />
            <FormField label="About" value={ed.about} onChange={v => setEd({...ed, about: v})} placeholder="Brief description..." multiline />
            <FormCheckbox label="Chief Doctor" checked={ed.isChief} onChange={v => setEd({...ed, isChief: v})} />
            <FormCheckbox label="Promoted / Featured" checked={ed.isPromoted} onChange={v => setEd({...ed, isPromoted: v})} />
            </div>
            <button onClick={handleUpdateDoctor} disabled={actionLoading === 'edit_doctor'}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-rose-500 to-pink-500">
              {actionLoading === 'edit_doctor' ? 'Saving...' : 'Save Changes'}
            </button>
          </>)}

          {/* ════════ CALLBACKS ════════ */}
          {tab === 'callbacks' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4DE}'} Callback Requests</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">{callbacks.filter(c => c.status === 'PENDING').length} pending</span>
                <button onClick={fetchCallbacks} className="text-[10px] font-bold bg-white text-gray-600 px-3 py-1.5 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">Refresh</button>
              </div>
            </div>
            <AdminSearchBar value={callbackSearch} onChange={setCallbackSearch} placeholder="Search by name, phone, product..." />

            {callbacksLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : callbacks.length === 0 ? (
              <div className="text-center py-10"><span className="text-4xl">{'\u{1F4ED}'}</span><p className="text-sm text-gray-400 mt-2">No callback requests yet</p></div>
            ) : (<>
              {/* Pending callbacks */}
              <div className="space-y-3">
              {callbacks.filter(c => c.status === 'PENDING').filter((c: any) => {
                if (!callbackSearch.trim()) return true;
                const q = callbackSearch.toLowerCase();
                return (c.userName || '').toLowerCase().includes(q) || (c.userPhone || '').toLowerCase().includes(q) || (c.productName || '').toLowerCase().includes(q) || (c.message || '').toLowerCase().includes(q);
              }).map((c: any) => (
                <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-orange-400 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-extrabold text-gray-900">{c.userName}</p>
                      <a href={'tel:' + c.userPhone} className="text-sm font-bold text-emerald-600 underline">{'\u{1F4F1}'} {c.userPhone}</a>
                      {c.userEmail && <p className="text-[10px] text-gray-500">{c.userEmail}</p>}
                    </div>
                    <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">PENDING</span>
                  </div>
                  {c.productName && <p className="text-[11px] text-gray-500 mt-1.5">{'\u{1F4E6}'} Product: <strong>{c.productName}</strong></p>}
                  {c.message && <p className="text-[11px] text-gray-600 mt-1.5 bg-gray-50 rounded-xl p-3 italic">"{c.message}"</p>}
                  <p className="text-[10px] text-gray-400 mt-1.5">{new Date(c.createdAt).toLocaleString()}</p>
                  <div className="flex gap-2 mt-3">
                    <a href={'tel:' + c.userPhone} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold text-center active:scale-95 shadow-sm transition-all">{'\u{1F4DE}'} Call Now</a>
                    <button onClick={() => handleUpdateCallback(c.id, 'CALLED')} className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold active:scale-95 hover:bg-blue-100 transition-all">{'\u{1F4DE}'} Called</button>
                    <button onClick={() => handleUpdateCallback(c.id, 'RESOLVED')} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold active:scale-95 hover:bg-gray-200 transition-all">{'\u2713'} Resolved</button>
                  </div>
                </div>
              ))}
              </div>

              {/* Called callbacks */}
              {callbacks.filter(c => c.status === 'CALLED').length > 0 && (<>
                <h4 className="text-xs font-bold text-blue-500 uppercase mt-5 tracking-wide">Called ({callbacks.filter(c => c.status === 'CALLED').length})</h4>
                <div className="space-y-3">
                {callbacks.filter(c => c.status === 'CALLED').filter((c: any) => {
                  if (!callbackSearch.trim()) return true;
                  const q = callbackSearch.toLowerCase();
                  return (c.userName || '').toLowerCase().includes(q) || (c.userPhone || '').toLowerCase().includes(q) || (c.productName || '').toLowerCase().includes(q);
                }).map((c: any) => (
                  <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-700">{c.userName} {'\u2014'} <a href={'tel:' + c.userPhone} className="text-emerald-600 underline">{c.userPhone}</a></p>
                        {c.productName && <p className="text-[10px] text-gray-500">{c.productName}</p>}
                        {c.message && <p className="text-[10px] text-gray-500 italic">"{c.message}"</p>}
                        <p className="text-[9px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
                        {c.adminNotes && <p className="text-[10px] text-blue-600 mt-1">Notes: {c.adminNotes}</p>}
                      </div>
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">CALLED</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleUpdateCallback(c.id, 'RESOLVED')} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-bold active:scale-95 hover:bg-emerald-100 transition-all">{'\u2713'} Resolve</button>
                      <button onClick={() => handleDeleteCallback(c.id)} className="px-3 py-2 rounded-xl bg-red-50 text-red-400 text-[10px] font-bold active:scale-95 hover:bg-red-100 transition-all">{'\u{1F5D1}'}</button>
                    </div>
                  </div>
                ))}
                </div>
              </>)}

              {/* Resolved callbacks */}
              {callbacks.filter(c => c.status === 'RESOLVED').length > 0 && (<>
                <h4 className="text-xs font-bold text-gray-400 uppercase mt-5 tracking-wide">Resolved ({callbacks.filter(c => c.status === 'RESOLVED').length})</h4>
                <div className="space-y-3">
                {callbacks.filter(c => c.status === 'RESOLVED').filter((c: any) => {
                  if (!callbackSearch.trim()) return true;
                  const q = callbackSearch.toLowerCase();
                  return (c.userName || '').toLowerCase().includes(q) || (c.userPhone || '').toLowerCase().includes(q) || (c.productName || '').toLowerCase().includes(q);
                }).map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-2xl p-4 opacity-60">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-700">{c.userName} {'\u2014'} {c.userPhone}</p>
                        {c.productName && <p className="text-[10px] text-gray-500">{c.productName}</p>}
                        <p className="text-[9px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
                        {c.adminNotes && <p className="text-[10px] text-gray-500">Notes: {c.adminNotes}</p>}
                      </div>
                      <button onClick={() => handleDeleteCallback(c.id)} className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-400 text-[10px] font-bold active:scale-95 hover:bg-red-100 transition-all">{'\u{1F5D1}'}</button>
                    </div>
                  </div>
                ))}
                </div>
              </>)}
            </>)}
          </>)}

          {/* ════════ PAYOUTS ════════ */}
          {tab === 'payouts' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">{'\u{1F4B0}'} Doctor Payouts</h3>
              <button onClick={() => { fetchPayoutSummary(); fetchPayoutList(); }} className="text-[10px] font-bold bg-white text-gray-600 px-3 py-1.5 rounded-full active:scale-95 shadow-sm hover:shadow transition-all">Refresh</button>
            </div>

            {payoutsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" /></div>
            ) : (<>
              {/* Platform Revenue Overview */}
              {payoutSummary?.platformStats && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-xs font-bold text-white/70 uppercase tracking-wide">Platform Revenue Overview</p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-2xl font-black">{'\u20B9'}{(payoutSummary.platformStats.totalRevenue || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">Total Revenue</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black">{'\u20B9'}{(payoutSummary.platformStats.totalCommission || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">Platform Commission ({payoutSummary.platformStats.defaultCommissionRate}%)</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-300">{'\u20B9'}{(payoutSummary.platformStats.totalPaidOut || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">Paid to Doctors</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-300">{'\u20B9'}{(payoutSummary.platformStats.totalUnsettled || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-white/60">Unsettled</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor-wise Earnings Summary */}
              <h4 className="text-sm font-bold text-gray-700 mt-1">Doctor Earnings</h4>
              <AdminSearchBar value={payoutSearch} onChange={setPayoutSearch} placeholder="Search by doctor name..." />
              <div className="space-y-3">
                {(payoutSummary?.doctors || []).filter((d: any) => {
                  if (!payoutSearch.trim()) return true;
                  return d.doctorName.toLowerCase().includes(payoutSearch.toLowerCase()) || d.specialization.toLowerCase().includes(payoutSearch.toLowerCase());
                }).map((doc: any) => (
                  <div key={doc.doctorId} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      {doc.avatarUrl ? (
                        <img src={doc.avatarUrl} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">{doc.doctorName.charAt(0)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{doc.doctorName}</p>
                        <p className="text-[10px] text-gray-500">{doc.specialization} {'\u2022'} {doc.totalAppointments} completed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-gray-900">{'\u20B9'}{doc.totalEarned.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400">total earned</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-xs font-bold text-emerald-600">{'\u20B9'}{doc.totalSettled.toLocaleString()}</p>
                        <p className="text-[8px] text-gray-400">Settled</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-amber-600">{'\u20B9'}{doc.totalPending.toLocaleString()}</p>
                        <p className="text-[8px] text-gray-400">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-rose-600">{'\u20B9'}{doc.unsettledNet.toLocaleString()}</p>
                        <p className="text-[8px] text-gray-400">Unsettled</p>
                      </div>
                    </div>
                    {doc.unsettledGross > 0 && (
                      <button
                        onClick={() => { setShowPayoutModal(doc); setPayoutCommission('20'); }}
                        className="w-full mt-3 py-2.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-95 shadow-sm transition-all"
                      >
                        {'\u{1F4B8}'} Generate Settlement ({'\u20B9'}{doc.unsettledNet.toLocaleString()})
                      </button>
                    )}
                    {doc.lastPayout && (
                      <p className="text-[9px] text-gray-400 mt-2">Last payout: {new Date(doc.lastPayout.paidAt).toLocaleDateString()} {'\u2022'} {'\u20B9'}{doc.lastPayout.netPayout?.toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Payout History */}
              <h4 className="text-sm font-bold text-gray-700 mt-2">Payout History</h4>
              <div className="flex gap-1.5 flex-wrap">
                {['', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'ON_HOLD'].map(s => (
                  <button key={s} onClick={() => { setPayoutStatusFilter(s); fetchPayoutList(s); }}
                    className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (payoutStatusFilter === s ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                    {s || 'ALL'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {payoutList.length === 0 ? (
                  <div className="text-center py-6"><p className="text-sm text-gray-400">No payouts found</p></div>
                ) : payoutList.map((p: any) => (
                  <div key={p.id} className={'bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ' + (p.status === 'PAID' ? 'border-l-4 border-emerald-400' : p.status === 'PENDING' ? 'border-l-4 border-amber-400' : p.status === 'FAILED' ? 'border-l-4 border-red-400' : '')}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{p.doctor?.fullName || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-500">{p.doctor?.specialization} {'\u2022'} {p.appointmentCount} appointments</p>
                        <p className="text-[9px] text-gray-400">{new Date(p.periodStart).toLocaleDateString()} {'\u2013'} {new Date(p.periodEnd).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-gray-900">{'\u20B9'}{p.netPayout?.toLocaleString()}</p>
                        <span className={'text-[8px] font-bold px-2 py-0.5 rounded-full ' + (
                          p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          p.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                          p.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        )}>{p.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-400">
                      <span>Gross: {'\u20B9'}{p.totalEarnings?.toLocaleString()}</span>
                      <span>Commission: {p.commissionRate}% ({'\u20B9'}{p.platformFee?.toLocaleString()})</span>
                    </div>
                    {p.transactionId && <p className="text-[9px] text-emerald-600 mt-1">TXN: {p.transactionId} {'\u2022'} {p.paymentMethod}</p>}
                    {p.adminNotes && <p className="text-[9px] text-gray-400 italic mt-1">Note: {p.adminNotes}</p>}
                    {p.paidAt && <p className="text-[9px] text-emerald-600 mt-1">Paid: {new Date(p.paidAt).toLocaleString()}</p>}

                    {p.status === 'PENDING' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => { setMarkPaidModal(p); setPayoutTxnId(''); setPayoutMethod('UPI'); setPayoutNotes(''); }}
                          className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-600 active:scale-95 hover:bg-emerald-100 transition-all"
                        >{'\u2713'} Mark Paid</button>
                        <button
                          onClick={() => apiService.updatePayout(p.id, { status: 'PROCESSING' }).then(() => { toast.success('Marked as processing'); fetchPayoutList(); })}
                          className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-blue-50 text-blue-600 active:scale-95 hover:bg-blue-100 transition-all"
                        >Processing</button>
                        <button
                          onClick={() => handleDeletePayout(p.id)}
                          className="px-3 py-2 rounded-xl text-[10px] font-bold bg-red-50 text-red-500 active:scale-95 hover:bg-red-100 transition-all"
                        >{'\u{1F5D1}'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>)}

            {/* Generate Payout Modal */}
            {showPayoutModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ maxWidth: 430, margin: '0 auto' }}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayoutModal(null)} />
                <div className="relative bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm space-y-4 z-10">
                  <h3 className="text-base font-extrabold text-gray-900">Generate Settlement</h3>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm font-bold text-gray-800">{showPayoutModal.doctorName}</p>
                    <p className="text-[10px] text-gray-500">{showPayoutModal.specialization}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">Unsettled gross:</span>
                      <span className="text-xs font-bold">{'\u20B9'}{showPayoutModal.unsettledGross?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Platform Commission (%)</label>
                    <input type="number" min="0" max="50" value={payoutCommission} onChange={e => setPayoutCommission(e.target.value)}
                      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600">Platform fee:</span>
                      <span className="text-xs font-bold text-gray-600">{'\u20B9'}{((showPayoutModal.unsettledGross || 0) * (parseFloat(payoutCommission) || 20) / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm font-bold text-emerald-700">Doctor payout:</span>
                      <span className="text-sm font-extrabold text-emerald-700">{'\u20B9'}{((showPayoutModal.unsettledGross || 0) * (1 - (parseFloat(payoutCommission) || 20) / 100)).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPayoutModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 active:scale-95 transition-all">Cancel</button>
                    <button onClick={() => handleGeneratePayout(showPayoutModal.doctorId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-95 shadow-sm transition-all">Generate</button>
                  </div>
                </div>
              </div>
            )}

            {/* Mark as Paid Modal */}
            {markPaidModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ maxWidth: 430, margin: '0 auto' }}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMarkPaidModal(null)} />
                <div className="relative bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm space-y-4 z-10">
                  <h3 className="text-base font-extrabold text-gray-900">Mark as Paid</h3>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-sm font-bold text-gray-800">{markPaidModal.doctor?.fullName}</p>
                    <p className="text-lg font-extrabold text-emerald-700">{'\u20B9'}{markPaidModal.netPayout?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Payment Method</label>
                    <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}
                      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none">
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Transaction ID / UTR</label>
                    <input value={payoutTxnId} onChange={e => setPayoutTxnId(e.target.value)} placeholder="e.g. UPI123456789"
                      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Notes (optional)</label>
                    <textarea value={payoutNotes} onChange={e => setPayoutNotes(e.target.value)} placeholder="Any additional notes..."
                      className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none resize-none" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setMarkPaidModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 active:scale-95 transition-all">Cancel</button>
                    <button onClick={() => handleMarkPaid(markPaidModal.id)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-95 shadow-sm transition-all">{'\u2713'} Confirm Paid</button>
                  </div>
                </div>
              </div>
            )}
          </>)}

          {/* ════════ PROGRAMS MANAGEMENT ════════ */}
          {tab === 'programs' && (<>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">🎓 Programs</h3>
              <button onClick={() => { resetProgramForm(); setTab('add_program'); }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold active:scale-95 shadow-sm transition-all">
                + Create Program
              </button>
            </div>
            <AdminSearchBar value={programSearch} onChange={setProgramSearch} placeholder="Search programs..." />
            <div className="flex gap-2 flex-wrap">
              {[{ k: '', l: 'All' }, { k: 'pcod', l: '🩺 PCOD' }, { k: 'fertility', l: '🤰 Fertility' }, { k: 'menopause', l: '🌿 Menopause' }, { k: 'cycle_sync', l: '🌸 Cycle Sync' }, { k: 'wellness', l: '🧘 Wellness' }, { k: 'weight', l: '⚖️ Weight' }, { k: 'skin_hair', l: '✨ Skin/Hair' }, { k: 'postpartum', l: '👶 Postpartum' }].map(c => (
                <button key={c.k} onClick={() => setProgramCatFilter(c.k)}
                  className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (programCatFilter === c.k ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500')}>
                  {c.l}
                </button>
              ))}
            </div>
            {programsLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="space-y-3">
                {adminPrograms
                  .filter(p => (!programCatFilter || p.category === programCatFilter) && (!programSearch || p.title.toLowerCase().includes(programSearch.toLowerCase())))
                  .map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {p.emoji || '🌸'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-extrabold text-gray-900 truncate">{p.title}</p>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${p.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.isPublished ? 'Published' : 'Draft'}
                          </span>
                          {p.isFeatured && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.subtitle || p.category}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[8px] font-bold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">{p.category}</span>
                          <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p.duration || `${p.durationDays}d`}</span>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${p.isFree ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                            {p.isFree ? 'Free' : `₹${p.discountPrice || p.price}`}
                          </span>
                          <span className="text-[8px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{p.contentCount || 0} items</span>
                          <span className="text-[8px] font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{p.enrolledCount || 0} enrolled</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 border-t border-gray-50 pt-3">
                      <button onClick={() => { setContentProgramId(p.id); fetchProgramContents(p.id); setTab('program_content'); }}
                        className="flex-1 py-2 rounded-xl bg-purple-50 text-purple-600 text-[10px] font-bold active:scale-95">
                        📋 Content
                      </button>
                      <button onClick={async () => {
                        await apiService.toggleProgramPublish(p.id);
                        toast.success(p.isPublished ? 'Unpublished' : 'Published');
                        fetchPrograms();
                      }} className={`flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 ${p.isPublished ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {p.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => {
                        setEditProgram(p);
                        setPfTitle(p.title); setPfSubtitle(p.subtitle || ''); setPfDescription(p.description || '');
                        setPfEmoji(p.emoji || '🌸'); setPfImageUrl(p.imageUrl || ''); setPfCategory(p.category);
                        setPfDuration(p.duration || ''); setPfDurationDays(String(p.durationDays));
                        setPfIsFree(p.isFree); setPfPrice(String(p.price || 0)); setPfDiscountPrice(p.discountPrice ? String(p.discountPrice) : '');
                        setPfDifficulty(p.difficulty || 'beginner');
                        setPfHighlights(Array.isArray(p.highlights) ? p.highlights.join('\n') : '');
                        setPfWhatYouGet(Array.isArray(p.whatYouGet) ? p.whatYouGet.join('\n') : '');
                        setPfPrerequisites(p.prerequisites || ''); setPfDoctorName(p.doctorName || '');
                        setTab('edit_program');
                      }} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold active:scale-95">Edit</button>
                      <button onClick={async () => {
                        if (!confirm('Delete this program and all its content?')) return;
                        await apiService.deleteProgram(p.id);
                        toast.success('Deleted'); fetchPrograms();
                      }} className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-bold active:scale-95">Del</button>
                    </div>
                  </div>
                ))}
                {adminPrograms.filter(p => (!programCatFilter || p.category === programCatFilter)).length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl">
                    <p className="text-3xl mb-2">🎓</p>
                    <p className="text-sm font-bold text-gray-600">No programs yet</p>
                    <p className="text-[10px] text-gray-400">Create PCOD, fertility, or wellness programs</p>
                  </div>
                )}
              </div>
            )}
          </>)}

          {/* ════════ ADD / EDIT PROGRAM ════════ */}
          {(tab === 'add_program' || tab === 'edit_program') && (<>
            <div className="flex items-center gap-3">
              <button onClick={() => { resetProgramForm(); setTab('programs'); }} className="text-gray-400 text-lg active:scale-90">←</button>
              <h3 className="text-base font-extrabold text-gray-900">{editProgram ? 'Edit Program' : 'Create Program'}</h3>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-[60px_1fr] gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Emoji</label>
                  <input value={pfEmoji} onChange={e => setPfEmoji(e.target.value)} className="w-full mt-1 px-2 py-2.5 border border-gray-200 rounded-xl text-2xl text-center" />
                </div>
                <FormField label="Title" value={pfTitle} onChange={setPfTitle} placeholder="e.g. PCOD Reversal Program" />
              </div>
              <FormField label="Subtitle" value={pfSubtitle} onChange={setPfSubtitle} placeholder="90-Day Ayurvedic Protocol" />
              <FormField label="Description" value={pfDescription} onChange={setPfDescription} placeholder="Full program description..." multiline />
              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {[{ k: 'pcod', l: '🩺 PCOD' }, { k: 'fertility', l: '🤰 Fertility' }, { k: 'menopause', l: '🌿 Menopause' }, { k: 'cycle_sync', l: '🌸 Cycle Sync' }, { k: 'wellness', l: '🧘 Wellness' }, { k: 'weight', l: '⚖️ Weight' }, { k: 'skin_hair', l: '✨ Skin/Hair' }, { k: 'postpartum', l: '👶 Postpartum' }].map(c => (
                    <button key={c.k} onClick={() => setPfCategory(c.k)}
                      className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border-2 ' + (pfCategory === c.k ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500')}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Duration & Difficulty */}
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Duration Label" value={pfDuration} onChange={setPfDuration} placeholder="30 days" />
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Days</label>
                  <input type="number" value={pfDurationDays} onChange={e => setPfDurationDays(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Difficulty</label>
                  <select value={pfDifficulty} onChange={e => setPfDifficulty(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              {/* Pricing */}
              <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-emerald-700 uppercase">💰 Pricing</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold text-gray-600">{pfIsFree ? 'Free' : 'Paid'}</span>
                    <input type="checkbox" checked={!pfIsFree} onChange={e => setPfIsFree(!e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  </label>
                </div>
                {!pfIsFree && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Price (₹)" value={pfPrice} onChange={setPfPrice} placeholder="999" />
                    <FormField label="Sale Price (₹)" value={pfDiscountPrice} onChange={setPfDiscountPrice} placeholder="499" />
                  </div>
                )}
              </div>
              {/* What you get & highlights */}
              <FormField label="Highlights (one per line)" value={pfHighlights} onChange={setPfHighlights} placeholder="Doctor-designed protocol&#10;Personalized diet plans&#10;Weekly live Q&A" multiline />
              <FormField label="What You Get (one per line)" value={pfWhatYouGet} onChange={setPfWhatYouGet} placeholder="12 video lessons&#10;Diet plan PDF&#10;Private community access" multiline />
              <FormField label="Prerequisites / Who Should Join" value={pfPrerequisites} onChange={setPfPrerequisites} placeholder="Women aged 18-45 with PCOD symptoms" />
              <FormField label="Expert / Doctor Name" value={pfDoctorName} onChange={setPfDoctorName} placeholder="Dr. Shruthi R" />
              <FormField label="Cover Image URL" value={pfImageUrl} onChange={setPfImageUrl} placeholder="https://..." />
              <button onClick={handleSaveProgram} disabled={pfSaving}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 shadow-sm transition-all">
                {pfSaving ? 'Saving...' : editProgram ? 'Update Program' : 'Create Program'}
              </button>
            </div>
          </>)}

          {/* ════════ PROGRAM CONTENT MANAGER ════════ */}
          {tab === 'program_content' && (<>
            <div className="flex items-center gap-3">
              <button onClick={() => setTab('programs')} className="text-gray-400 text-lg active:scale-90">←</button>
              <h3 className="text-base font-extrabold text-gray-900">📋 Program Content</h3>
            </div>
            {/* Add content form */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-[10px] font-extrabold text-emerald-700 uppercase">+ Add Content Item</p>
              <FormField label="Title" value={cfTitle} onChange={setCfTitle} placeholder="e.g. Introduction to PCOD" />
              <FormField label="Description" value={cfDescription} onChange={setCfDescription} placeholder="Brief description..." />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                  <select value={cfType} onChange={e => setCfType(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                    <option value="video">🎬 Video</option>
                    <option value="audio">🎵 Audio</option>
                    <option value="article">📄 Article</option>
                    <option value="task">✅ Task</option>
                    <option value="diet_plan">🥗 Diet Plan</option>
                    <option value="yoga">🧘 Yoga</option>
                    <option value="live_class">📡 Live Class</option>
                    <option value="recipe">🍲 Recipe</option>
                    <option value="quiz">❓ Quiz</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Week</label>
                    <input type="number" value={cfWeek} onChange={e => setCfWeek(e.target.value)} min="1"
                      className="w-full mt-1 px-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Day</label>
                    <input type="number" value={cfDay} onChange={e => setCfDay(e.target.value)} placeholder="-"
                      className="w-full mt-1 px-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Order</label>
                    <input type="number" value={cfSort} onChange={e => setCfSort(e.target.value)}
                      className="w-full mt-1 px-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                  </div>
                </div>
              </div>
              {(cfType === 'video' || cfType === 'yoga' || cfType === 'live_class') && (
                <FormField label="Video URL" value={cfVideoUrl} onChange={setCfVideoUrl} placeholder="https://..." />
              )}
              {(cfType === 'audio') && (
                <FormField label="Audio URL" value={cfAudioUrl} onChange={setCfAudioUrl} placeholder="https://..." />
              )}
              <FormField label="Thumbnail Image" value={cfImageUrl} onChange={setCfImageUrl} placeholder="https://..." />
              <FormField label="Duration" value={cfDuration} onChange={setCfDuration} placeholder="15 min" />
              {(cfType === 'article' || cfType === 'diet_plan' || cfType === 'recipe' || cfType === 'task') && (
                <FormField label="Content Body (markdown)" value={cfBody} onChange={setCfBody} placeholder="Write content here..." multiline />
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cfIsFree} onChange={e => setCfIsFree(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                <span className="text-[10px] font-bold text-gray-600">Free preview (visible to non-enrolled users)</span>
              </label>
              <button onClick={handleSaveContent} disabled={cfSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95">
                {cfSaving ? 'Saving...' : '+ Add Content'}
              </button>
            </div>
            {/* Existing content list */}
            <div className="space-y-2">
              {programContents.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="text-xs font-bold text-gray-500">No content yet. Add videos, articles, tasks above.</p>
                </div>
              ) : (
                (() => {
                  const weeks = [...new Set(programContents.map(c => c.weekNumber))].sort((a, b) => a - b);
                  return weeks.map(w => (
                    <div key={w} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                        <p className="text-[10px] font-extrabold text-emerald-700 uppercase">Week {w}</p>
                      </div>
                      {programContents.filter(c => c.weekNumber === w).map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                          <span className="text-lg">{
                            c.contentType === 'video' ? '🎬' : c.contentType === 'audio' ? '🎵' :
                            c.contentType === 'article' ? '📄' : c.contentType === 'task' ? '✅' :
                            c.contentType === 'diet_plan' ? '🥗' : c.contentType === 'yoga' ? '🧘' :
                            c.contentType === 'live_class' ? '📡' : c.contentType === 'recipe' ? '🍲' : '📋'
                          }</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{c.title}</p>
                            <div className="flex gap-1 mt-0.5">
                              <span className="text-[8px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.contentType}</span>
                              {c.dayNumber && <span className="text-[8px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Day {c.dayNumber}</span>}
                              {c.duration && <span className="text-[8px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.duration}</span>}
                              {c.isFree && <span className="text-[8px] font-bold bg-green-100 text-green-600 px-1.5 py-0.5 rounded">Free</span>}
                            </div>
                          </div>
                          <button onClick={async () => {
                            if (!confirm('Delete this content?')) return;
                            await apiService.deleteProgramContent(c.id);
                            toast.success('Deleted');
                            fetchProgramContents(contentProgramId);
                          }} className="text-rose-400 text-xs active:scale-90">🗑️</button>
                        </div>
                      ))}
                    </div>
                  ));
                })()
              )}
            </div>
          </>)}

          {/* ════════ WELLNESS MANAGEMENT ════════ */}
          {tab === 'wellness' && (<>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">🧘 Wellness Activities</h3>
              <button onClick={() => { resetWellnessForm(); setTab('add_wellness'); }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold active:scale-95 shadow-sm transition-all">
                + Add Activity
              </button>
            </div>

            <AdminSearchBar value={wellnessSearch} onChange={setWellnessSearch} placeholder="Search activities..." />

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {[{ k: '', l: 'All' }, { k: 'yoga', l: '🧘 Yoga' }, { k: 'breathing', l: '💨 Breathing' }, { k: 'meditation', l: '🧠 Meditation' }].map(c => (
                <button key={c.k} onClick={() => setWellnessCatFilter(c.k)}
                  className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (wellnessCatFilter === c.k ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500')}>
                  {c.l}
                </button>
              ))}
            </div>

            {wellnessLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="space-y-3">
                {wellnessActivities
                  .filter(a => (!wellnessCatFilter || a.category === wellnessCatFilter) && (!wellnessSearch || a.title.toLowerCase().includes(wellnessSearch.toLowerCase())))
                  .map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-3">
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.title} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">
                          {a.category === 'yoga' ? '🧘' : a.category === 'breathing' ? '💨' : '🧠'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-gray-900 truncate">{a.title}</p>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {a.isActive ? 'Active' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{a.description || 'No description'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[8px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{a.category}</span>
                          <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a.durationMinutes}min</span>
                          <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{a.difficulty}</span>
                          {a.videoUrl && <span className="text-[8px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">🎬 Video</span>}
                          {a.audioUrl && <span className="text-[8px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">🎵 Audio</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 border-t border-gray-50 pt-3">
                      <button onClick={async () => {
                        await apiService.toggleWellnessPublish(a.id);
                        toast.success(a.isActive ? 'Unpublished' : 'Published');
                        fetchWellness();
                      }} className={`flex-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all ${a.isActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {a.isActive ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => {
                        setEditWellness(a);
                        setWfTitle(a.title); setWfDescription(a.description || '');
                        setWfCategory(a.category); setWfDuration(String(a.durationMinutes));
                        setWfDifficulty(a.difficulty); setWfPhases(a.cyclePhases || []);
                        setWfImageUrl(a.imageUrl || ''); setWfVideoUrl(a.videoUrl || '');
                        setWfAudioUrl(a.audioUrl || '');
                        setWfInstructions(Array.isArray(a.instructions) ? a.instructions.join('\n') : '');
                        setTab('edit_wellness');
                      }} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold active:scale-95 transition-all">
                        Edit
                      </button>
                      <button onClick={async () => {
                        if (!confirm('Delete this activity?')) return;
                        await apiService.deleteWellness(a.id);
                        toast.success('Deleted'); fetchWellness();
                      }} className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-bold active:scale-95 transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {wellnessActivities.filter(a => (!wellnessCatFilter || a.category === wellnessCatFilter) && (!wellnessSearch || a.title.toLowerCase().includes(wellnessSearch.toLowerCase()))).length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl">
                    <p className="text-3xl mb-2">🧘</p>
                    <p className="text-sm font-bold text-gray-600">No activities yet</p>
                    <p className="text-[10px] text-gray-400">Add yoga, breathing, or meditation content</p>
                  </div>
                )}
              </div>
            )}
          </>)}

          {/* ════════ ADD / EDIT WELLNESS ════════ */}
          {(tab === 'add_wellness' || tab === 'edit_wellness') && (<>
            <div className="flex items-center gap-3">
              <button onClick={() => { resetWellnessForm(); setTab('wellness'); }} className="text-gray-400 text-lg active:scale-90">←</button>
              <h3 className="text-base font-extrabold text-gray-900">{editWellness ? 'Edit Activity' : 'Add Activity'}</h3>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <FormField label="Title" value={wfTitle} onChange={setWfTitle} placeholder="e.g. Morning Sun Salutation" />
              <FormField label="Description" value={wfDescription} onChange={setWfDescription} placeholder="Brief description..." multiline />

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Category</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {[{ k: 'yoga', l: '🧘 Yoga' }, { k: 'breathing', l: '💨 Breathing' }, { k: 'meditation', l: '🧠 Meditation' }, { k: 'stress_management', l: '😌 Stress' }].map(c => (
                    <button key={c.k} onClick={() => setWfCategory(c.k)}
                      className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border-2 ' + (wfCategory === c.k ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500')}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Duration (min)</label>
                  <input type="number" value={wfDuration} onChange={e => setWfDuration(e.target.value)} min="1" max="120"
                    className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Difficulty</label>
                  <select value={wfDifficulty} onChange={e => setWfDifficulty(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Cycle Phases */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cycle Phases</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {['MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL'].map(p => (
                    <button key={p} onClick={() => setWfPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border-2 ' + (wfPhases.includes(p) ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500')}>
                      {p === 'MENSTRUAL' ? '🩸' : p === 'FOLLICULAR' ? '🌱' : p === 'OVULATION' ? '✨' : '🍂'} {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media URLs */}
              <div className="space-y-3 bg-purple-50 rounded-xl p-4">
                <p className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wide">🎬 Media</p>
                <FormField label="Video URL (YouTube/Cloudinary/upload)" value={wfVideoUrl} onChange={setWfVideoUrl} placeholder="https://..." />
                <FormField label="Audio URL (MP3/WAV)" value={wfAudioUrl} onChange={setWfAudioUrl} placeholder="https://..." />
                <FormField label="Thumbnail / Image URL" value={wfImageUrl} onChange={setWfImageUrl} placeholder="https://..." />
                <p className="text-[9px] text-purple-500">Upload files via Upload tab first, then paste the URL here</p>
              </div>

              {/* Instructions */}
              <FormField label="Instructions (one per line)" value={wfInstructions} onChange={setWfInstructions} placeholder="Step 1: Stand tall...&#10;Step 2: Inhale deeply..." multiline />

              <button onClick={handleSaveWellness} disabled={wfSaving}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 shadow-sm transition-all">
                {wfSaving ? 'Saving...' : editWellness ? 'Update Activity' : 'Create Activity'}
              </button>
            </div>
          </>)}

          {/* ════════ FINANCE ════════ */}
          {tab === 'finance' && (<FinanceTab />)}

          {/* ════════ AUDIT LOG ════════ */}
          {tab === 'audit_log' && (<AuditLogTab />)}

          {/* ════════ SETTINGS ════════ */}
          {tab === 'settings' && (<>
            <h3 className="text-base font-extrabold text-gray-900">{'\u2699\uFE0F'} Settings</h3>

            {/* Change Password */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-700">{'\u{1F512}'} Change Password</h4>
              <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} placeholder="Current password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
              <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New password (min 8 characters)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
              {newPin && newPin.length < 8 && <p className="text-[10px] text-red-500 font-medium">Password must be at least 8 characters</p>}
              <button onClick={() => {
                if (oldPin === getStoredPin() && newPin.length >= 8) {
                  setStoredPin(newPin);
                  toast.success('Password changed!');
                  setOldPin(''); setNewPin('');
                } else { toast.error('Wrong current password or new one too short'); }
              }} className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm active:scale-95 shadow-sm hover:shadow transition-all">Update Password</button>
            </div>

            {/* Email Whitelist */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-700">{'\u{1F4E7}'} Email Whitelist</h4>
              <p className="text-[10px] text-gray-400">Emails allowed to register or access admin features.</p>
              <div className="flex gap-2">
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddWhitelistEmail(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all" />
                <button onClick={handleAddWhitelistEmail} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold active:scale-95 shadow-sm transition-all">Add</button>
              </div>
              {emailWhitelist.length === 0 && <p className="text-[10px] text-gray-400">No emails whitelisted</p>}
              {emailWhitelist.map(email => (
                <div key={email} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-700">{email}</span>
                  <button onClick={() => handleRemoveWhitelistEmail(email)} className="text-red-400 text-sm font-bold hover:text-red-600 transition-colors">{'\u2715'}</button>
                </div>
              ))}
            </div>

            {/* App Settings */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-1">
              <h4 className="text-sm font-bold text-gray-700 mb-3">{'\u{1F527}'} App Settings</h4>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold text-gray-700">Maintenance Mode</p>
                  <p className="text-[10px] text-gray-400">Show maintenance page to users</p>
                </div>
                <button onClick={toggleMaintenance}
                  className={'w-14 h-7 rounded-full transition-all relative shadow-inner ' + (maintenanceMode ? 'bg-red-500' : 'bg-gray-300')}>
                  <div className={'w-6 h-6 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ' + (maintenanceMode ? 'translate-x-7' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-700">New Registrations</p>
                  <p className="text-[10px] text-gray-400">Allow new user signups</p>
                </div>
                <button onClick={toggleRegistrations}
                  className={'w-14 h-7 rounded-full transition-all relative shadow-inner ' + (registrationsOpen ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <div className={'w-6 h-6 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ' + (registrationsOpen ? 'translate-x-7' : 'translate-x-0.5')} />
                </button>
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-5 border border-red-200 shadow-sm">
              <h4 className="text-sm font-bold text-red-700">{'\u26A0\uFE0F'} Security Notice</h4>
              <p className="text-[11px] text-red-600 mt-2">Default password: <strong>VedaClue@2024#Admin</strong></p>
              <p className="text-[11px] text-red-600">Change it immediately after first login.</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-gray-700">How to Access Admin</h4>
              <p className="text-[11px] text-gray-600 mt-2">Go to Profile {'\u2192'} scroll to bottom {'\u2192'} tap "VedaClue v1.0.0" five times {'\u2192'} enter password.</p>
            </div>
          </>)}

        </>)}
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-6 text-center max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-3">
              <span className="text-3xl">{'\u26A0\uFE0F'}</span>
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Delete {confirmDel.type}?</h3>
            <p className="text-[11px] text-gray-500 mt-1">This action cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={() => {
                if (confirmDel.type === 'product') handleDeleteProduct(confirmDel.id);
                if (confirmDel.type === 'article') handleDeleteArticle(confirmDel.id);
                if (confirmDel.type === 'doctor') handleDeleteDoctor(confirmDel.id);
                setConfirmDel(null);
              }} className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl text-sm font-bold text-white shadow-sm hover:shadow transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
