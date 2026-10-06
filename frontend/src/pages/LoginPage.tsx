import React from 'react';
import { AuthForm } from '../components/AuthForm/AuthForm';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateRegister,
}) => {
  const handleLogin = async (formData: Record<string, string>) => {
    await api.login(formData.email, formData.password);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col md:flex-row bg-[#F4F7FC]">
      <div className="ambient-mesh" aria-hidden="true" />
      {/* Left side: Illustration Graphic */}
      <div className="hidden md:flex md:w-1/2 relative z-10 bg-transparent overflow-hidden items-center justify-center p-8 border-r border-white/60">
        <div
          className="w-full h-full max-h-[850px] rounded-3xl bg-cover bg-center shadow-lg border border-white/70"
          style={{ backgroundImage: `url('/TaskFlow5.png')` }}
        />
      </div>

      {/* Right side: Glassmorphism Login Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full flex justify-center">
          <AuthForm
            mode="login"
            onSwitchMode={(mode) => {
              if (mode === 'register') onNavigateRegister();
            }}
            onSubmit={handleLogin}
            onGoogleSuccess={onLoginSuccess}
          />
        </div>
      </div>
    </div>
  );
};
