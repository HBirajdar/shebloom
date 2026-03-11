import { useAuthStore } from '../stores/authStore';

const BASE_URL = (() => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://blissful-communication-production-83ce.up.railway.app';
  }
  return 'http://localhost:8000';
})();

const getToken = () => {
  try {
    const state = useAuthStore.getState() as any;
    if (state?.token) return state.token;
  } catch {}
  return localStorage.getItem('sb_token') || localStorage.getItem('vedaclue-token') || '';
};

const getHeaders = (isFormData = false) => {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const apiService = {
  // AUTH
  login: (body: any) => fetch(`${BASE_URL}/api/v1/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  register: (body: any) => fetch(`${BASE_URL}/api/v1/auth/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),

  // DOCTORS
  getDoctors: () => fetch(`${BASE_URL}/api/v1/doctors`, { headers: getHeaders() }).then(handleResponse),
  getAllDoctors: () => fetch(`${BASE_URL}/api/v1/doctors/all`, { headers: getHeaders() }).then(handleResponse),
  getDoctor: (id: string) => fetch(`${BASE_URL}/api/v1/doctors/${id}`, { headers: getHeaders() }).then(handleResponse),
  createDoctor: (body: any) => fetch(`${BASE_URL}/api/v1/doctors`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  updateDoctor: (id: string, body: any) => fetch(`${BASE_URL}/api/v1/doctors/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  deleteDoctor: (id: string) => fetch(`${BASE_URL}/api/v1/doctors/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // PRODUCTS
  getProducts: () => fetch(`${BASE_URL}/api/v1/products`, { headers: getHeaders() }).then(handleResponse),
  getAllProducts: () => fetch(`${BASE_URL}/api/v1/products/all`, { headers: getHeaders() }).then(handleResponse),
  getProduct: (id: string) => fetch(`${BASE_URL}/api/v1/products/${id}`, { headers: getHeaders() }).then(handleResponse),
  createProduct: (body: any) => fetch(`${BASE_URL}/api/v1/products`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  updateProduct: (id: string, body: any) => fetch(`${BASE_URL}/api/v1/products/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  deleteProduct: (id: string) => fetch(`${BASE_URL}/api/v1/products/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // ARTICLES
  getArticles: (params?: any) => fetch(`${BASE_URL}/api/v1/articles${params ? '?' + new URLSearchParams(params) : ''}`, { headers: getHeaders() }).then(handleResponse),
  getAllArticles: () => fetch(`${BASE_URL}/api/v1/articles/all`, { headers: getHeaders() }).then(handleResponse),
  getArticle: (slug: string) => fetch(`${BASE_URL}/api/v1/articles/${slug}`, { headers: getHeaders() }).then(handleResponse),
  createArticle: (body: any) => fetch(`${BASE_URL}/api/v1/articles`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  updateArticle: (id: string, body: any) => fetch(`${BASE_URL}/api/v1/articles/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  deleteArticle: (id: string) => fetch(`${BASE_URL}/api/v1/articles/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // APPOINTMENTS
  getMyAppointments: () => fetch(`${BASE_URL}/api/v1/appointments`, { headers: getHeaders() }).then(handleResponse),
  createAppointment: (body: any) => fetch(`${BASE_URL}/api/v1/appointments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  cancelAppointment: (id: string, reason?: string) => fetch(`${BASE_URL}/api/v1/appointments/${id}/cancel`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ reason }) }).then(handleResponse),

  // ADMIN
  getAdminStats: () => fetch(`${BASE_URL}/api/v1/admin/stats`, { headers: getHeaders() }).then(handleResponse),
  getAdminUsers: (params?: any) => fetch(`${BASE_URL}/api/v1/admin/users${params ? '?' + new URLSearchParams(params) : ''}`, { headers: getHeaders() }).then(handleResponse),
  getAdminAppointments: (params?: any) => fetch(`${BASE_URL}/api/v1/admin/appointments${params ? '?' + new URLSearchParams(params) : ''}`, { headers: getHeaders() }).then(handleResponse),
  getDashboard: () => fetch(`${BASE_URL}/api/v1/admin/dashboard`, { headers: getHeaders() }).then(handleResponse),
  getAnalytics: () => fetch(`${BASE_URL}/api/v1/admin/analytics`, { headers: getHeaders() }).then(handleResponse),
  updateUser: (id: string, body: any) => fetch(`${BASE_URL}/api/v1/admin/users/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  deleteUser: (id: string) => fetch(`${BASE_URL}/api/v1/admin/users/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // ADMIN CMS (via admin routes)
  adminCreateProduct: (body: any) => fetch(`${BASE_URL}/api/v1/admin/products`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  adminToggleProductPublish: (id: string) => fetch(`${BASE_URL}/api/v1/admin/products/${id}/toggle-publish`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  adminDeleteProduct: (id: string) => fetch(`${BASE_URL}/api/v1/admin/products/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  adminCreateArticle: (body: any) => fetch(`${BASE_URL}/api/v1/admin/articles`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  adminToggleArticlePublish: (id: string) => fetch(`${BASE_URL}/api/v1/admin/articles/${id}/toggle-publish`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  adminDeleteArticle: (id: string) => fetch(`${BASE_URL}/api/v1/admin/articles/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  adminCreateDoctor: (body: any) => fetch(`${BASE_URL}/api/v1/admin/doctors`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  adminToggleDoctorPublish: (id: string) => fetch(`${BASE_URL}/api/v1/admin/doctors/${id}/toggle-publish`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  adminToggleDoctorPromote: (id: string) => fetch(`${BASE_URL}/api/v1/admin/doctors/${id}/toggle-promote`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  adminDeleteDoctor: (id: string) => fetch(`${BASE_URL}/api/v1/admin/doctors/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  adminUpdateAppointment: (id: string, body: any) => fetch(`${BASE_URL}/api/v1/admin/appointments/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),

  // UPLOAD
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE_URL}/api/v1/admin/upload`, { method: 'POST', headers: getHeaders(true), body: formData }).then(handleResponse);
  },

  // USER
  getProfile: () => fetch(`${BASE_URL}/api/v1/users/me`, { headers: getHeaders() }).then(handleResponse),
  updateProfile: (body: any) => fetch(`${BASE_URL}/api/v1/users/me`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  updateUserProfile: (body: any) => fetch(`${BASE_URL}/api/v1/users/me/profile`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),

  // CYCLES
  getCycles: () => fetch(`${BASE_URL}/api/v1/cycles`, { headers: getHeaders() }).then(handleResponse),
  logCycle: (body: any) => fetch(`${BASE_URL}/api/v1/cycles/log`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  predictCycle: () => fetch(`${BASE_URL}/api/v1/cycles/predict`, { headers: getHeaders() }).then(handleResponse),

  // MOOD
  logMood: (body: any) => fetch(`${BASE_URL}/api/v1/mood`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  getMoodHistory: (days: number) => fetch(`${BASE_URL}/api/v1/mood/history?days=${days}`, { headers: getHeaders() }).then(handleResponse),

  // NOTIFICATIONS
  getNotifications: () => fetch(`${BASE_URL}/api/v1/notifications`, { headers: getHeaders() }).then(handleResponse),
  markNotificationRead: (id: string) => fetch(`${BASE_URL}/api/v1/notifications/${id}/read`, { method: 'PUT', headers: getHeaders() }).then(handleResponse),
  markAllNotificationsRead: () => fetch(`${BASE_URL}/api/v1/notifications/read-all`, { method: 'PUT', headers: getHeaders() }).then(handleResponse),

  // WELLNESS
  getWellness: (params?: any) => fetch(`${BASE_URL}/api/v1/wellness${params ? '?' + new URLSearchParams(params) : ''}`, { headers: getHeaders() }).then(handleResponse),
  getDailyScore: () => fetch(`${BASE_URL}/api/v1/wellness/daily-score`, { headers: getHeaders() }).then(handleResponse),

  // AI COACH
  chatWithCoach: (body: any) => fetch(`${BASE_URL}/api/v1/ai/chat`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),

  // REPORTS
  getReportSummary: () => fetch(`${BASE_URL}/api/v1/reports/summary`, { headers: getHeaders() }).then(handleResponse),
};

export { apiService };
export default apiService;
