import React, { useState } from 'react';
import { AuthForm } from '../components/AuthForm/AuthForm';
import { TermsModal } from '../components/TermsModal/TermsModal';
import { api } from '../services/api';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onNavigateLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
}) => {
  const [showTerms, setShowTerms] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenTerms = (data: Record<string, string>) => {
    setPendingData(data);
    setShowTerms(true);
  };

  const handleConfirmRegister = async () => {
    if (!pendingData) return;
    try {
      setLoading(true);
      await api.register(pendingData.email, pendingData.phone || '', pendingData.password);
      setShowTerms(false);
      onRegisterSuccess();
    } catch (err) {
      alert((err as any).message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col md:flex-row bg-[#F4F7FC]">
      <div className="ambient-mesh" aria-hidden="true" />
      {/* Left side: Same Illustration Graphic */}
      <div className="hidden md:flex md:w-1/2 relative z-10 bg-transparent overflow-hidden items-center justify-center p-8 border-r border-white/60">
        <div
          className="w-full h-full max-h-[850px] rounded-3xl bg-cover bg-center shadow-lg border border-white/70"
          style={{ backgroundImage: `url('/TaskFlow5.png')` }}
        />
      </div>

      {/* Right side: Glassmorphism Register Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full flex justify-center">
          <AuthForm
            mode="register"
            onSwitchMode={(mode) => {
              if (mode === 'login') onNavigateLogin();
            }}
            onSubmit={(data) => handleOpenTerms(data)}
          />
        </div>
      </div>

      {/* Terms and Conditions Confirmation Modal */}
      <TermsModal
        isOpen={showTerms}
        loading={loading}
        onAccept={handleConfirmRegister}
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
};
