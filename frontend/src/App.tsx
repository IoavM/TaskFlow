import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SchedulePage } from './pages/SchedulePage';
import { CustomizationProvider } from './context/CustomizationContext';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'schedule'>('login');

  useEffect(() => {
    const token = localStorage.getItem('taskflow_token');
    if (token) {
      setCurrentView('schedule');
    }
  }, []);

  const handleAuthSuccess = () => {
    setCurrentView('schedule');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentView('login');
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
    <CustomizationProvider>
      {renderContent()}
    </CustomizationProvider>
  );
}

export default App;
