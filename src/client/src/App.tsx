import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { lazy, Suspense } from 'react';

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

// Loading spinner
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      <p className="text-rose-400 font-medium">Loading SheBloom...</p>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="max-w-[430px] mx-auto min-h-screen bg-white relative overflow-hidden shadow-2xl">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Routes */}
          <Route path="/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/tracker" element={<ProtectedRoute><TrackerPage /></ProtectedRoute>} />
          <Route path="/pregnancy" element={<ProtectedRoute><PregnancyPage /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute><DoctorsPage /></ProtectedRoute>} />
          <Route path="/hospitals" element={<ProtectedRoute><HospitalsPage /></ProtectedRoute>} />
          <Route path="/wellness" element={<ProtectedRoute><WellnessPage /></ProtectedRoute>} />
          <Route path="/articles" element={<ProtectedRoute><ArticlesPage /></ProtectedRoute>} />
          <Route path="/articles/:slug" element={<ProtectedRoute><ArticleDetailPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
          <Route path="/ayurveda" element={<ProtectedRoute><AyurvedaPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute><ProgramsPage /></ProtectedRoute>} />
          <Route path="/selfcare" element={<ProtectedRoute><SelfCarePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

          {/* Debug / 404 */}
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Suspense>
  );
}
