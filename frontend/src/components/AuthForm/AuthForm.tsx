import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import authConfig from './AuthForm.json';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import './AuthForm.css';

declare global {
  interface Window {
    google?: any;
  }
}

interface AuthFormProps {
  mode: 'login' | 'register';
  onSwitchMode: (mode: 'login' | 'register') => void;
  onSubmit: (formData: Record<string, string>) => Promise<void> | void;
  onGoogleSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  onSwitchMode,
  onSubmit,
  onGoogleSuccess,
}) => {
  const config = authConfig[mode];
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize and Render Official Google Sign-In Button
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    const handleGoogleResponse = async (response: any) => {
      if (!response?.credential) return;
      try {
        setLoading(true);
        setErrorMessage(null);
        await api.loginWithGoogle(response.credential);
        toast.success(mode === 'register' ? '¡Cuenta creada con Google!' : '¡Bienvenido a TaskFlow!');
        if (onGoogleSuccess) {
          onGoogleSuccess();
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al autenticar con Google');
        toast.error(err.message || 'Error al autenticar con Google');
      } finally {
        setLoading(false);
      }
    };

    const renderGoogleBtn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'login' ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
          locale: 'es',
        });
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderGoogleBtn();
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [mode, onGoogleSuccess, toast]);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMessage('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await onSubmit(formData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052FF] to-[#3B82F6] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] font-sans">TaskFlow</h1>
          <p className="text-xs text-[#64748B] font-medium">{config.subtitle}</p>
        </div>
      </div>

      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[#0F172A]">{config.title}</h2>
      </div>

      {/* Google Sign In Container */}
      <div className="space-y-3 mb-4">
        <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />

        <div className="relative flex items-center justify-center my-3">
          <div className="border-t border-slate-200/90 w-full" />
          <span className="bg-white px-2.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 absolute">
            o con tu correo
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded-lg bg-red-50/80 border border-red-200/60 flex items-center gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
              {field.label} {field.required && <span className="text-[#0052FF]">*</span>}
            </label>
            <div className="auth-input-wrapper">
              <input
                type={field.type === 'password' && showPassword ? 'text' : field.type}
                value={formData[field.id] || ''}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="auth-input text-sm text-[#0F172A]"
              />
              {field.type === 'password' && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-btn-eye"
                  aria-label="Alternar visibilidad de contraseña"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {mode === 'login' && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => toast.info('Para restablecer tu contraseña, contacta al soporte de TaskFlow o inicia sesión con Google.', 'Restablecer contraseña')}
              className="text-xs text-[#0052FF] font-medium hover:underline hover:opacity-90"
            >
              {(config as any).forgotPassword}
            </button>
          </div>
        )}

        <button type="submit" disabled={loading} className="auth-submit-btn mt-6">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{config.submitButton}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
        <p className="text-xs text-[#64748B]">
          {config.switchPrompt}{' '}
          <button
            type="button"
            onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
            className="text-[#0052FF] font-semibold hover:underline cursor-pointer"
          >
            {config.switchLink}
          </button>
        </p>
      </div>
    </div>
  );
};
