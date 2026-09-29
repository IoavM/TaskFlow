import React from 'react';
import { useToast } from '../../context/ToastContext';
import { ToastItemComponent } from './ToastItemComponent';
import './Toast.css';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="liquid-toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((item) => (
        <ToastItemComponent key={item.id} toast={item} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
