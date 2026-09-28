import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { HealthDataProvider } from './context/HealthDataContext';
import TopNav from './components/shared/TopNav';
import BottomNav from './components/shared/BottomNav';
import LoadingScreen from './components/shared/LoadingScreen';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import RecordsPage from './pages/RecordsPage';
import RecordDetailPage from './pages/RecordDetailPage';
import InsightsPage from './pages/InsightsPage';
import MedicinesPage from './pages/MedicinesPage';
import EmergencyPage from './pages/EmergencyPage';
import EmergencyPublicPage from './pages/EmergencyPublicPage';
import SummaryPage from './pages/SummaryPage';
import SettingsPage from './pages/SettingsPage';
import FamilyPage from './pages/FamilyPage';
import MedicalHistoryPage from './pages/MedicalHistoryPage';
import HealthMetricsPage from './pages/HealthMetricsPage';
import ChildHealthPage from './pages/ChildHealthPage';
import ConsultationsPage from './pages/ConsultationsPage';
import InsurancePage from './pages/InsurancePage';
import SpecialtyPage from './pages/SpecialtyPage';
import AuditLogPage from './pages/AuditLogPage';
import SystemicReviewPage from './pages/SystemicReviewPage';
import CaregiverViewPage from './pages/CaregiverViewPage';

function ProtectedLayout() {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return (
    <div className="app-container">
      <TopNav />
      <main className="pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isOnboarded, isLoading } = useApp();

  if (isLoading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        isAuthenticated
          ? <Navigate to={isOnboarded ? '/dashboard' : '/onboarding'} replace />
          : <AuthPage />
      } />
      <Route path="/onboarding" element={
        isAuthenticated ? <OnboardingPage /> : <Navigate to="/" replace />
      } />
      <Route path="/emergency/share/:token" element={<EmergencyPublicPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/medicines" element={<MedicinesPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/history" element={<MedicalHistoryPage />} />
        <Route path="/metrics" element={<HealthMetricsPage />} />
        <Route path="/child" element={<ChildHealthPage />} />
        <Route path="/visits" element={<ConsultationsPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/specialty" element={<SpecialtyPage />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/systemic" element={<SystemicReviewPage />} />
        <Route path="/caregiver" element={<CaregiverViewPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <HealthDataProvider>
          <AppRoutes />
        </HealthDataProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
