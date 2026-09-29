import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => string;
    error: (message: string, title?: string, duration?: number) => string;
    warning: (message: string, title?: string, duration?: number) => string;
    info: (message: string, title?: string, duration?: number) => string;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = {
      ...item,
      id,
      duration: item.duration ?? 4500,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const toastMethods = useMemo(
    () => ({
      success: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'success', message, title: title || '¡Éxito!', duration }),
      error: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'error', message, title: title || 'Error', duration: duration ?? 5500 }),
      warning: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'warning', message, title: title || 'Atención', duration }),
      info: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'info', message, title: title || 'Información', duration }),
    }),
    [showToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      toast: toastMethods,
    }),
    [toasts, showToast, dismissToast, toastMethods]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
