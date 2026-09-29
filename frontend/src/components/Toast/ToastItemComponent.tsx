import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastItem } from '../../context/ToastContext';

interface ToastItemComponentProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export const ToastItemComponent: React.FC<ToastItemComponentProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration || 4500);
  const timerRef = useRef<number | null>(null);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 280);
  };

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const totalDuration = toast.duration || 4500;
    const interval = 30; // update progress every 30ms

    timerRef.current = window.setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / totalDuration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleClose();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, toast.duration, toast.id]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div
      role="alert"
      className={`liquid-toast liquid-toast--${toast.type} ${isExiting ? 'liquid-toast--exit' : 'liquid-toast--enter'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="liquid-toast__glow" aria-hidden="true" />
      <div className="liquid-toast__content">
        <div className="liquid-toast__icon">{getIcon()}</div>
        <div className="liquid-toast__text">
          {toast.title && <h4 className="liquid-toast__title">{toast.title}</h4>}
          <p className="liquid-toast__message">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="liquid-toast__close"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="liquid-toast__progress-track">
        <div
          className={`liquid-toast__progress-bar liquid-toast__progress-bar--${toast.type}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
