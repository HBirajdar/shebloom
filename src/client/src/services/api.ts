import axios from 'axios';

// Production: client + API are served by the SAME Express server on Railway,
// so use same-origin (empty BASE) — eliminates CORS entirely.
// Local dev: falls back to localhost:8000.
// Override: set VITE_API_URL env var for separate client/server deployments.
const BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '' // Same-origin: both served from one Railway instance
    : 'http://localhost:8000');

export const api = axios.create({
  baseURL: BASE + '/api/v1',
  timeout: 15000, // 15s — fail fast, retry handles recovery
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('sb_token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

// Global refresh lock — prevents multiple concurrent 401s from triggering parallel refreshes
let refreshPromise: Promise<string | null> | null = null;

let isRedirecting = false;

async function refreshToken(): Promise<string | null> {
  const rt = localStorage.getItem('sb_refresh');
  if (!rt) return null;
  try {
    const resp = await axios.post(BASE + '/api/v1/auth/refresh', { refreshToken: rt }, { timeout: 10000 });
    const newToken = resp.data.data.accessToken;
    localStorage.setItem('sb_token', newToken);
    localStorage.setItem('sb_refresh', resp.data.data.refreshToken);
    return newToken;
  } catch {
    // Clear all auth data on refresh failure
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_refresh');
    localStorage.removeItem('vedaclue-auth');
    localStorage.removeItem('vedaclue-subscription');
    localStorage.removeItem('vedaclue-cycle');
    // Redirect once (prevent multiple concurrent redirects)
    if (!isRedirecting) {
      isRedirecting = true;
      // Clear zustand auth state before redirect
      try { const { useAuthStore } = require('../stores/authStore'); useAuthStore.getState().clearAuth(); } catch {}
      setTimeout(() => { isRedirecting = false; window.location.href = '/auth'; }, 100);
    }
    return null;
  }
}

// Retry logic: retry network errors and 5xx up to 2 times with backoff
const RETRY_STATUSES = new Set([500, 502, 503, 504]);
const MAX_RETRIES = 2;

function shouldRetry(err: any): boolean {
  if (err.response?.status === 401) return false; // handled by refresh
  if (RETRY_STATUSES.has(err.response?.status)) return true;
  if (!err.response && err.code !== 'ERR_CANCELED') return true; // network error
  if (err.code === 'ECONNABORTED') return true; // timeout
  return false;
}

async function retryRequest(err: any): Promise<any> {
  const req = err.config;
  if (!req) return Promise.reject(err);
  req._retryCount = (req._retryCount || 0) + 1;
  if (req._retryCount > MAX_RETRIES) return Promise.reject(err);
  // Exponential backoff: 1s, 2s
  await new Promise(r => setTimeout(r, req._retryCount * 1000));
  return api(req);
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const req = err.config;

    // 401 → try token refresh (once)
    if (err.response?.status === 401 && req && !req._retry) {
      req._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        req.headers.Authorization = 'Bearer ' + newToken;
        return api(req);
      }
    }

    // Auto-retry on network/5xx errors
    if (shouldRetry(err) && (req?._retryCount || 0) < MAX_RETRIES) {
      return retryRequest(err);
    }

    // Attach readable error message for catch blocks
    const serverMsg = err.response?.data?.error || err.response?.data?.message;
    if (serverMsg) {
      err.message = serverMsg;
    } else if (err.code === 'ECONNABORTED') {
      err.message = 'Request timed out — please try again';
    } else if (err.response?.status === 429) {
      err.message = 'Too many requests — please wait a minute';
    } else if (err.response?.status === 403) {
      err.message = 'Access denied — admin login required';
    } else if (!err.response) {
      console.error('[API] No response:', err.code, err.message, req?.url);
      err.message = 'Network error — check your connection';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/otp/verify', { phone, otp }),
  google: (idToken: string) => api.post('/auth/google', { idToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  logout: () => api.post('/auth/logout'),
};

export const userAPI = {
  me: () => api.get('/users/me'),
  update: (d: any) => api.put('/users/me', d),
  updateProfile: (d: any) => api.put('/users/me/profile', d),
  exportData: () => api.get('/users/me/export'),
  deleteAccount: () => api.delete('/users/me'),
  sendMobileOtp: (phone: string) => api.post('/users/me/mobile/send-otp', { phone }),
  confirmMobile: (phone: string, otp: string) => api.post('/users/me/mobile/confirm', { phone, otp }),
  sendEmailOtp: (email: string) => api.post('/users/me/email/send-otp', { email }),
  confirmEmail: (email: string, otp: string) => api.post('/users/me/email/confirm', { email, otp }),
};

export const cycleAPI = {
  list: () => api.get('/cycles'),
  log: (d: any) => api.post('/cycles/log', d),
  predict: () => api.get('/cycles/predict'),
  logSymptoms: (d: any) => api.post('/cycles/symptoms', d),
  // Advanced fertility tracking
  logBBT: (d: { temperature: number; time?: string; method?: string; logDate: string; notes?: string }) => api.post('/cycles/bbt', d),
  getBBT: (days?: number) => api.get('/cycles/bbt', { params: { days } }),
  logCervicalMucus: (d: { type: string; amount?: string; logDate: string; notes?: string }) => api.post('/cycles/cervical-mucus', d),
  getCervicalMucus: (days?: number) => api.get('/cycles/cervical-mucus', { params: { days } }),
  logFertilityDaily: (d: any) => api.post('/cycles/fertility-daily', d),
  getFertilityDaily: (days?: number) => api.get('/cycles/fertility-daily', { params: { days } }),
  getFertilityInsights: () => api.get('/cycles/fertility-insights'),
  getAyurvedicInsights: () => api.get('/cycles/ayurvedic-insights'),
};

export const moodAPI = {
  log: (d: any) => api.post('/mood', d),
  history: (days: number) => api.get('/mood/history?days=' + days),
};

export const insightsAPI = {
  get: () => api.get('/insights'),
  patterns: () => api.get('/insights/patterns'),
  moodTrends: (days?: number) => api.get('/insights/mood-trends', { params: { days } }),
};

export const doctorAPI = {
  search: (p: any) => api.get('/doctors', { params: p }),
  get: (id: string) => api.get('/doctors/' + id),
  getSlots: (id: string) => api.get(`/doctors/${id}/slots`),
};

export const hospitalAPI = {
  search: (p: any) => api.get('/hospitals', { params: p }),
  get: (id: string) => api.get('/hospitals/' + id),
  prices: (svc: string, city: string) => api.get('/hospitals/compare/prices', { params: { service: svc, city } }),
};

export const articleAPI = {
  list: (p: any) => api.get('/articles', { params: p }),
  recommended: () => api.get('/articles/recommended'),
  get: (slug: string) => api.get('/articles/' + slug),
  bookmark: (id: string) => api.post('/articles/' + id + '/bookmark'),
  bookmarked: () => api.get('/articles/bookmarked'),
  like: (id: string, type: 'LIKE' | 'DISLIKE') => api.post('/articles/' + id + '/like', { type }),
  getComments: (id: string) => api.get('/articles/' + id + '/comments'),
  addComment: (id: string, content: string) => api.post('/articles/' + id + '/comments', { content }),
  deleteComment: (id: string, commentId: string) => api.delete('/articles/' + id + '/comments/' + commentId),
};

export const appointmentAPI = {
  create: (d: any) => api.post('/appointments', d),
  list: () => api.get('/appointments'),
  get: (id: string) => api.get('/appointments/' + id),
  cancel: (id: string, reason?: string) => api.patch('/appointments/' + id + '/cancel', { reason }),
};

export const wellnessAPI = {
  list: (p?: any) => api.get('/wellness', { params: p }),
  dailyScore: () => api.get('/wellness/daily-score'),
  log: (d: any) => api.post('/wellness/log', d),
  history: (days: number) => api.get(`/wellness/history?days=${days}`),
};

export const programAPI = {
  list: (p?: any) => api.get('/programs', { params: p }),
  get: (id: string) => api.get(`/programs/${id}`),
  myEnrolled: () => api.get('/programs/me/enrolled'),
  myEnrollment: (programId: string) => api.get(`/programs/me/enrolled/${programId}`),
  enroll: (id: string) => api.post(`/programs/${id}/enroll`),
  enrollPaid: (id: string, d: any) => api.post(`/programs/${id}/enroll-paid`, d),
  markProgress: (d: { programId: string; contentId: string }) => api.post('/programs/me/progress', d),
  leave: (id: string) => api.post(`/programs/${id}/leave`),
};

export const notificationAPI = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.put('/notifications/' + id + '/read'),
  markAllRead: () => api.put('/notifications/read-all'),
  getVapidKey: () => api.get('/notifications/vapid-key'),
  subscribe: (subscription: any) => api.post('/notifications/subscribe', { subscription }),
  unsubscribe: () => api.post('/notifications/unsubscribe'),
};

export const cartAPI = {
  list: () => api.get('/cart'),
  add: (d: any) => api.post('/cart/add', d),
  remove: (id: string) => api.delete('/cart/' + id),
  checkout: () => api.post('/cart/checkout'),
};

export const achievementsAPI = {
  list: () => api.get('/achievements'),
};

export const pregnancyAPI = {
  get: () => api.get('/pregnancy'),
  create: (d: { dueDate?: string; lastPeriodDate?: string }) => api.post('/pregnancy', d),
  remove: () => api.delete('/pregnancy'),
};

export const reportsAPI = {
  summary: () => api.get('/reports/summary'),
};

export const callbackAPI = {
  request: (d: any) => api.post('/callbacks', d),
  adminList: () => api.get('/admin/callbacks'),
  adminUpdate: (id: string, d: any) => api.patch(`/admin/callbacks/${id}`, d),
  adminDelete: (id: string) => api.delete(`/admin/callbacks/${id}`),
};

export const prescriptionAPI = {
  create: (d: any) => api.post('/prescriptions', d),
  myList: () => api.get('/prescriptions/my'),
  get: (id: string) => api.get('/prescriptions/' + id),
  byAppointment: (appointmentId: string) => api.get('/prescriptions/appointment/' + appointmentId),
};

export const uploadAPI = {
  image: (fd: FormData) => api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  video: (fd: FormData) => api.post('/upload/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  multiple: (fd: FormData) => api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (publicId: string) => api.delete('/upload/' + encodeURIComponent(publicId)),
};

export const productAPI = {
  // Public
  list: (params?: any) => api.get('/products', { params }),
  get: (id: string) => api.get('/products/' + id),
  searchSuggestions: (q: string) => api.get('/products/search/suggestions', { params: { q } }),
  byDosha: (dosha: string) => api.get('/products/by-dosha/' + dosha),
  related: (id: string) => api.get('/products/' + id + '/related'),
  getReviews: (id: string, params?: any) => api.get('/products/' + id + '/reviews', { params }),
  // Authenticated
  submitReview: (id: string, d: { rating: number; title?: string; comment?: string; images?: string[] }) => api.post('/products/' + id + '/reviews', d),
  updateReview: (id: string, d: any) => api.put('/products/' + id + '/reviews', d),
  markHelpful: (productId: string, reviewId: string) => api.post('/products/' + productId + '/reviews/helpful', { reviewId }),
  getWishlist: () => api.get('/products/wishlist/mine'),
  getWishlistIds: () => api.get('/products/wishlist/ids'),
  toggleWishlist: (productId: string) => api.post('/products/wishlist/toggle', { productId }),
  recommendations: () => api.get('/products/recommendations/for-me'),
  // Admin
  create: (d: any) => api.post('/products', d),
  update: (id: string, d: any) => api.put('/products/' + id, d),
  remove: (id: string) => api.delete('/products/' + id),
  togglePublish: (id: string) => api.post('/products/' + id + '/toggle-publish'),
  deleteReview: (reviewId: string) => api.delete('/products/reviews/' + reviewId),
  replyReview: (reviewId: string, reply: string) => api.put('/products/reviews/' + reviewId + '/reply', { reply }),
};

export const paymentAPI = {
  createOrder: (d: any) => api.post('/payments/create-order', d),
  verifyPayment: (d: any) => api.post('/payments/verify', d),
  codOrder: (d: any) => api.post('/payments/cod', d),
  myOrders: () => api.get('/payments/orders'),
  getOrder: (id: string) => api.get('/payments/orders/' + id),
  // Appointment payment
  createAppointmentOrder: (d: { doctorId: string; amount: number; couponCode?: string }) => api.post('/payments/appointment-order', d),
  verifyAppointmentPayment: (d: any) => api.post('/payments/verify-appointment', d),
};

export const doctorDashAPI = {
  getDashboard: () => api.get('/doctor/dashboard'),
  getAppointments: (params?: any) => api.get('/doctor/appointments', { params }),
  acceptAppointment: (id: string) => api.patch(`/doctor/appointments/${id}/accept`),
  rejectAppointment: (id: string, reason: string) => api.patch(`/doctor/appointments/${id}/reject`, { reason }),
  completeAppointment: (id: string) => api.patch(`/doctor/appointments/${id}/complete`),
  getProfile: () => api.get('/doctor/profile'),
  updateProfile: (d: any) => api.patch('/doctor/profile', d),
  getPrescriptions: () => api.get('/doctor/prescriptions'),
  getReviews: () => api.get('/doctor/reviews'),
  getArticles: () => api.get('/doctor/articles'),
  createArticle: (d: any) => api.post('/doctor/articles', d),
  updateArticle: (id: string, d: any) => api.put(`/doctor/articles/${id}`, d),
  deleteArticle: (id: string) => api.delete(`/doctor/articles/${id}`),
  // Availability & Slots
  toggleAvailability: (isAvailable: boolean) => api.patch('/doctor/availability', { isAvailable }),
  getSlots: () => api.get('/doctor/slots'),
  createSlot: (d: { dayOfWeek: number; startTime: string; endTime: string }) => api.post('/doctor/slots', d),
  updateSlot: (id: string, d: any) => api.put(`/doctor/slots/${id}`, d),
  deleteSlot: (id: string) => api.delete(`/doctor/slots/${id}`),
  // Patient Dosha
  getPatientDosha: (userId: string) => api.get(`/doctor/patients/${userId}/dosha`),
  submitClinicalDosha: (userId: string, d: any) => api.post(`/doctor/patients/${userId}/dosha/clinical`, d),
  getPatientDoshaStats: () => api.get('/doctor/patients-dosha-stats'),
  // Earnings
  getEarnings: () => api.get('/doctor/earnings'),
};

export const adminAPI = {
  verifyPin: (pin: string) => api.post('/admin/verify-pin', { pin }),
  dashboard: () => api.get('/admin/dashboard'),
  stats: () => api.get('/admin/stats'),
  analytics: () => api.get('/admin/analytics'),
  // Products
  getProducts: () => api.get('/admin/products'),
  createProduct: (d: any) => api.post('/admin/products', d),
  updateProduct: (id: string, d: any) => api.put(`/admin/products/${id}`, d),
  toggleProductPublish: (id: string) => api.post(`/admin/products/${id}/toggle-publish`),
  publishProduct: (id: string) => api.patch(`/admin/products/${id}/publish`),
  unpublishProduct: (id: string) => api.patch(`/admin/products/${id}/unpublish`),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  // Articles
  getArticles: () => api.get('/admin/articles'),
  createArticle: (d: any) => api.post('/admin/articles', d),
  updateArticle: (id: string, d: any) => api.put(`/admin/articles/${id}`, d),
  toggleArticlePublish: (id: string) => api.post(`/admin/articles/${id}/toggle-publish`),
  publishArticle: (id: string) => api.patch(`/admin/articles/${id}/publish`),
  unpublishArticle: (id: string) => api.patch(`/admin/articles/${id}/unpublish`),
  deleteArticle: (id: string) => api.delete(`/admin/articles/${id}`),
  // Doctors
  getDoctors: () => api.get('/admin/doctors'),
  createDoctor: (d: any) => api.post('/admin/doctors', d),
  updateDoctor: (id: string, d: any) => api.put(`/admin/doctors/${id}`, d),
  toggleDoctorPublish: (id: string) => api.post(`/admin/doctors/${id}/toggle-publish`),
  approveDoctor: (id: string) => api.patch(`/admin/doctors/${id}/approve`),
  rejectDoctor: (id: string) => api.patch(`/admin/doctors/${id}/reject`),
  deleteDoctor: (id: string) => api.delete(`/admin/doctors/${id}`),
  toggleDoctorPromote: (id: string) => api.post(`/admin/doctors/${id}/toggle-promote`),
  // Users
  users: (params?: { page?: number; limit?: number; search?: string; role?: string }) => api.get('/admin/users', { params }),
  updateUser: (id: string, d: { role?: string; isActive?: boolean }) => api.patch(`/admin/users/${id}`, d),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Appointments
  appointments: (params?: { status?: string; page?: number }) => api.get('/admin/appointments', { params }),
  updateAppointment: (id: string, d: { status: string }) => api.patch(`/admin/appointments/${id}`, d),
  // Upload
  upload: (formData: FormData) => api.post('/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Callbacks
  getCallbacks: () => api.get('/admin/callbacks'),
  updateCallback: (id: string, d: any) => api.patch(`/admin/callbacks/${id}`, d),
  deleteCallback: (id: string) => api.delete(`/admin/callbacks/${id}`),
  // Analytics
  productAnalytics: () => api.get('/admin/analytics/products'),
  doctorAnalytics: () => api.get('/admin/analytics/doctors'),
  // Prescriptions
  getPrescriptions: () => api.get('/admin/prescriptions'),
  // Orders
  adminOrders: (params?: any) => api.get('/admin/orders', { params }),
  adminUpdateOrderStatus: (id: string, status: string) => api.patch(`/admin/orders/${id}/status`, { status }),
  // Payouts
  payoutSummary: () => api.get('/admin/payouts/summary'),
  payoutList: (params?: { status?: string; doctorId?: string }) => api.get('/admin/payouts', { params }),
  generatePayout: (d: { doctorId: string; commissionRate?: number }) => api.post('/admin/payouts/generate', d),
  updatePayout: (id: string, d: any) => api.patch(`/admin/payouts/${id}`, d),
  deletePayout: (id: string) => api.delete(`/admin/payouts/${id}`),
  // Ayurveda / Dosha Management
  getDoshaProfiles: (params?: any) => api.get('/admin/dosha/profiles', { params }),
  getDoshaProfileDetail: (userId: string) => api.get(`/admin/dosha/profiles/${userId}`),
  verifyDosha: (userId: string, d: any) => api.patch(`/admin/dosha/profiles/${userId}/verify`, d),
  getDoshaAnalytics: () => api.get('/admin/dosha/analytics'),
  getDoshaQuestions: () => api.get('/admin/dosha/questions'),
  createDoshaQuestion: (d: any) => api.post('/admin/dosha/questions', d),
  updateDoshaQuestion: (id: string, d: any) => api.put(`/admin/dosha/questions/${id}`, d),
  deleteDoshaQuestion: (id: string) => api.delete(`/admin/dosha/questions/${id}`),
  // Wellness Activities (Yoga / Breathwork)
  getWellness: () => api.get('/admin/wellness'),
  createWellness: (d: any) => api.post('/admin/wellness', d),
  updateWellness: (id: string, d: any) => api.put(`/admin/wellness/${id}`, d),
  toggleWellnessPublish: (id: string) => api.post(`/admin/wellness/${id}/toggle-publish`),
  deleteWellness: (id: string) => api.delete(`/admin/wellness/${id}`),
  // Programs
  getPrograms: () => api.get('/admin/programs'),
  createProgram: (d: any) => api.post('/admin/programs', d),
  updateProgram: (id: string, d: any) => api.put(`/admin/programs/${id}`, d),
  toggleProgramPublish: (id: string) => api.post(`/admin/programs/${id}/toggle-publish`),
  deleteProgram: (id: string) => api.delete(`/admin/programs/${id}`),
  getProgramContents: (id: string) => api.get(`/admin/programs/${id}/contents`),
  addProgramContent: (id: string, d: any) => api.post(`/admin/programs/${id}/contents`, d),
  updateProgramContent: (contentId: string, d: any) => api.put(`/admin/programs/contents/${contentId}`, d),
  deleteProgramContent: (contentId: string) => api.delete(`/admin/programs/contents/${contentId}`),
  getProgramEnrollments: (id: string) => api.get(`/admin/programs/${id}/enrollments`),
  // Sellers
  getSellers: (params?: { status?: string; search?: string }) => api.get('/sellers/admin/list', { params }),
  getSellerDetail: (id: string) => api.get(`/sellers/admin/${id}`),
  updateSellerStatus: (id: string, d: { status: string; reason?: string }) => api.patch(`/sellers/admin/${id}/status`, d),
  updateSellerCommission: (id: string, d: { commissionRate?: number; tdsRate?: number }) => api.patch(`/sellers/admin/${id}/commission`, d),
  getSellerEarnings: (id: string) => api.get(`/sellers/admin/${id}/earnings`),
  generateSellerPayout: (id: string) => api.post(`/sellers/admin/${id}/generate-payout`),
  getAllSellerPayouts: (params?: { status?: string; sellerId?: string }) => api.get('/sellers/admin/payouts/all', { params }),
  updateSellerPayout: (payoutId: string, d: any) => api.patch(`/sellers/admin/payouts/${payoutId}`, d),
  getSellerAnalytics: () => api.get('/sellers/admin/analytics/overview'),
  exportSellerTransactionsCsv: (params?: any) => api.get('/sellers/admin/export/transactions', { params, responseType: 'blob' }),
  exportSellerPayoutsCsv: () => api.get('/sellers/admin/export/payouts', { responseType: 'blob' }),
  exportSellersCsv: () => api.get('/sellers/admin/export/sellers', { responseType: 'blob' }),
  // Seller onboarding (Year 1 — admin manually adds sellers)
  createSeller: (d: any) => api.post('/sellers/admin/create', d),
  updateSeller: (id: string, d: any) => api.put(`/sellers/admin/${id}`, d),
  updateSellerDocuments: (id: string, d: any) => api.patch(`/sellers/admin/${id}/documents`, d),
  getSellerChecklist: (id: string) => api.get(`/sellers/admin/${id}/checklist`),
};

// ─── Seller (self-service) ────────────────────────────
export const sellerAPI = {
  getProfile: () => api.get('/sellers/me'),
  updateProfile: (d: any) => api.put('/sellers/me', d),
  getProducts: () => api.get('/sellers/me/products'),
  getDashboard: () => api.get('/sellers/me/dashboard'),
  getTransactions: (params?: any) => api.get('/sellers/me/transactions', { params }),
  getPayouts: () => api.get('/sellers/me/payouts'),
  getTopProducts: () => api.get('/sellers/me/top-products'),
  getAreaSales: () => api.get('/sellers/me/area-sales'),
};

// ─── Finance (Coupons, Config, Analytics) ────────────
export const financeAPI = {
  // Coupon validation (user-facing)
  validateCoupon: (d: { code: string; applicableTo?: string; amount?: number; doctorId?: string; productIds?: string[] }) => api.post('/finance/coupon/validate', d),
  getPublicConfig: () => api.get('/finance/config/public'),
  // Admin: platform config
  getConfig: () => api.get('/finance/config'),
  updateConfig: (d: any) => api.put('/finance/config', d),
  // Admin: coupons
  getCoupons: (params?: { active?: string }) => api.get('/finance/coupons', { params }),
  createCoupon: (d: any) => api.post('/finance/coupons', d),
  updateCoupon: (id: string, d: any) => api.put(`/finance/coupons/${id}`, d),
  deleteCoupon: (id: string) => api.delete(`/finance/coupons/${id}`),
  // Admin: analytics
  getAnalytics: () => api.get('/finance/analytics'),
  // Admin: product payouts
  getProductPayouts: (params?: { status?: string }) => api.get('/finance/product-payouts', { params }),
  generateProductPayout: (d?: { commissionRate?: number }) => api.post('/finance/product-payouts/generate', d || {}),
  updateProductPayout: (id: string, d: any) => api.patch(`/finance/product-payouts/${id}`, d),
  // Admin: audit log
  getAuditLog: (params?: { eventType?: string; period?: string; page?: number; limit?: number }) => api.get('/finance/audit-log', { params }),
  getAuditSummary: () => api.get('/finance/audit-log/summary'),
  exportAuditCsv: (params?: { eventType?: string; period?: string }) => api.get('/finance/audit-log/export', { params, responseType: 'blob' }),
};

// ─── Dosha Assessment ────────────────────────────────
export const doshaAPI = {
  getQuestions: () => api.get('/dosha/questions'),
  submitAssessment: (answers: any[], assessmentType?: string) => api.post('/dosha/assess', { answers, assessmentType }),
  migrateLocal: (dosha: string) => api.post('/dosha/migrate', { dosha }),
  getProfile: () => api.get('/dosha/profile'),
  getHistory: () => api.get('/dosha/history'),
};

// ─── Weather / Location ──────────────────────────────
export const weatherAPI = {
  saveLocation: (latitude: number, longitude: number) => api.post('/weather/location', { latitude, longitude }),
  getCurrent: () => api.get('/weather/current'),
};

export const contentAPI = {
  getDoshaQuestions: () => api.get('/content/dosha-questions'),
  getRemedies: (condition: string, dosha?: string) => api.get('/content/remedies', { params: { condition, dosha } }),
  getPhaseGuidance: (dosha: string, phase: string) => api.get('/content/phase-guidance', { params: { dosha, phase } }),
  // Admin — List
  getAllPhaseGuidance: () => api.get('/content/admin/phase-guidance'),
  getAllChatResponses: () => api.get('/content/admin/chat-responses'),
  getAllRemedies: () => api.get('/content/admin/remedies'),
  getAllDoshaQuestions: () => api.get('/content/admin/dosha-questions'),
  // Admin — Create
  createPhaseGuidance: (data: any) => api.post('/content/admin/phase-guidance', data),
  createChatResponse: (data: any) => api.post('/content/admin/chat-responses', data),
  createRemedy: (data: any) => api.post('/content/admin/remedies', data),
  createDoshaQuestion: (data: any) => api.post('/content/admin/dosha-questions', data),
  // Admin — Update
  updatePhaseGuidance: (id: string, data: any) => api.put(`/content/admin/phase-guidance/${id}`, data),
  updateChatResponse: (id: string, data: any) => api.put(`/content/admin/chat-responses/${id}`, data),
  updateRemedy: (id: string, data: any) => api.put(`/content/admin/remedies/${id}`, data),
  updateDoshaQuestion: (id: string, data: any) => api.put(`/content/admin/dosha-questions/${id}`, data),
  // Admin — Delete
  deletePhaseGuidance: (id: string) => api.delete(`/content/admin/phase-guidance/${id}`),
  deleteChatResponse: (id: string) => api.delete(`/content/admin/chat-responses/${id}`),
  deleteRemedy: (id: string) => api.delete(`/content/admin/remedies/${id}`),
  deleteDoshaQuestion: (id: string) => api.delete(`/content/admin/dosha-questions/${id}`),
  // Admin — Toggle active
  togglePhaseGuidance: (id: string) => api.patch(`/content/admin/phase-guidance/${id}/toggle`),
  toggleChatResponse: (id: string) => api.patch(`/content/admin/chat-responses/${id}/toggle`),
  toggleRemedy: (id: string) => api.patch(`/content/admin/remedies/${id}/toggle`),
  toggleDoshaQuestion: (id: string) => api.patch(`/content/admin/dosha-questions/${id}/toggle`),
  // Admin — Cache
  refreshCache: () => api.post('/content/admin/cache/refresh'),
};

export const communityAPI = {
  // Posts
  listPosts: (params?: any) => api.get('/community/posts', { params }),
  getPost: (id: string) => api.get(`/community/posts/${id}`),
  createPost: (d: any) => api.post('/community/posts', d),
  editPost: (id: string, d: any) => api.patch(`/community/posts/${id}`, d),
  deleteOwnPost: (id: string) => api.delete(`/community/posts/${id}/own`),
  // Replies
  reply: (postId: string, d: any) => api.post(`/community/posts/${postId}/replies`, d),
  editReply: (id: string, d: any) => api.patch(`/community/replies/${id}`, d),
  deleteOwnReply: (id: string) => api.delete(`/community/replies/${id}/own`),
  // Likes
  likePost: (id: string) => api.post(`/community/posts/${id}/like`),
  likeReply: (id: string) => api.post(`/community/replies/${id}/like`),
  // Reports
  reportPost: (id: string, d: any) => api.post(`/community/posts/${id}/report`, d),
  reportReply: (id: string, d: any) => api.post(`/community/replies/${id}/report`, d),
  // Polls
  getActivePoll: () => api.get('/community/polls/active'),
  votePoll: (id: string, optionId: string) => api.post(`/community/polls/${id}/vote`, { optionId }),
  // Moderation (admin/doctor)
  hidePost: (id: string, d: any) => api.patch(`/community/posts/${id}/hide`, d),
  hideReply: (id: string, d: any) => api.patch(`/community/replies/${id}/hide`, d),
  deletePost: (id: string) => api.delete(`/community/posts/${id}`),
  deleteReply: (id: string) => api.delete(`/community/replies/${id}`),
  pinPost: (id: string) => api.patch(`/community/posts/${id}/pin`),
  createPoll: (d: any) => api.post('/community/polls', d),
  getReports: (params?: any) => api.get('/community/reports', { params }),
  updateReport: (id: string, d: any) => api.patch(`/community/reports/${id}`, d),
};

// ─── ANALYTICS API ──────────────────────────────────
export const analyticsAPI = {
  // User-facing: fire-and-forget event tracking
  track: (d: { event: string; category?: string; label?: string; value?: number; metadata?: any; sessionId?: string; referrer?: string }) =>
    api.post('/analytics/track', d).catch(() => {}), // Never fail user experience
  trackBatch: (events: any[]) =>
    api.post('/analytics/track/batch', { events }).catch(() => {}),
  // Admin
  adminUserDetail: (id: string) => api.get(`/analytics/admin/users/${id}`),
  adminLeads: (params?: { type?: string; page?: number; limit?: number }) => api.get('/analytics/admin/leads', { params }),
  adminFunnel: (days?: number) => api.get('/analytics/admin/funnel', { params: { days } }),
  adminMetrics: () => api.get('/analytics/admin/metrics'),
  adminEvents: (params?: { event?: string; userId?: string; category?: string; days?: number; page?: number }) => api.get('/analytics/admin/events', { params }),
  adminEventsSummary: (days?: number) => api.get('/analytics/admin/events/summary', { params: { days } }),
  // New Tier-1 features
  adminLiveFeed: (after?: string) => api.get('/analytics/admin/live-feed', { params: { limit: 40, after } }),
  adminChurnRisk: (params?: { page?: number; limit?: number; risk?: string }) => api.get('/analytics/admin/churn-risk', { params }),
  adminSegments: (params?: Record<string, any>) => api.get('/analytics/admin/segments', { params }),
  adminAlerts: () => api.get('/analytics/admin/alerts'),
  adminExport: (type: string, days?: number) => api.get(`/analytics/admin/export/${type}`, { params: { days }, responseType: 'blob' }),
  adminForecast: () => api.get('/analytics/admin/forecast'),
  adminCohorts: (months?: number) => api.get('/analytics/admin/cohorts', { params: { months } }),
  // Tier 2 features
  adminJourneys: (days?: number) => api.get('/analytics/admin/journeys', { params: { days } }),
  adminGeo: () => api.get('/analytics/admin/geo'),
  adminReferrals: (days?: number) => api.get('/analytics/admin/referrals', { params: { days } }),
  adminStreaks: (params?: { minStreak?: number; page?: number }) => api.get('/analytics/admin/streaks', { params }),
  submitNps: (d: { score: number; feedback?: string; page?: string }) => api.post('/analytics/nps', d),
  adminNps: (days?: number) => api.get('/analytics/admin/nps', { params: { days } }),
  adminCampaigns: () => api.get('/analytics/admin/campaigns'),
  adminCreateCampaign: (d: { title: string; body: string; segment: string }) => api.post('/analytics/admin/campaigns', d),
  adminSendCampaign: (id: string) => api.post(`/analytics/admin/campaigns/${id}/send`),
  adminDeleteCampaign: (id: string) => api.delete(`/analytics/admin/campaigns/${id}`),
  adminLtv: () => api.get('/analytics/admin/ltv'),
  adminAbTests: (days?: number) => api.get('/analytics/admin/ab-tests', { params: { days } }),
  // Tier 3
  adminAnomalies: () => api.get('/analytics/admin/anomalies'),
  adminHealthScore: () => api.get('/analytics/admin/health-score'),
  adminSessions: (userId: string) => api.get(`/analytics/admin/sessions/${userId}`),
  adminPredictiveChurn: () => api.get('/analytics/admin/predictive-churn'),
  adminContentPerformance: (days?: number) => api.get('/analytics/admin/content-performance', { params: days ? { days } : undefined }),
};

// ─── SUBSCRIPTION API ──────────────────────────────
export const subscriptionAPI = {
  // User
  getPlans: (goal?: string) => api.get('/subscriptions/plans', { params: { goal } }),
  getMySubscription: () => api.get('/subscriptions/my'),
  create: (d: { planId: string; couponCode?: string; goal?: string }) => api.post('/subscriptions/create', d),
  verify: (d: any) => api.post('/subscriptions/verify', d),
  cancel: (reason?: string) => api.post('/subscriptions/cancel', { reason }),
  getInvoices: () => api.get('/subscriptions/invoices'),
  // Admin: Plans
  adminGetPlans: () => api.get('/subscriptions/admin/plans'),
  adminCreatePlan: (d: any) => api.post('/subscriptions/admin/plans', d),
  adminUpdatePlan: (id: string, d: any) => api.put(`/subscriptions/admin/plans/${id}`, d),
  adminDeletePlan: (id: string) => api.delete(`/subscriptions/admin/plans/${id}`),
  adminToggleFree: (id: string) => api.post(`/subscriptions/admin/plans/${id}/toggle-free`),
  adminSyncRazorpay: (id: string) => api.post(`/subscriptions/admin/plans/${id}/sync-razorpay`),
  // Admin: Promotions
  adminGetPromotions: () => api.get('/subscriptions/admin/promotions'),
  adminCreatePromotion: (d: any) => api.post('/subscriptions/admin/promotions', d),
  adminUpdatePromotion: (id: string, d: any) => api.put(`/subscriptions/admin/promotions/${id}`, d),
  adminDeletePromotion: (id: string) => api.delete(`/subscriptions/admin/promotions/${id}`),
  // Admin: Subscribers
  adminGetSubscribers: (params?: any) => api.get('/subscriptions/admin/subscribers', { params }),
  adminExtend: (id: string, d: { days: number }) => api.post(`/subscriptions/admin/subscribers/${id}/extend`, d),
  adminCancel: (id: string, d: { reason: string }) => api.post(`/subscriptions/admin/subscribers/${id}/cancel`, d),
  // Admin: Analytics & Events
  adminGetAnalytics: () => api.get('/subscriptions/admin/analytics'),
  adminGetEvents: (params?: any) => api.get('/subscriptions/admin/events', { params }),
  adminExpireCheck: () => api.post('/subscriptions/admin/expire-check'),
};

// ─── REFERRAL & GAMIFICATION API ─────────────────
export const referralAPI = {
  // User: Referrals
  getMyCode: () => api.get('/referrals/my-code'),
  getMyReferrals: () => api.get('/referrals/my-referrals'),
  sendInvite: (d: { email?: string; phone?: string }) => api.post('/referrals/invite', d),
  applyCode: (code: string) => api.post('/referrals/apply', { code }),
  // User: Badges
  getMyBadges: () => api.get('/referrals/badges/my'),
  getAllBadges: () => api.get('/referrals/badges/all'),
  checkBadges: () => api.post('/referrals/badges/check'),
  // Admin
  adminReferralsList: (params?: any) => api.get('/referrals/admin/all', { params }),
  adminReferralStats: () => api.get('/referrals/admin/stats'),
  adminBadgeLeaderboard: () => api.get('/referrals/admin/badges'),
};

// ─── EMAIL CAMPAIGN API ──────────────────────────
// ─── WELLNESS CONTENT API ──────────────────────
export const wellnessContentAPI = {
  // Public: fetch content by type + filters
  getByType: (type: string, filters?: { phase?: string; goal?: string; dosha?: string; week?: number; category?: string }) =>
    api.get('/wellness-content', { params: { type, ...filters } }),
  // Public: fetch multiple types in one call
  getBulk: (types: string[], filters?: { phase?: string; goal?: string; dosha?: string; week?: number }) =>
    api.get('/wellness-content/bulk', { params: { types: types.join(','), ...filters } }),
  // Admin: list all (paginated, filterable)
  adminList: (params?: { type?: string; phase?: string; goal?: string; dosha?: string; week?: number; isActive?: string; page?: number; limit?: number }) =>
    api.get('/wellness-content/admin', { params }),
  // Admin: create
  adminCreate: (d: any) => api.post('/wellness-content/admin', d),
  // Admin: update
  adminUpdate: (id: string, d: any) => api.put(`/wellness-content/admin/${id}`, d),
  // Admin: delete
  adminDelete: (id: string) => api.delete(`/wellness-content/admin/${id}`),
  // Admin: toggle active
  adminToggle: (id: string) => api.patch(`/wellness-content/admin/${id}/toggle`),
};

export const emailCampaignAPI = {
  list: () => api.get('/email-campaigns'),
  create: (d: any) => api.post('/email-campaigns', d),
  update: (id: string, d: any) => api.put(`/email-campaigns/${id}`, d),
  delete: (id: string) => api.delete(`/email-campaigns/${id}`),
  toggle: (id: string) => api.post(`/email-campaigns/${id}/toggle`),
  sendTest: (id: string) => api.post(`/email-campaigns/${id}/send-test`),
  send: (id: string) => api.post(`/email-campaigns/${id}/send`),
  stats: () => api.get('/email-campaigns/stats'),
  trigger: (trigger: string) => api.post(`/email-campaigns/trigger/${trigger}`),
};
