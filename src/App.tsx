import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Loading } from './components/Loading';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CoachPage } from './pages/CoachPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ReadingPage } from './pages/ReadingPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChallengePage } from './pages/ChallengePage';
import { OnboardingPage, onboardingStorageKey } from './pages/OnboardingPage';

function AppRoutes() {
  const { user, loading } = useAuth();
  useLocation(); // Re-evaluate the local onboarding gate after navigation.
  if (window.location.pathname === '/reset-password') return <ResetPasswordPage />;
  if (loading) return <div className="app-loading"><Loading label="Préparation de votre espace…" /></div>;
  if (!user) return <AuthPage />;
  const onboardingDone = Boolean(localStorage.getItem(onboardingStorageKey(user.id)));
  return <Routes>
    <Route path="/onboarding" element={onboardingDone ? <Navigate to="/" replace /> : <OnboardingPage />} />
    <Route element={<AppShell />}>
      <Route index element={onboardingDone ? <DashboardPage /> : <Navigate to="/onboarding" replace />} />
      <Route path="coach" element={<CoachPage />} />
      <Route path="exercises" element={<ExercisesPage />} />
      <Route path="reading" element={<ReadingPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="challenge" element={<ChallengePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
