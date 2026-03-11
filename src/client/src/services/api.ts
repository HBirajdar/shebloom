import axios from 'axios';

// Production: VITE_API_URL points to the Railway backend.
// Local dev: falls back to localhost:8000.
const BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://blissful-communication-production-83ce.up.railway.app'
    : 'http://localhost:8000');

export const api = axios.create({
  baseURL: BASE + '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('sb_token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const req = err.config;
    if (err.response?.status === 401 && !req._retry) {
      req._retry = true;
      const rt = localStorage.getItem('sb_refresh');
      if (rt) {
        try {
          const refreshUrl = BASE + '/api/v1/auth/refresh';
          const resp = await axios.post(refreshUrl, { refreshToken: rt });
          localStorage.setItem('sb_token', resp.data.data.accessToken);
          localStorage.setItem('sb_refresh', resp.data.data.refreshToken);
          req.headers.Authorization = 'Bearer ' + resp.data.data.accessToken;
          return api(req);
        } catch {
          localStorage.clear();
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/otp/verify', { phone, otp }),
  googleAuth: (idToken: string) => api.post('/auth/google', { idToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
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
};

export const cycleAPI = {
  list: () => api.get('/cycles'),
  log: (d: any) => api.post('/cycles/log', d),
  predict: () => api.get('/cycles/predict'),
  logSymptoms: (d: any) => api.post('/cycles/symptoms', d),
};

export const moodAPI = {
  log: (d: any) => api.post('/mood', d),
  history: (days: number) => api.get('/mood/history?days=' + days),
};

export const doctorAPI = {
  search: (p: any) => api.get('/doctors', { params: p }),
  get: (id: string) => api.get('/doctors/' + id),
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

export const notificationAPI = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.put('/notifications/' + id + '/read'),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const coachAPI = {
  chat: (d: { message: string; context: { cycleDay: number; phase: string; goal: string; lastSymptoms?: string[] } }) =>
    api.post('/ai/chat', d),
};

export const cartAPI = {
  list: () => api.get('/cart'),
  add: (d: any) => api.post('/cart/add', d),
  remove: (id: string) => api.delete('/cart/' + id),
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

export const uploadAPI = {
  image: (fd: FormData) => api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  video: (fd: FormData) => api.post('/upload/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  multiple: (fd: FormData) => api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (publicId: string) => api.delete('/upload/' + encodeURIComponent(publicId)),
};

export const productAPI = {
  list: (params?: any) => api.get('/products', { params }),
  create: (d: any) => api.post('/products', d),
  update: (id: string, d: any) => api.put('/products/' + id, d),
  remove: (id: string) => api.delete('/products/' + id),
  togglePublish: (id: string) => api.post('/products/' + id + '/toggle-publish'),
};

export const adminAPI = {
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
};
