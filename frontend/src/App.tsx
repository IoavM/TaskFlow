import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SchedulePage } from './pages/SchedulePage';
import { CustomizationProvider } from './context/CustomizationContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import { ServerWarmupBanner } from './components/ServerWarmup/ServerWarmupBanner';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { api, preemptiveWarmup } from './services/api';

function AppContent() {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'schedule'>('login');
  const { toast } = useToast();

  useEffect(() => {
    // Fire a silent /health ping to wake Render before the user clicks anything
    preemptiveWarmup();

    const token = localStorage.getItem('taskflow_token');
    if (token) {
      setCurrentView('schedule');
    }

    const handleSessionExpired = () => {
      setCurrentView('login');
      toast.warning('Tu sesión ha expirado. Por favor inicia sesión de nuevo.', 'Sesión vencida');
    };

    window.addEventListener('taskflow:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('taskflow:session_expired', handleSessionExpired);
    };
  }, [toast]);

  const handleAuthSuccess = () => {
    setCurrentView('schedule');
    toast.success('¡Bienvenido a TaskFlow!');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentView('login');
    toast.info('Has cerrado sesión correctamente.');
  };

  const renderContent = () => {
    if (currentView === 'schedule') {
      return <SchedulePage onLogout={handleLogout} />;
    }

    if (currentView === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={handleAuthSuccess}
          onNavigateLogin={() => setCurrentView('login')}
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={handleAuthSuccess}
        onNavigateRegister={() => setCurrentView('register')}
      />
    );
  };

  return (
    <>
      <ServerWarmupBanner />
      {renderContent()}
      <ToastContainer />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <CustomizationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </CustomizationProvider>
    </ErrorBoundary>
  );
}

export default App;

