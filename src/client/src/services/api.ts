import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
          const resp = await axios.post(BASE + '/api/v1/auth/refresh', { refreshToken: rt });
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
};

export const appointmentAPI = {
  create: (d: any) => api.post('/appointments', d),
  list: () => api.get('/appointments'),
  cancel: (id: string, reason?: string) => api.patch('/appointments/' + id + '/cancel', { reason }),
};

export const wellnessAPI = {
  list: (p?: any) => api.get('/wellness', { params: p }),
};
