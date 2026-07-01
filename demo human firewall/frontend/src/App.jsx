import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PhishingPage from './pages/PhishingPage';
import EmailViewerPage from './pages/EmailViewerPage';
import TrainingPage from './pages/TrainingPage';
import LessonPage from './pages/LessonPage';
import ScenariosPage from './pages/ScenariosPage';
import AdminPage from './pages/AdminPage';

// Spin keyframe for loading spinners
const spinStyle = document.createElement('style');
spinStyle.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
document.head.appendChild(spinStyle);

function ProtectedRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020b18', color: '#00d4ff', gap: '12px' }}>
      <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020b18', color: '#00d4ff', gap: '12px' }}>
      <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading Human Firewall...
    </div>
  );

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/phishing" element={<PhishingPage />} />
        <Route path="/phishing/:id" element={<EmailViewerPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/training/:id" element={<LessonPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
