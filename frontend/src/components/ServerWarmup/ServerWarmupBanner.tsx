import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Server, Wifi } from 'lucide-react';
import './ServerWarmup.css';

/**
 * Liquid Glass banner that appears when the API detects a cold-start.
 * Listens to `taskflow:server_waking` custom events dispatched by api.ts.
 */
export const ServerWarmupBanner: React.FC = () => {
  const [active, setActive] = useState(false);
  const [dots, setDots] = useState('');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handleWaking = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActive(detail?.active ?? false);
    };

    window.addEventListener('taskflow:server_waking', handleWaking);
    return () => {
      window.removeEventListener('taskflow:server_waking', handleWaking);
    };
  }, []);

  // Animated ellipsis
  useEffect(() => {
    if (active) {
      intervalRef.current = window.setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDots('');
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="server-warmup-banner" role="status" aria-live="polite">
      <div className="server-warmup-glow" aria-hidden="true" />
      <div className="server-warmup-content">
        <div className="server-warmup-icon">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        </div>
        <div className="server-warmup-text">
          <div className="server-warmup-title">
            <Server className="w-3.5 h-3.5 text-blue-400 inline mr-1" />
            Iniciando servidor{dots}
          </div>
          <p className="server-warmup-subtitle">
            El servidor se está despertando. Reintentando automáticamente — esto puede tomar hasta 30 segundos.
          </p>
        </div>
        <Wifi className="w-4 h-4 text-blue-400 animate-pulse server-warmup-wifi" />
      </div>
      <div className="server-warmup-progress">
        <div className="server-warmup-progress-bar" />
      </div>
    </div>
  );
};
