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

export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  createProduct: (d: any) => api.post('/admin/products', d),
  toggleProductPublish: (id: string) => api.post(`/admin/products/${id}/toggle-publish`),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  createArticle: (d: any) => api.post('/admin/articles', d),
  toggleArticlePublish: (id: string) => api.post(`/admin/articles/${id}/toggle-publish`),
  deleteArticle: (id: string) => api.delete(`/admin/articles/${id}`),
  createDoctor: (d: any) => api.post('/admin/doctors', d),
  toggleDoctorPublish: (id: string) => api.post(`/admin/doctors/${id}/toggle-publish`),
  deleteDoctor: (id: string) => api.delete(`/admin/doctors/${id}`),
  toggleDoctorPromote: (id: string) => api.post(`/admin/doctors/${id}/toggle-promote`),
  users: (params?: { page?: number; limit?: number; search?: string; role?: string }) => api.get('/admin/users', { params }),
  updateUser: (id: string, d: { role?: string; isActive?: boolean }) => api.patch(`/admin/users/${id}`, d),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  analytics: () => api.get('/admin/analytics'),
  appointments: (params?: { status?: string; page?: number }) => api.get('/admin/appointments', { params }),
  updateAppointment: (id: string, d: { status: string }) => api.patch(`/admin/appointments/${id}`, d),
  upload: (formData: FormData) => api.post('/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
