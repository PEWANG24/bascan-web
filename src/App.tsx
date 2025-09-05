import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import BADashboard from './pages/BADashboard';
import TeamLeaderDashboard from './pages/TeamLeaderDashboard';
import LoadingSpinner from './components/LoadingSpinner';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={['BA', 'TEAM_LEADER', 'MANAGER']}>
            {user.role === 'BA' ? <BADashboard /> : <TeamLeaderDashboard />}
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ba" 
        element={
          <ProtectedRoute allowedRoles={['BA']}>
            <BADashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/team-leader" 
        element={
          <ProtectedRoute allowedRoles={['TEAM_LEADER']}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
