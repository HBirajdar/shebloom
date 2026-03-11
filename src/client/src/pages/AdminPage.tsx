// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import ImageUpload from '../components/ImageUpload';
import toast from 'react-hot-toast';

// ─── Local types ────────────────────────────────────
type ProductCategory = 'hair_oil' | 'body_lotion' | 'face_wash' | 'body_wash' | 'hair_treatment' | 'supplement' | 'skincare';
type TargetAudience = 'all' | 'periods' | 'fertility' | 'pregnancy' | 'wellness';

interface AdminProduct {
  id: string; name: string; category: ProductCategory; price: number; discountPrice?: number;
  description: string; ingredients: string[]; benefits: string[]; howToUse: string;
  size: string; emoji: string; rating: number; reviews: number; inStock: boolean;
  isPublished: boolean; isFeatured: boolean; targetAudience: TargetAudience[]; tags: string[];
  preparationMethod?: string; doctorNote?: string; imageUrl?: string; createdAt: string;
}
interface AdminArticle {
  id: string; title: string; content: string; category: string; readTime: string;
  emoji: string; isPublished: boolean; isFeatured: boolean; targetAudience: TargetAudience[];
  imageUrl?: string; createdAt: string;
}
interface AdminDoctor {
  id: string; name: string; specialization: string; experience: number; rating: number;
  reviews: number; fee: number; feeFreeForPoor: boolean; qualification: string;
  tags: string[]; languages: string[]; about: string; isChief: boolean; isPublished: boolean;
  isPromoted?: boolean; avatarUrl?: string;
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
const FormField = ({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }) => (
  <div>
    <label className="text-[9px] font-bold text-gray-500 uppercase">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
    )}
  </div>
);
const FormNumField = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <label className="text-[9px] font-bold text-gray-500 uppercase">{label}</label>
    <input type="number" value={value || ''} onChange={e => onChange(+e.target.value)}
      className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
  </div>
);
const FormTargetPicker = ({ value, onChange, opts }: { value: TargetAudience[]; onChange: (v: TargetAudience[]) => void; opts: { k: TargetAudience; l: string }[] }) => (
  <div>
    <label className="text-[9px] font-bold text-gray-500 uppercase">Visible To</label>
    <div className="flex flex-wrap gap-1 mt-1">
      {opts.map(t => (
        <button key={t.k} onClick={() => onChange(value.includes(t.k) ? value.filter(x => x !== t.k) : [...value, t.k])}
          className={'px-2 py-1 rounded-lg text-[9px] font-bold ' + (value.includes(t.k) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>{t.l}</button>
      ))}
    </div>
  </div>
);

type TabId = 'overview' | 'users' | 'products' | 'articles' | 'doctors' | 'appointments' | 'analytics' | 'settings' | 'callbacks' | 'add_product' | 'add_article' | 'add_doctor';

export default function AdminPage() {
  const nav = useNavigate();

  // Auth state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');

  // CMS data (in-memory store)
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

  // Form states
  const [np, setNp] = useState({ name: '', category: 'hair_oil' as ProductCategory, price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', targetAudience: ['all'] as TargetAudience[], doctorNote: '', preparationMethod: '', imageUrl: '' });
  const [na, setNa] = useState({ title: '', content: '', category: '', readTime: '5 min', emoji: '\u{1F4DD}', targetAudience: ['all'] as TargetAudience[], imageUrl: '' });
  const [nd, setNd] = useState({ name: '', specialization: '', experience: 0, fee: 0, qualification: '', about: '', tags: '', languages: '', avatarUrl: '' });
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Settings state
  const [emailWhitelist, setEmailWhitelist] = useState<string[]>(() => JSON.parse(localStorage.getItem('sb_email_whitelist') || '[]'));
  const [newEmail, setNewEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(() => localStorage.getItem('sb_maintenance') === 'true');
  const [registrationsOpen, setRegistrationsOpen] = useState(() => localStorage.getItem('sb_registrations_off') !== 'true');

  // ─── Data fetchers ──────────────────────────────────
  const fetchUsers = async (page = 1, search = usersSearch, role = usersRoleFilter) => {
    setUsersLoading(true);
    try {
      const res = await adminAPI.users({ page, limit: 20, search: search || undefined, role: role || undefined });
      const d = res.data.data;
      setUsers(d.users);
      setUsersTotal(d.total);
      setUsersPage(d.page);
      setUsersTotalPages(d.totalPages);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAppointments = async (page = 1, status = apptsStatusFilter) => {
    setApptsLoading(true);
    try {
      const res = await adminAPI.appointments({ page, status: status || undefined });
      const d = res.data.data;
      setAppts(d.appointments);
      setApptsTotal(d.total);
      setApptsPage(d.page);
      setApptsTotalPages(d.totalPages);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to load appointments');
    } finally {
      setApptsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await adminAPI.analytics();
      setAnalytics(res.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!isUnlocked) return;
    if (tab === 'users') fetchUsers(1, usersSearch, usersRoleFilter);
    if (tab === 'appointments') fetchAppointments(1, apptsStatusFilter);
    if (tab === 'analytics') fetchAnalytics();
  }, [tab, isUnlocked]);

  // ─── Auth ───────────────────────────────────────────
  const handleUnlock = async () => {
    if (password !== getStoredPin()) {
      setPassError('Incorrect password. Access denied.');
      setPassword('');
      return;
    }
    setIsUnlocked(true);
    setPassword('');
    setPassError('');
    toast.success('Welcome, Admin!');
    setDashLoading(true);
    try {
      const res = await adminAPI.dashboard();
      const data = res.data.data;
      setProducts(data.products || []);
      setArticles(data.articles || []);
      setDoctors(data.doctors || []);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setDashLoading(false);
    }
  };

  const handleLock = () => { setIsUnlocked(false); nav('/profile'); };

  // ─── LOGIN SCREEN ───────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-3xl text-white shadow-lg mb-5">
            {'\u{1F6E1}\uFE0F'}
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Admin Console</h2>
          <p className="text-xs text-gray-400 mt-1 mb-6">Authorized personnel only</p>
          <div className="relative mb-4">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setPassError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && password) handleUnlock(); }}
              placeholder="Enter admin password"
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-slate-500 focus:outline-none transition-colors pr-12"
              autoFocus
            />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {showPass ? '\u{1F441}\uFE0F' : '\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F'}
            </button>
          </div>
          {passError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-600 font-bold">{'\u26D4'} {passError}</p>
            </div>
          )}
          <button onClick={handleUnlock} disabled={!password}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #1E293B, #334155)' }}>
            {'\u{1F513}'} Authenticate
          </button>
          <button onClick={() => nav('/profile')} className="mt-4 text-xs text-gray-400 font-bold">
            {'\u2190'} Back to Profile
          </button>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[9px] text-gray-300">This panel is restricted. Unauthorized access attempts are logged.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ──────────────────────────────────────
  const pubProducts = products.filter(p => p.isPublished).length;
  const pubArticles = articles.filter(a => a.isPublished).length;
  const pubDoctors = doctors.filter(d => d.isPublished).length;

  // ─── CRUD Handlers ──────────────────────────────────
  const handleAddProduct = async () => {
    if (!np.name || np.price <= 0) { toast.error('Name and price required'); return; }
    try {
      const res = await adminAPI.createProduct({
        ...np,
        discountPrice: np.discountPrice > 0 ? np.discountPrice : undefined,
        ingredients: np.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        benefits: np.benefits.split(',').map(s => s.trim()).filter(Boolean),
        tags: [],
        preparationMethod: np.preparationMethod || undefined,
        doctorNote: np.doctorNote || undefined,
        imageUrl: np.imageUrl || undefined,
      });
      setProducts(prev => [res.data.data, ...prev]);
      toast.success('Product added as draft!');
      setNp({ name: '', category: 'hair_oil', price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', targetAudience: ['all'], doctorNote: '', preparationMethod: '', imageUrl: '' });
      setTab('products');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to add product'); }
  };

  const handleToggleProductPublish = async (id: string) => {
    try {
      const res = await adminAPI.toggleProductPublish(id);
      setProducts(prev => prev.map(p => p.id === id ? res.data.data : p));
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await adminAPI.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to delete'); }
  };

  const handleAddArticle = async () => {
    if (!na.title || !na.content) { toast.error('Title and content required'); return; }
    try {
      const res = await adminAPI.createArticle({ ...na, author: 'chief', imageUrl: na.imageUrl || undefined });
      setArticles(prev => [res.data.data, ...prev]);
      toast.success('Article saved as draft!');
      setNa({ title: '', content: '', category: '', readTime: '5 min', emoji: '\u{1F4DD}', targetAudience: ['all'], imageUrl: '' });
      setTab('articles');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to add article'); }
  };

  const handleToggleArticlePublish = async (id: string) => {
    try {
      const res = await adminAPI.toggleArticlePublish(id);
      setArticles(prev => prev.map(a => a.id === id ? res.data.data : a));
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await adminAPI.deleteArticle(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to delete'); }
  };

  const handleAddDoctor = async () => {
    if (!nd.name) { toast.error('Name required'); return; }
    try {
      const res = await adminAPI.createDoctor({
        name: nd.name, specialization: nd.specialization, experience: nd.experience,
        fee: nd.fee, qualification: nd.qualification, about: nd.about,
        tags: nd.tags.split(',').map(s => s.trim()).filter(Boolean),
        languages: nd.languages.split(',').map(s => s.trim()).filter(Boolean),
        avatarUrl: nd.avatarUrl || undefined,
      });
      setDoctors(prev => [res.data.data, ...prev]);
      toast.success('Doctor added!');
      setNd({ name: '', specialization: '', experience: 0, fee: 0, qualification: '', about: '', tags: '', languages: '', avatarUrl: '' });
      setTab('doctors');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to add doctor'); }
  };

  const handleToggleDoctorPublish = async (id: string) => {
    try {
      const res = await adminAPI.toggleDoctorPublish(id);
      setDoctors(prev => prev.map(d => d.id === id ? res.data.data : d));
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const handleToggleDoctorPromote = async (id: string) => {
    try {
      const res = await adminAPI.toggleDoctorPromote(id);
      setDoctors(prev => prev.map(d => d.id === id ? res.data.data : d));
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const handleDeleteDoctor = async (id: string) => {
    try {
      await adminAPI.deleteDoctor(id);
      setDoctors(prev => prev.filter(d => d.id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to delete'); }
  };

  // User management handlers
  const handleUpdateUserRole = async (id: string, role: string) => {
    try {
      const res = await adminAPI.updateUser(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? res.data.data : u));
      toast.success('Role updated');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update role'); }
  };

  const handleToggleUserActive = async (id: string, currentlyActive: boolean) => {
    try {
      const res = await adminAPI.updateUser(id, { isActive: !currentlyActive });
      setUsers(prev => prev.map(u => u.id === id ? res.data.data : u));
      toast.success(currentlyActive ? 'User banned' : 'User activated');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  // Appointment status handler
  const handleUpdateApptStatus = async (id: string, status: string) => {
    try {
      const res = await adminAPI.updateAppointment(id, { status });
      setAppts(prev => prev.map(a => a.id === id ? res.data.data : a));
      toast.success('Status updated');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
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
  ];

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = { USER: 'bg-blue-100 text-blue-700', DOCTOR: 'bg-emerald-100 text-emerald-700', ADMIN: 'bg-red-100 text-red-700' };
    return <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (colors[role] || 'bg-gray-100 text-gray-600')}>{role}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { PENDING: 'bg-orange-100 text-orange-700', CONFIRMED: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-red-100 text-red-700' };
    return <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (colors[status] || 'bg-gray-100 text-gray-600')}>{status}</span>;
  };

  const initials = (name: string) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-800 text-white">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-extrabold">{'\u{1F6E1}\uFE0F'} VedaClue Admin</h1>
          </div>
          <button onClick={handleLock} className="text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full active:scale-95">
            {'\u{1F512}'} Lock & Exit
          </button>
        </div>
        <div className="px-3 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ' + (tab === t.id ? 'bg-white text-slate-800' : 'text-white/60')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3 max-w-[430px] mx-auto">

        {/* Loading spinner */}
        {dashLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        )}

        {!dashLoading && (<>

          {/* ════════ OVERVIEW ════════ */}
          {tab === 'overview' && (<>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l: 'Products', v: products.length, p: pubProducts, c: '#059669', bg: '#ECFDF5' },
                { l: 'Articles', v: articles.length, p: pubArticles, c: '#2563EB', bg: '#EFF6FF' },
                { l: 'Doctors', v: doctors.length, p: pubDoctors, c: '#7C3AED', bg: '#F5F3FF' },
                { l: 'Callbacks', v: (JSON.parse(localStorage.getItem('sb_callbacks') || '[]')).length, p: (JSON.parse(localStorage.getItem('sb_callbacks') || '[]')).filter((c: any) => c.status === 'pending').length, c: '#EA580C', bg: '#FFF7ED' },
                ...(analytics ? [
                  { l: 'Users', v: analytics.totalUsers, p: analytics.activeUsers, c: '#0891B2', bg: '#ECFEFF' },
                  { l: 'Appointments', v: analytics.totalAppointments, p: 0, c: '#BE185D', bg: '#FDF2F8' },
                ] : []),
              ].map(s => (
                <div key={s.l} className="rounded-2xl p-4" style={{ backgroundColor: s.bg }}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: s.c }}>{s.l}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.v}</p>
                  <p className="text-[9px] text-gray-500">{s.p > 0 ? `${s.p} active` : ''}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-800 mb-2">Quick Actions</h3>
              {[
                { l: 'Add Product', t: 'add_product' as TabId, e: '\u{1F4E6}', c: 'bg-emerald-50 text-emerald-700' },
                { l: 'Write Article', t: 'add_article' as TabId, e: '\u{1F4DD}', c: 'bg-blue-50 text-blue-700' },
                { l: 'Add Doctor', t: 'add_doctor' as TabId, e: '\u{1F469}\u200D\u2695\uFE0F', c: 'bg-purple-50 text-purple-700' },
                { l: 'Manage Users', t: 'users' as TabId, e: '\u{1F465}', c: 'bg-cyan-50 text-cyan-700' },
                { l: 'View Analytics', t: 'analytics' as TabId, e: '\u{1F4C8}', c: 'bg-rose-50 text-rose-700' },
              ].map(a => (
                <button key={a.l} onClick={() => setTab(a.t)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors mt-1.5">
                  <span className={'w-8 h-8 rounded-lg flex items-center justify-center text-sm ' + a.c}>{a.e}</span>
                  <span className="text-xs font-bold text-gray-700 flex-1 text-left">{a.l}</span>
                  <span className="text-gray-300">{'\u203A'}</span>
                </button>
              ))}
            </div>
          </>)}

          {/* ════════ USERS ════════ */}
          {tab === 'users' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold">{'\u{1F465}'} Users ({usersTotal})</h3>
            </div>
            <input
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchUsers(1, usersSearch, usersRoleFilter); }}
              placeholder="Search by name, email, phone..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-slate-400 focus:outline-none"
            />
            <div className="flex gap-1 flex-wrap">
              {['', 'USER', 'DOCTOR', 'ADMIN'].map(r => (
                <button key={r} onClick={() => { setUsersRoleFilter(r); fetchUsers(1, usersSearch, r); }}
                  className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold ' + (usersRoleFilter === r ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500')}>
                  {r || 'ALL'}
                </button>
              ))}
              <button onClick={() => fetchUsers(1, usersSearch, usersRoleFilter)} className="ml-auto px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-emerald-100 text-emerald-700">Refresh</button>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-slate-400 border-t-transparent rounded-full" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-8">No users found</p>
            ) : (
              <>
                {users.map(u => (
                  <div key={u.id} className="bg-white rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" /> : initials(u.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-800 truncate">{u.fullName}</p>
                          {roleBadge(u.role)}
                          {!u.isActive && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">BANNED</span>}
                        </div>
                        <p className="text-[9px] text-gray-500 truncate">{u.email || u.phone || 'No contact'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2 items-center">
                      <select
                        value={u.role}
                        onChange={e => handleUpdateUserRole(u.id, e.target.value)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-[9px] font-bold bg-gray-50 border border-gray-200 focus:outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button
                        onClick={() => handleToggleUserActive(u.id, u.isActive)}
                        className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (u.isActive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}
                      >
                        {u.isActive ? 'Ban' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <button onClick={() => fetchUsers(usersPage - 1, usersSearch, usersRoleFilter)} disabled={usersPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-gray-100 text-gray-600 disabled:opacity-30">Prev</button>
                  <span className="text-[9px] text-gray-500 font-bold">Page {usersPage} of {usersTotalPages}</span>
                  <button onClick={() => fetchUsers(usersPage + 1, usersSearch, usersRoleFilter)} disabled={usersPage >= usersTotalPages}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-gray-100 text-gray-600 disabled:opacity-30">Next</button>
                </div>
              </>
            )}
          </>)}

          {/* ════════ PRODUCTS LIST ════════ */}
          {tab === 'products' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold">{'\u{1F4E6}'} Products ({products.length})</h3>
              <button onClick={() => setTab('add_product')} className="text-[10px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full active:scale-95">+ Add</button>
            </div>
            {products.length === 0 && <p className="text-center text-gray-400 text-xs py-8">No products yet. Click + Add to create one.</p>}
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className="text-xl">{p.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (p.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>{p.isPublished ? '\u2713 LIVE' : 'DRAFT'}</span>
                      <span className="text-[7px] text-gray-400">{'\u20B9'}{p.discountPrice || p.price}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                  <button onClick={() => handleToggleProductPublish(p.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (p.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{p.isPublished ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => setConfirmDel({ id: p.id, type: 'product' })} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>
                </div>
              </div>
            ))}
          </>)}

          {/* ════════ ARTICLES LIST ════════ */}
          {tab === 'articles' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold">{'\u{1F4DD}'} Articles ({articles.length})</h3>
              <button onClick={() => setTab('add_article')} className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full active:scale-95">+ Write</button>
            </div>
            {articles.length === 0 && <p className="text-center text-gray-400 text-xs py-8">No articles yet. Click + Write to create one.</p>}
            {articles.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className="text-xl">{a.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{a.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (a.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>{a.isPublished ? '\u2713 LIVE' : 'DRAFT'}</span>
                      <span className="text-[7px] text-gray-400">{a.category} {'\u2022'} {a.readTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                  <button onClick={() => handleToggleArticlePublish(a.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (a.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{a.isPublished ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => setConfirmDel({ id: a.id, type: 'article' })} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>
                </div>
              </div>
            ))}
          </>)}

          {/* ════════ DOCTORS LIST ════════ */}
          {tab === 'doctors' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold">{'\u{1F469}\u200D\u2695\uFE0F'} Doctors ({doctors.length})</h3>
              <button onClick={() => setTab('add_doctor')} className="text-[10px] font-bold text-white bg-purple-600 px-3 py-1.5 rounded-full active:scale-95">+ Add</button>
            </div>
            {doctors.length === 0 && <p className="text-center text-gray-400 text-xs py-8">No doctors yet. Click + Add to create one.</p>}
            {doctors.map(d => (
              <div key={d.id} className={'bg-white rounded-2xl p-3 shadow-sm ' + (d.isChief ? 'ring-2 ring-emerald-300' : d.isPromoted ? 'border-l-4 border-amber-400' : '')}>
                <div className="flex items-center gap-2.5">
                  {d.avatarUrl ? (
                    <img src={d.avatarUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ' + (d.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>{d.name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{d.name}</p>
                      {d.isChief && <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F451}'} CHIEF</span>}
                      {d.isPromoted && !d.isChief && <span className="text-[7px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2B50'} FEATURED</span>}
                    </div>
                    <p className="text-[9px] text-gray-500">{d.specialization}</p>
                    <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (d.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>{d.isPublished ? 'VISIBLE' : 'HIDDEN'}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                  <button onClick={() => handleToggleDoctorPublish(d.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (d.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{d.isPublished ? 'Hide' : 'Show'}</button>
                  {!d.isChief && (
                    <button
                      onClick={() => handleToggleDoctorPromote(d.id)}
                      className={'px-2 py-1 rounded-lg text-[9px] font-bold transition-all active:scale-95 ' +
                        (d.isPromoted ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-500 border border-gray-200')}
                    >
                      {d.isPromoted ? '\u2B50 Featured' : '\u2606 Feature'}
                    </button>
                  )}
                  {!d.isChief && <button onClick={() => setConfirmDel({ id: d.id, type: 'doctor' })} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>}
                </div>
              </div>
            ))}
          </>)}

          {/* ════════ APPOINTMENTS ════════ */}
          {tab === 'appointments' && (<>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold">{'\u{1F4C5}'} Appointments ({apptsTotal})</h3>
            </div>
            <div className="flex gap-1 flex-wrap">
              {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => { setApptsStatusFilter(s); fetchAppointments(1, s); }}
                  className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold ' + (apptsStatusFilter === s ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500')}>
                  {s || 'ALL'}
                </button>
              ))}
            </div>

            {apptsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-slate-400 border-t-transparent rounded-full" /></div>
            ) : appts.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-8">No appointments found</p>
            ) : (
              <>
                {appts.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{a.user?.fullName || 'Unknown User'}</p>
                        <p className="text-[9px] text-gray-500">{a.doctor?.fullName || a.doctorName || 'No doctor assigned'} {a.doctor?.specialization ? `(${a.doctor.specialization})` : ''}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(a.scheduledAt).toLocaleString()}</p>
                        {a.notes && <p className="text-[9px] text-gray-400 italic mt-0.5">"{a.notes}"</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        {statusBadge(a.status)}
                        <span className="text-[8px] text-gray-400">{a.type}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2 items-center">
                      <select
                        value={a.status}
                        onChange={e => handleUpdateApptStatus(a.id, e.target.value)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-[9px] font-bold bg-gray-50 border border-gray-200 focus:outline-none"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <button onClick={() => fetchAppointments(apptsPage - 1, apptsStatusFilter)} disabled={apptsPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-gray-100 text-gray-600 disabled:opacity-30">Prev</button>
                  <span className="text-[9px] text-gray-500 font-bold">Page {apptsPage} of {apptsTotalPages}</span>
                  <button onClick={() => fetchAppointments(apptsPage + 1, apptsStatusFilter)} disabled={apptsPage >= apptsTotalPages}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-gray-100 text-gray-600 disabled:opacity-30">Next</button>
                </div>
              </>
            )}
          </>)}

          {/* ════════ ANALYTICS ════════ */}
          {tab === 'analytics' && (<>
            <h3 className="text-sm font-extrabold">{'\u{1F4C8}'} Analytics & Stats</h3>
            {analyticsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-slate-400 border-t-transparent rounded-full" /></div>
            ) : !analytics ? (
              <p className="text-center text-gray-400 text-xs py-8">Failed to load analytics</p>
            ) : (<>
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { l: 'Total Users', v: analytics.totalUsers, c: '#0891B2', bg: '#ECFEFF', icon: '\u{1F465}' },
                  { l: 'Active Users', v: analytics.activeUsers, c: '#059669', bg: '#ECFDF5', icon: '\u{1F7E2}' },
                  { l: 'Total Cycles', v: analytics.totalCycles, c: '#7C3AED', bg: '#F5F3FF', icon: '\u{1F504}' },
                  { l: 'Appointments', v: analytics.totalAppointments, c: '#BE185D', bg: '#FDF2F8', icon: '\u{1F4C5}' },
                ].map(s => (
                  <div key={s.l} className="rounded-2xl p-4" style={{ backgroundColor: s.bg }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{s.icon}</span>
                      <p className="text-[10px] font-bold uppercase" style={{ color: s.c }}>{s.l}</p>
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.v}</p>
                  </div>
                ))}
              </div>

              {/* Avg cycle length */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-gray-700">Avg Cycle Length</h4>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">{analytics.avgCycleLength} days</p>
              </div>

              {/* Mood distribution */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-gray-700 mb-3">Mood Distribution</h4>
                {(() => {
                  const moods = [
                    { key: 'GREAT', emoji: '\u{1F929}', color: 'bg-emerald-400' },
                    { key: 'GOOD', emoji: '\u{1F60A}', color: 'bg-blue-400' },
                    { key: 'OKAY', emoji: '\u{1F610}', color: 'bg-yellow-400' },
                    { key: 'LOW', emoji: '\u{1F614}', color: 'bg-orange-400' },
                    { key: 'BAD', emoji: '\u{1F62D}', color: 'bg-red-400' },
                  ];
                  return moods.map(m => {
                    const pct = analytics.moodDistribution?.[m.key] || 0;
                    return (
                      <div key={m.key} className="flex items-center gap-2 mb-2">
                        <span className="text-sm w-6">{m.emoji}</span>
                        <span className="text-[9px] font-bold text-gray-500 w-10">{m.key}</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className={m.color + ' h-full rounded-full transition-all duration-500'} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-gray-600 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Users by role */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-gray-700 mb-3">Users by Role</h4>
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
                      <div key={r.role} className={r.bg + ' rounded-2xl p-3 flex-1 text-center'}>
                        <div className={'w-12 h-12 mx-auto rounded-full bg-gradient-to-br ' + r.color + ' flex items-center justify-center'}>
                          <span className="text-white font-extrabold text-sm">{count}</span>
                        </div>
                        <p className="text-[9px] font-bold text-gray-600 mt-1.5">{r.role}</p>
                        <p className="text-[8px] text-gray-400">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent signups */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-gray-700 mb-2">Recent Signups (7 days)</h4>
                {analytics.recentSignups?.length === 0 && <p className="text-[10px] text-gray-400">No recent signups</p>}
                {analytics.recentSignups?.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {initials(u.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-700 truncate">{u.fullName}</p>
                      <p className="text-[8px] text-gray-400">{u.email || 'No email'}</p>
                    </div>
                    {roleBadge(u.role)}
                    <span className="text-[8px] text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>)}
          </>)}

          {/* ════════ ADD PRODUCT ════════ */}
          {tab === 'add_product' && (<>
            <div className="flex items-center gap-2 mb-1"><button onClick={() => setTab('products')} className="text-gray-400 text-sm">{'\u2190'}</button><h3 className="text-sm font-extrabold">New Product</h3></div>
            <ImageUpload label="Product Image" value={np.imageUrl} onChange={url => setNp({...np, imageUrl: url})} />
            <FormField label="Name *" value={np.name} onChange={v => setNp({...np, name: v})} placeholder="Bhringraj Hair Oil" />
            <FormField label="Description *" value={np.description} onChange={v => setNp({...np, description: v})} placeholder="Product description..." multiline />
            <div className="grid grid-cols-2 gap-2"><FormNumField label="Price *" value={np.price} onChange={v => setNp({...np, price: v})} /><FormNumField label="Sale Price" value={np.discountPrice} onChange={v => setNp({...np, discountPrice: v})} /></div>
            <div className="grid grid-cols-2 gap-2"><FormField label="Size" value={np.size} onChange={v => setNp({...np, size: v})} placeholder="200ml" /><FormField label="Emoji" value={np.emoji} onChange={v => setNp({...np, emoji: v})} placeholder="\u{1F33F}" /></div>
            <FormField label="Ingredients (comma-sep)" value={np.ingredients} onChange={v => setNp({...np, ingredients: v})} placeholder="Bhringraj, Amla..." multiline />
            <FormField label="Benefits (comma-sep)" value={np.benefits} onChange={v => setNp({...np, benefits: v})} placeholder="Reduces hairfall..." multiline />
            <FormField label="How to Use" value={np.howToUse} onChange={v => setNp({...np, howToUse: v})} placeholder="Instructions..." multiline />
            <FormField label="Doctor Note" value={np.doctorNote} onChange={v => setNp({...np, doctorNote: v})} placeholder="Personal recommendation..." multiline />
            <div><label className="text-[9px] font-bold text-gray-500 uppercase">Category</label>
              <div className="flex flex-wrap gap-1 mt-1">{catOpts.map(c => (<button key={c.k} onClick={() => setNp({...np, category: c.k})} className={'px-2 py-1 rounded-lg text-[9px] font-bold ' + (np.category === c.k ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{c.l}</button>))}</div></div>
            <FormTargetPicker opts={targetOpts} value={np.targetAudience} onChange={v => setNp({...np, targetAudience: v})} />
            <button onClick={handleAddProduct} className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-95" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>Add as Draft</button>
          </>)}

          {/* ════════ ADD ARTICLE ════════ */}
          {tab === 'add_article' && (<>
            <div className="flex items-center gap-2 mb-1"><button onClick={() => setTab('articles')} className="text-gray-400 text-sm">{'\u2190'}</button><h3 className="text-sm font-extrabold">Write Article</h3></div>
            <ImageUpload label="Cover Image" value={na.imageUrl} onChange={url => setNa({...na, imageUrl: url})} />
            <FormField label="Title *" value={na.title} onChange={v => setNa({...na, title: v})} placeholder="Understanding PCOD..." />
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Category" value={na.category} onChange={v => setNa({...na, category: v})} placeholder="PCOD, Wellness..." />
              <FormField label="Read Time" value={na.readTime} onChange={v => setNa({...na, readTime: v})} placeholder="5 min" />
            </div>
            <FormField label="Content *" value={na.content} onChange={v => setNa({...na, content: v})} placeholder="Write your article..." multiline />
            <FormTargetPicker opts={targetOpts} value={na.targetAudience} onChange={v => setNa({...na, targetAudience: v})} />
            <button onClick={handleAddArticle} className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-95" style={{background:'linear-gradient(135deg,#2563EB,#3B82F6)'}}>Save as Draft</button>
          </>)}

          {/* ════════ ADD DOCTOR ════════ */}
          {tab === 'add_doctor' && (<>
            <div className="flex items-center gap-2 mb-1"><button onClick={() => setTab('doctors')} className="text-gray-400 text-sm">{'\u2190'}</button><h3 className="text-sm font-extrabold">Add Doctor</h3></div>
            <ImageUpload label="Doctor Photo" value={nd.avatarUrl} onChange={url => setNd({...nd, avatarUrl: url})} />
            <FormField label="Full Name *" value={nd.name} onChange={v => setNd({...nd, name: v})} placeholder="Dr. Priya Sharma" />
            <FormField label="Specialization" value={nd.specialization} onChange={v => setNd({...nd, specialization: v})} placeholder="Gynecologist" />
            <FormField label="Qualification" value={nd.qualification} onChange={v => setNd({...nd, qualification: v})} placeholder="MBBS, MS" />
            <div className="grid grid-cols-2 gap-2"><FormNumField label="Experience (yrs)" value={nd.experience} onChange={v => setNd({...nd, experience: v})} /><FormNumField label="Fee" value={nd.fee} onChange={v => setNd({...nd, fee: v})} /></div>
            <FormField label="Tags (comma-sep)" value={nd.tags} onChange={v => setNd({...nd, tags: v})} placeholder="PCOD, IVF..." />
            <FormField label="Languages (comma-sep)" value={nd.languages} onChange={v => setNd({...nd, languages: v})} placeholder="English, Hindi..." />
            <FormField label="About" value={nd.about} onChange={v => setNd({...nd, about: v})} placeholder="Brief description..." multiline />
            <button onClick={handleAddDoctor} className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-95" style={{background:'linear-gradient(135deg,#7C3AED,#8B5CF6)'}}>Add Doctor</button>
          </>)}

          {/* ════════ CALLBACKS ════════ */}
          {tab === 'callbacks' && (() => {
            const cbs = JSON.parse(localStorage.getItem('sb_callbacks') || '[]') as any[];
            const pending = cbs.filter((c: any) => c.status === 'pending');
            const handled = cbs.filter((c: any) => c.status !== 'pending');
            const markDone = (id: string) => {
              const updated = cbs.map((c: any) => c.id === id ? { ...c, status: 'done' } : c);
              localStorage.setItem('sb_callbacks', JSON.stringify(updated));
              toast.success('Marked as done');
              setTab('overview'); setTimeout(() => setTab('callbacks'), 50);
            };
            return (<>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold">{'\u{1F4DE}'} Callback Requests</h3>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{pending.length} pending</span>
              </div>
              {pending.length === 0 && handled.length === 0 && (
                <div className="text-center py-10"><span className="text-4xl">{'\u{1F4ED}'}</span><p className="text-sm text-gray-400 mt-2">No callback requests yet</p></div>
              )}
              {pending.map((c: any) => (
                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-orange-400">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{c.userName}</p>
                      <a href={'tel:' + c.userPhone} className="text-xs font-bold text-emerald-600 underline">{'\u{1F4F1}'} {c.userPhone}</a>
                    </div>
                    <span className="text-[8px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">PENDING</span>
                  </div>
                  {c.productName && <p className="text-[10px] text-gray-500 mt-1">{'\u{1F4E6}'} Product: <strong>{c.productName}</strong></p>}
                  {c.message && <p className="text-[10px] text-gray-600 mt-1 bg-gray-50 rounded-lg p-2 italic">"{c.message}"</p>}
                  <p className="text-[9px] text-gray-400 mt-1">{new Date(c.timestamp).toLocaleString()}</p>
                  <div className="flex gap-2 mt-3">
                    <a href={'tel:' + c.userPhone} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center active:scale-95">{'\u{1F4DE}'} Call Now</a>
                    <button onClick={() => markDone(c.id)} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold active:scale-95">{'\u2713'} Mark Done</button>
                  </div>
                </div>
              ))}
              {handled.length > 0 && (<>
                <h4 className="text-xs font-bold text-gray-400 uppercase mt-4">Completed ({handled.length})</h4>
                {handled.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-2xl p-3 opacity-60">
                    <p className="text-xs font-bold text-gray-700">{c.userName} {'\u2014'} {c.userPhone}</p>
                    {c.productName && <p className="text-[9px] text-gray-500">{c.productName}</p>}
                    <p className="text-[8px] text-gray-400">{new Date(c.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </>)}
            </>);
          })()}

          {/* ════════ SETTINGS ════════ */}
          {tab === 'settings' && (<>
            <h3 className="text-sm font-extrabold">{'\u2699\uFE0F'} Settings</h3>

            {/* Change Password */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-700">{'\u{1F512}'} Change Password</h4>
              <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} placeholder="Current password"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-slate-400 focus:outline-none" />
              <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New password (min 8 characters)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-slate-400 focus:outline-none" />
              {newPin && newPin.length < 8 && <p className="text-[9px] text-red-500">Password must be at least 8 characters</p>}
              <button onClick={() => {
                if (oldPin === getStoredPin() && newPin.length >= 8) {
                  setStoredPin(newPin);
                  toast.success('Password changed!');
                  setOldPin(''); setNewPin('');
                } else { toast.error('Wrong current password or new one too short'); }
              }} className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs active:scale-95">Update Password</button>
            </div>

            {/* Email Whitelist */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-700">{'\u{1F4E7}'} Email Whitelist</h4>
              <p className="text-[9px] text-gray-400">Emails allowed to register or access admin features.</p>
              <div className="flex gap-1.5">
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddWhitelistEmail(); }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
                <button onClick={handleAddWhitelistEmail} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-95">Add</button>
              </div>
              {emailWhitelist.length === 0 && <p className="text-[9px] text-gray-400">No emails whitelisted</p>}
              {emailWhitelist.map(email => (
                <div key={email} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-700">{email}</span>
                  <button onClick={() => handleRemoveWhitelistEmail(email)} className="text-red-400 text-xs font-bold">{'\u2715'}</button>
                </div>
              ))}
            </div>

            {/* App Settings */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-700">{'\u{1F527}'} App Settings</h4>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs font-bold text-gray-700">Maintenance Mode</p>
                  <p className="text-[9px] text-gray-400">Show maintenance page to users</p>
                </div>
                <button onClick={toggleMaintenance}
                  className={'w-12 h-6 rounded-full transition-colors relative ' + (maintenanceMode ? 'bg-red-500' : 'bg-gray-300')}>
                  <div className={'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ' + (maintenanceMode ? 'translate-x-6' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-700">New Registrations</p>
                  <p className="text-[9px] text-gray-400">Allow new user signups</p>
                </div>
                <button onClick={toggleRegistrations}
                  className={'w-12 h-6 rounded-full transition-colors relative ' + (registrationsOpen ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <div className={'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ' + (registrationsOpen ? 'translate-x-6' : 'translate-x-0.5')} />
                </button>
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <h4 className="text-xs font-bold text-red-700">{'\u26A0\uFE0F'} Security Notice</h4>
              <p className="text-[10px] text-red-600 mt-1">Default password: <strong>VedaClue@2024#Admin</strong></p>
              <p className="text-[10px] text-red-600">Change it immediately after first login.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-700">How to Access Admin</h4>
              <p className="text-[10px] text-slate-600 mt-1">Go to Profile {'\u2192'} scroll to bottom {'\u2192'} tap "VedaClue v1.0.0" five times {'\u2192'} enter password.</p>
            </div>
          </>)}

        </>)}
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-5 text-center max-w-xs" onClick={e => e.stopPropagation()}>
            <span className="text-3xl">{'\u26A0\uFE0F'}</span>
            <h3 className="text-sm font-extrabold mt-2">Delete {confirmDel.type}?</h3>
            <p className="text-[10px] text-gray-500 mt-1">This action cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">Cancel</button>
              <button onClick={() => {
                if (confirmDel.type === 'product') handleDeleteProduct(confirmDel.id);
                if (confirmDel.type === 'article') handleDeleteArticle(confirmDel.id);
                if (confirmDel.type === 'doctor') handleDeleteDoctor(confirmDel.id);
                setConfirmDel(null);
              }} className="flex-1 py-2.5 bg-red-500 rounded-xl text-xs font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
