import React, { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { SpotifyPlayer } from '../SpotifyPlayer/SpotifyPlayer';
import { useToast } from '../../context/ToastContext';
import sidebarConfig from './SidebarOptions.json';
import './SidebarOptions.css';

interface SidebarOptionsProps {
  onDirectAICreate: (prompt: string) => Promise<void>;
  onOpenManualModal: () => void;
}

export const SidebarOptions: React.FC<SidebarOptionsProps> = ({
  onDirectAICreate,
  onOpenManualModal,
}) => {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || loadingAI) return;
    try {
      setLoadingAI(true);
      await onDirectAICreate(promptText);
      setPromptText('');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la tarea con Groq.');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="sidebar-card space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{sidebarConfig.title}</span>
        </div>
        <p className="text-[11px] text-[#64748B]">{sidebarConfig.subtitle}</p>
      </div>

      {/* Autonomous AI Task Creator */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white border border-blue-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0052FF] text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">{sidebarConfig.aiSection.title}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
          Escribe tu instrucción en lenguaje natural y la IA creará la tarea con sus bloques en tu cronograma:
        </p>

        <form onSubmit={handleAISubmit} className="space-y-2">
          <textarea
            rows={2}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Ej: Tengo examen de cálculo el jueves y quiero estudiar lunes y miércoles de 2 a 4 pm..."
            className="w-full text-xs p-2.5 rounded-lg border border-blue-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAISubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={loadingAI || !promptText.trim()}
            className="w-full py-2 px-3 rounded-lg bg-[#0052FF] text-white text-xs font-semibold hover:bg-[#0038B6] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            {loadingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Planificando tarea...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Crear Tarea con IA</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Spotify Integration */}
      <SpotifyPlayer />
    </div>
  );
};
