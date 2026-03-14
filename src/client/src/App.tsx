import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { lazy, Suspense, useEffect, useState } from 'react';
import CookieConsent from './components/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
const NpsPopup = lazy(() => import('./components/NpsPopup'));
import { trackEvent } from './hooks/useTrackEvent';

// Lazy loaded pages
const AuthPage = lazy(() => import('./pages/Signin'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TrackerPage = lazy(() => import('./pages/TrackerPage'));
const PregnancyPage = lazy(() => import('./pages/PregnancyPage'));
const DoctorsPage = lazy(() => import('./pages/DoctorsPage'));
const HospitalsPage = lazy(() => import('./pages/HospitalsPage'));
const WellnessPage = lazy(() => import('./pages/WellnessPage'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const AyurvedaPage = lazy(() => import('./pages/AyurvedaPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const SelfCarePage = lazy(() => import('./pages/SelfCarePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DebugPage = lazy(() => import('./pages/DebugPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const WellnessHistoryPage = lazy(() => import('./pages/WellnessHistoryPage'));
const CycleHistoryPage = lazy(() => import('./pages/CycleHistoryPage'));
const MoodHistoryPage = lazy(() => import('./pages/MoodHistoryPage'));
const AppointmentHistoryPage = lazy(() => import('./pages/AppointmentHistoryPage'));
const ShopHistoryPage = lazy(() => import('./pages/ShopHistoryPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const DoshaAssessmentPage = lazy(() => import('./pages/DoshaAssessmentPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ShippingPolicyPage = lazy(() => import('./pages/ShippingPolicyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const BlogLandingPage = lazy(() => import('./pages/BlogLandingPage'));
const PcosPage = lazy(() => import('./pages/PcosPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Global page view tracker
function PageTracker() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      // Capture UTM params from URL
      const params = new URLSearchParams(location.search);
      const utm: Record<string, string> = {};
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const val = params.get(key);
        if (val) utm[key] = val;
      }
      trackEvent('page_view', {
        category: 'page',
        label: location.pathname,
        metadata: Object.keys(utm).length > 0 ? utm : undefined,
      });
    }
  }, [location.pathname, isAuthenticated]);
  return null;
}

// Loading spinner
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      <p className="text-rose-400 font-medium">Loading VedaClue...</p>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Doctor Route wrapper (DOCTOR or ADMIN only)
function DoctorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.role !== 'DOCTOR' && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Admin Route wrapper (ADMIN only)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PageTracker />
      <ErrorBoundary>
      <div className="max-w-[430px] mx-auto min-h-screen bg-white relative overflow-hidden shadow-2xl">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route path="/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/tracker" element={<ProtectedRoute><TrackerPage /></ProtectedRoute>} />
          <Route path="/pregnancy" element={<ProtectedRoute><PregnancyPage /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute><DoctorsPage /></ProtectedRoute>} />
          <Route path="/hospitals" element={<ProtectedRoute><HospitalsPage /></ProtectedRoute>} />
          <Route path="/wellness" element={<ProtectedRoute><WellnessPage /></ProtectedRoute>} />
          <Route path="/wellness/history" element={<ProtectedRoute><WellnessHistoryPage /></ProtectedRoute>} />
          <Route path="/articles" element={<ProtectedRoute><ArticlesPage /></ProtectedRoute>} />
          <Route path="/articles/:slug" element={<ProtectedRoute><ArticleDetailPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
          <Route path="/appointments/history" element={<ProtectedRoute><AppointmentHistoryPage /></ProtectedRoute>} />
          <Route path="/ayurveda" element={<ProtectedRoute><AyurvedaPage /></ProtectedRoute>} />
          <Route path="/dosha-assessment" element={<ProtectedRoute><DoshaAssessmentPage /></ProtectedRoute>} />
          <Route path="/shop/history" element={<ProtectedRoute><ShopHistoryPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute><ProgramsPage /></ProtectedRoute>} />
          <Route path="/selfcare" element={<ProtectedRoute><SelfCarePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/cycle/history" element={<ProtectedRoute><CycleHistoryPage /></ProtectedRoute>} />
          <Route path="/mood/history" element={<ProtectedRoute><MoodHistoryPage /></ProtectedRoute>} />

          {/* Public Legal Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-conditions" element={<TermsPage />} />
          <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/blog" element={<BlogLandingPage />} />
          <Route path="/pcos" element={<PcosPage />} />

          {/* Debug / 404 */}
          <Route path="/debug" element={<AdminRoute><DebugPage /></AdminRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <CookieConsent />
        <NpsPopup />
      </div>
      </ErrorBoundary>
    </Suspense>
  );
}
